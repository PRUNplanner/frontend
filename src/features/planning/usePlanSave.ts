import {
	computed,
	type ComputedRef,
	nextTick,
	onMounted,
	onUnmounted,
	ref,
	type Ref,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";

// Router
import router from "@/router";

// Stores
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";
import { usePlanDraft } from "@/features/planning/usePlanDraft";
import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";
import {
	flushPlanEdits,
	trackEvent,
	reportError,
} from "@/lib/analytics/useAnalytics";
import { useQuery } from "@/lib/query_cache/useQuery";
import { remoteChange } from "@/lib/crossTab";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";

// Util
import { inertClone } from "@/util/data";
import {
	getSaveError,
	threeWay,
} from "@/features/save_conflict/saveConflict.util";
import { diffPlan } from "@/features/planning_data/planDiff";
import {
	formatWhen,
	versionState,
} from "@/features/planning/planVersions.util";

// Types & Interfaces
import type {
	Plan,
	PlanCreateData,
	PlanDraft,
} from "@/features/api/schemas/planningData.schemas";
import type { usePlanVersionPreview } from "@/features/planning/usePlanVersionPreview";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";

// UI
import { useConfirm, useToast } from "@/ui";
import type { PSelectOption, PToastHandle } from "@/ui/ui.types";

/**
 * Plan saving and reloading: save, save as, save conflicts, another tab's
 * change and the leave guard
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation The plan's calculation
 * @param {Ref<IPlanDefinition>} refPlanData Edited plan
 * @param {{ uuid: Ref<string | undefined>; list: Ref<PlanEmpireElement[] | undefined> }} empire Active empire and the empire list
 * @param {Ref<boolean>} refAutoOptimizeHabs Stored with a created plan
 * @param {IPlanViewProps} props The view's props
 * @param preview The version preview, read-only and restore state
 */
export function usePlanSave(
	calculation: IPlanCalculation,
	refPlanData: Ref<IPlanDefinition>,
	empire: {
		uuid: Ref<string | undefined>;
		list: Ref<PlanEmpireElement[] | undefined>;
	},
	refAutoOptimizeHabs: Ref<boolean>,
	props: IPlanViewProps,
	preview: ReturnType<typeof usePlanVersionPreview>
) {
	const { t } = useI18n();
	const toast = useToast();
	const confirm = useConfirm();
	const userStore = useUserStore();
	const planningStore = usePlanningStore();
	const { createNewPlan, saveExistingPlan } = usePlan();
	const {
		existing,
		saveable,
		modified,
		backendData,
		planName,
		planEmpires,
		markSaved,
		snapshot,
		savedSnapshot,
		applyState,
	} = calculation;
	const planetNaturalId: string = props.planData.planet_natural_id;

	// save version the edits started from, sent so a save over another
	// tab's newer one fails as a conflict
	const refBaseModifiedAt: Ref<string | undefined> = ref(
		props.planData.modified_at
	);
	// a plan-conflict overwrite clears the base; drafts keep needing one
	let lastBase: string | undefined = props.planData.modified_at;
	watch(
		refBaseModifiedAt,
		(base) => {
			if (base) lastBase = base;
		},
		{ flush: "sync" }
	);

	// Save As modal state
	const refShowSaveAsModal: Ref<boolean> = ref(false);
	const refSaveAsName: Ref<string> = ref("");
	const refSaveAsEmpireUuid: Ref<string | undefined> = ref(undefined);
	const refIsSavingAs: Ref<boolean> = ref(false);

	const refIsSaving: Ref<boolean> = ref(false);
	const refSaveFailed: Ref<boolean> = ref(false);

	// Keyboard and button: saving needs an own, changed, idle plan
	const canSave: ComputedRef<boolean> = computed(
		() =>
			userStore.isLoggedIn &&
			!props.disabled &&
			!preview.previewing.value &&
			saveable.value &&
			!refIsSaving.value
	);

	/*
	 * Autosave draft: an own, created plan outside preview keeps its
	 * unsaved edits in the backend
	 */
	const conflict = useSaveConflict();

	// own, created plan: drafts are possible (outside preview)
	const draftPossible: ComputedRef<boolean> = computed(
		() =>
			userStore.isLoggedIn &&
			!props.disabled &&
			!props.shared &&
			existing.value
	);

	const draft = usePlanDraft({
		planUuid: () => refPlanData.value.uuid,
		enabled: () => draftPossible.value && !preview.previewing.value,
		modified,
		snapshot,
		savedSnapshot,
		payload: () => backendData.value,
		base: () => refBaseModifiedAt.value ?? lastBase,
		applyDraft: (d: PlanDraft) => applyState(versionState(d)),
		conflict,
	});

	function saveFailed(): void {
		// keep modified state, the status offers a retry
		refSaveFailed.value = true;
		toast(t("plan.save_status.failed_message"), { type: "error" });
	}

	/**
	 * Saves the plan: creates it, or saves a new version of it
	 *
	 * @param {"button" | "shortcut"} [trigger] What started it
	 * @param {string} [name] Name of the version, unnamed if empty
	 */
	async function save(
		trigger: "button" | "shortcut" = "button",
		name: string = ""
	): Promise<void> {
		// pending plan:edit events belong before the save
		flushPlanEdits();
		refIsSaving.value = true;
		refSaveFailed.value = false;
		// the state sent, taken when it is sent: edits made while saving
		// stay unsaved
		let sent: string = "";

		// nothing new: a save would only add a duplicate version
		if (existing.value && !modified.value && !name.trim()) {
			refIsSaving.value = false;
			return;
		}

		try {
			// plan exists, trigger a save
			if (existing.value) {
				const versionName: string = name.trim();
				const restoredFrom = preview.refRestoredFrom.value;
				// after the draft writes queued before it
				const saved = await draft.withSave(async (seen) => {
					sent = snapshot();
					const version = {
						version_name: versionName || undefined,
						restored_from: restoredFrom?.uuid,
						draft_updated_at: seen,
					};
					let result = await saveExistingPlan(
						refPlanData.value.uuid!,
						backendData.value,
						refBaseModifiedAt.value,
						version
					);
					// the restored version was pruned meanwhile: still save
					if ("error" in result && result.error === "restored_from")
						result = await saveExistingPlan(
							refPlanData.value.uuid!,
							backendData.value,
							refBaseModifiedAt.value,
							{ ...version, restored_from: undefined }
						);
					if (!("error" in result)) draft.saved();
					return result;
				});
				if ("error" in saved) {
					const kind = saved.error;
					if (kind === "failed" || kind === "restored_from")
						return saveFailed();
					// after the save settled, the dialog waits on the user
					void nextTick(() => resolveConflict(kind));
					return;
				}

				refBaseModifiedAt.value = saved.modifiedAt;
				markSaved(sent);
				preview.clearRestore();
				trackEvent("plan:save", {
					planet_natural_id: planetNaturalId,
					trigger,
					named: versionName !== "",
					restore: restoredFrom !== null,
				});
				if (versionName)
					trackEvent("plan:version_name", { from: "save" });
			} else {
				// ponytail: from the persisted plan store, so an account
				// whose plans this browser never loaded counts as first
				const isFirstPlan: boolean =
					Object.keys(planningStore.plans).length === 0;
				sent = snapshot();
				const created = await createNewPlan(backendData.value);
				if (!created) return saveFailed();

				refPlanData.value.uuid = created.uuid;
				refBaseModifiedAt.value = created.modifiedAt;
				// Persist the auto-optimize-habs preference
				userStore.setPlanPreference(created.uuid, {
					autoOptimizeHabs: refAutoOptimizeHabs.value,
				});

				markSaved(sent);
				trackEvent("plan:create", {
					planet_natural_id: planetNaturalId,
					is_first_plan: isFirstPlan,
				});
			}

			// A new plan moves to its uuid URL, which remounts this page.
			// Save edits made while creating first, or they'd be lost.
			if (props.planData.uuid === undefined) {
				const planUuid: string = refPlanData.value.uuid!;
				while (modified.value) {
					const again: string = snapshot();
					const saved = await saveExistingPlan(
						planUuid,
						backendData.value,
						refBaseModifiedAt.value
					);
					if ("error" in saved) return saveFailed();
					refBaseModifiedAt.value = saved.modifiedAt;
					markSaved(again);
				}
				router.push(`/plan/${planetNaturalId}/${planUuid}`);
			}
		} finally {
			refIsSaving.value = false;
		}
	}

	async function saveAs(): Promise<void> {
		if (!refSaveAsName.value.trim()) return;

		refIsSavingAs.value = true;

		// Create new plan data with the new name and selected empire
		const saveAsData: PlanCreateData = {
			...backendData.value,
			plan_name: refSaveAsName.value.trim(),
			empire_uuid: refSaveAsEmpireUuid.value,
		};

		try {
			const created = await createNewPlan(saveAsData);
			if (!created) {
				toast(t("common.ui.save_failed"), { type: "error" });
				return;
			}

			// Persist the auto-optimize-habs preference
			userStore.setPlanPreference(created.uuid, {
				autoOptimizeHabs: refAutoOptimizeHabs.value,
			});

			refShowSaveAsModal.value = false;

			// a shared plan's copy opens in place
			if (props.shared) {
				trackEvent("plan:shared_clone", {
					planet_natural_id: planetNaturalId,
					modified: modified.value,
				});
				router.push(`/plan/${planetNaturalId}/${created.uuid}`);
				return;
			}

			trackEvent("plan:save_as", {
				planet_natural_id: planetNaturalId,
			});

			// open new plan in a new tab
			window.open(`/plan/${planetNaturalId}/${created.uuid}`, "_blank");
		} finally {
			refIsSavingAs.value = false;
		}
	}

	function openSaveAsModal(): void {
		// Pre-fill with current plan name + " (Copy)"
		refSaveAsName.value = planName.value ? `${planName.value} (Copy)` : "";
		// Pre-fill with current empire
		refSaveAsEmpireUuid.value = empire.uuid.value;
		refShowSaveAsModal.value = true;
	}

	// Save As empire options
	const saveAsEmpireOptions: ComputedRef<PSelectOption[]> = computed(() => {
		if (!empire.list.value) return [];
		return empire.list.value.map((e) => ({
			label: e.empire_name,
			value: e.uuid,
		}));
	});

	/**
	 * Drops the unsaved edits and their draft, back to the saved state.
	 * The editor reverts only once the draft is gone: another tab's draft
	 * opens the conflict dialog and the edits stay.
	 *
	 * @param {"menu" | "toast"} [from] The save menu, or the notice of a
	 * restored draft
	 */
	async function discardChanges(
		from: "menu" | "toast" = "menu"
	): Promise<void> {
		if (!modified.value) return;
		if (
			from === "menu" &&
			!(await confirm({
				title: t("plan.versions.discard"),
				content: t("plan.versions.discard_confirm"),
				positiveText: t("plan.versions.discard"),
				negativeText: t("common.buttons.cancel"),
			}))
		)
			return;

		draftToast?.destroy();
		const result = await draft.discard();
		if (result === "failed") {
			toast(t("plan.versions.discard_failed"), { type: "error" });
			return;
		}
		if (result === "conflict") return;

		applyState(savedSnapshot());
		refSaveFailed.value = false;
		preview.clearRestore();
		markSaved(savedSnapshot());
		if (from === "toast") trackEvent("plan:draft_discard");
		else trackEvent("plan:discard_changes");
	}

	/**
	 * Shows the saved plan, dropping unsaved edits and the history
	 *
	 * @param {IPlanDefinition} plan Saved plan
	 */
	function applySavedPlan(plan: IPlanDefinition): void {
		preview.cancel();
		refPlanData.value = inertClone(plan);
		refBaseModifiedAt.value = plan.modified_at;
		refSaveFailed.value = false;
		markSaved();
	}

	/**
	 * Loads the plan as saved in the backend
	 *
	 * @returns {Promise<Plan>} Saved plan
	 */
	function fetchSavedPlan(): Promise<Plan> {
		return useQuery("GetPlan", {
			planUuid: refPlanData.value.uuid!,
		}).execute({ forceRefetch: true });
	}

	/*
	 * Save conflicts: saved or deleted in another tab since this tab loaded
	 * the plan. The dialog lists both sides' changes and lets the user keep
	 * theirs as a new plan, overwrite or reload.
	 */
	async function resolveConflict(
		kind: "conflict" | "deleted"
	): Promise<void> {
		const loaded: IPlanDiffable = JSON.parse(savedSnapshot());
		const mine: IPlanDiffable = JSON.parse(snapshot());

		const choice = await conflict.ask({
			deleted: kind === "deleted",
			options:
				kind === "deleted"
					? ["save_as_new"]
					: ["save_as_new", "overwrite", "reload"],
			loadChanges:
				kind === "deleted"
					? undefined
					: async () =>
							threeWay(
								loaded,
								await fetchSavedPlan(),
								mine,
								diffPlan
							),
		});
		trackEvent("plan:save_conflict", {
			planet_natural_id: planetNaturalId,
			is_deleted: kind === "deleted",
			choice: choice ?? "close",
		});

		if (choice === "save_as_new") await saveAsNewPlan();
		else if (choice === "overwrite") {
			refBaseModifiedAt.value = undefined;
			await save();
		} else if (choice === "reload") await reloadSavedPlan();
	}

	/**
	 * Drops the edits for the saved plan, a failed load keeps them
	 */
	async function reloadSavedPlan(): Promise<void> {
		try {
			const plan: Plan = await fetchSavedPlan();
			// the edits are dropped, so is their draft
			await draft.drop();
			applySavedPlan(plan);
		} catch (err) {
			reportError(err);
			toast(t("common.ui.load_failed"), { type: "error" });
		}
	}

	/**
	 * Saves this tab's edits as "<name> (copy)" in the original's empire
	 * (the one it calculates with when the original is in it) and opens
	 * it, the original keeps the other tab's version
	 */
	async function saveAsNewPlan(): Promise<void> {
		refIsSaving.value = true;
		try {
			const inPlanEmpire = planEmpires.value.some(
				(e) => e.uuid === empire.uuid.value
			);
			const created = await createNewPlan({
				...backendData.value,
				plan_name: t("save_conflict.copy_name", {
					name: planName.value ?? "",
				}),
				empire_uuid: inPlanEmpire
					? empire.uuid.value
					: (planEmpires.value[0]?.uuid ?? empire.uuid.value),
			});
			if (!created) return saveFailed();

			userStore.setPlanPreference(created.uuid, {
				autoOptimizeHabs: refAutoOptimizeHabs.value,
			});
			// the edits live on in the copy, their draft goes
			await draft.drop();
			// leaving is no loss now
			markSaved();
			router.push(`/plan/${planetNaturalId}/${created.uuid}`);
		} finally {
			refIsSaving.value = false;
		}
	}

	/*
	 * Saved or deleted in another tab: without unsaved edits the plan
	 * reloads, with them a notice offers to
	 */
	let remoteToast: PToastHandle | undefined;

	watch(remoteChange, async (change) => {
		const planUuid: string | undefined = refPlanData.value.uuid;
		if (!change || !planUuid || !change.uuids.includes(planUuid)) return;

		remoteToast?.destroy();
		try {
			// the other tab's change invalidated it, this refetches
			const plan: Plan = await useQuery("GetPlan", {
				planUuid,
			}).execute();
			if (plan.modified_at === refBaseModifiedAt.value) return;

			trackEvent("app:remote_change", {
				object_type: "plan",
				has_unsaved_edits: modified.value,
				is_deleted: false,
			});
			// a preview holds the edits aside: never replace them unasked
			if (!modified.value && !preview.previewing.value)
				applySavedPlan(plan);
			else
				remoteToast = toast(t("save_conflict.notice.saved_elsewhere"), {
					duration: 15_000,
					action: {
						label: t("save_conflict.notice.reload"),
						onClick: reloadSavedPlan,
					},
				});
		} catch (err) {
			if (getSaveError(err) !== "deleted") return;
			trackEvent("app:remote_change", {
				object_type: "plan",
				has_unsaved_edits: modified.value,
				is_deleted: true,
			});
			remoteToast = toast(t("save_conflict.notice.deleted_elsewhere"), {
				type: "error",
				duration: 15_000,
			});
		}
	});

	// Route and Browser Guard: leaving with unsaved changes the draft
	// doesn't hold (yet)
	useUnsavedGuard(
		() =>
			!props.sharedPlanUuid &&
			// while previewing, the edits set aside count, not what it shows
			(preview.previewing.value
				? preview.stashModified.value
				: modified.value) &&
			(!draftPossible.value ||
				draft.draftPending.value ||
				draft.draftFailed.value),
		() => t("plan.notifications.leave_unsaved"),
		() =>
			trackEvent("plan:leave_unsaved", {
				planet_natural_id: planetNaturalId,
			})
	);

	/*
	 * Opening the plan: its unsaved edits from an earlier visit come back
	 * from the draft. With a draft the plan is refetched first: GetPlan
	 * never expires and a long-lived tab would compare an old save.
	 */
	let draftToast: PToastHandle | undefined;

	async function refreshSavedPlan(): Promise<void> {
		try {
			const plan: Plan = await fetchSavedPlan();
			if (plan.modified_at !== refBaseModifiedAt.value && !modified.value)
				applySavedPlan(plan);
		} catch (err) {
			reportError(err);
		}
	}

	async function resumeDraft(): Promise<void> {
		if (!refPlanData.value.uuid || !draftPossible.value) return;

		const restored: PlanDraft | null = await draft.load(refreshSavedPlan);
		if (!restored) return;

		trackEvent("plan:draft_restored", {
			age_minutes: Math.floor(
				(Date.now() - Date.parse(restored.updated_at)) / 60_000
			),
		});
		draftToast = toast(
			t("plan.versions.draft_restored", {
				when: formatWhen(restored.updated_at, t),
			}),
			{
				duration: 15_000,
				action: {
					label: t("plan.versions.discard"),
					onClick: () => discardChanges("toast"),
				},
			}
		);
	}

	onMounted(() => void resumeDraft());

	onUnmounted(() => {
		flushPlanEdits();
		// toasts belong to the app, don't let one outlive its plan
		remoteToast?.destroy();
		draftToast?.destroy();
	});

	return {
		refIsSaving,
		refSaveFailed,
		canSave,
		save,
		refShowSaveAsModal,
		refSaveAsName,
		refSaveAsEmpireUuid,
		refIsSavingAs,
		saveAsEmpireOptions,
		saveAs,
		openSaveAsModal,
		discardChanges,
		applySavedPlan,
		conflict,
		draftPossible,
		draftSavedAt: draft.draftSavedAt,
		draftResumed: draft.draftResumed,
		draftFailed: draft.draftFailed,
		retryDraft: draft.retry,
		// before a preview: the edits' pending write goes out first
		flushDraft: draft.writeNow,
	};
}
