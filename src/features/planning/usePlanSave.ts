import {
	computed,
	type ComputedRef,
	nextTick,
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
import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";
import { flushPlanEdits, trackEvent } from "@/lib/analytics/useAnalytics";
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

// Types & Interfaces
import type {
	Plan,
	PlanCreateData,
} from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";

// UI
import { useToast } from "@/ui";
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
 */
export function usePlanSave(
	calculation: IPlanCalculation,
	refPlanData: Ref<IPlanDefinition>,
	empire: {
		uuid: Ref<string | undefined>;
		list: Ref<PlanEmpireElement[] | undefined>;
	},
	refAutoOptimizeHabs: Ref<boolean>,
	props: IPlanViewProps
) {
	const { t } = useI18n();
	const toast = useToast();
	const userStore = useUserStore();
	const planningStore = usePlanningStore();
	const { createNewPlan, saveExistingPlan, reloadExistingPlan } = usePlan();
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
	} = calculation;
	const planetNaturalId: string = props.planData.planet_natural_id;

	// save version the edits started from, sent so a save over another
	// tab's newer one fails as a conflict
	const refBaseModifiedAt: Ref<string | undefined> = ref(
		props.planData.modified_at
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
			saveable.value &&
			!refIsSaving.value
	);

	function saveFailed(): void {
		// keep modified state, the status offers a retry
		refSaveFailed.value = true;
		toast(t("plan.save_status.failed_message"), { type: "error" });
	}

	async function save(
		trigger: "button" | "shortcut" = "button"
	): Promise<void> {
		// pending plan:edit events belong before the save
		flushPlanEdits();
		refIsSaving.value = true;
		refSaveFailed.value = false;
		// edits made while saving stay unsaved
		const sent: string = snapshot();

		try {
			// plan exists, trigger a save
			if (existing.value) {
				const saved = await saveExistingPlan(
					refPlanData.value.uuid!,
					backendData.value,
					refBaseModifiedAt.value
				);
				if ("error" in saved) {
					const kind = saved.error;
					if (kind === "failed") return saveFailed();
					// after the save settled, the dialog waits on the user
					void nextTick(() => resolveConflict(kind));
					return;
				}

				refBaseModifiedAt.value = saved.modifiedAt;
				markSaved(sent);
				trackEvent("plan:save", {
					planet_natural_id: planetNaturalId,
					trigger,
				});
			} else {
				// ponytail: from the persisted plan store, so an account
				// whose plans this browser never loaded counts as first
				const isFirstPlan: boolean =
					Object.keys(planningStore.plans).length === 0;
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
			if (!created) return;

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

	async function reloadPlan(): Promise<void> {
		if (!existing.value || !refPlanData.value.uuid) {
			throw new Error(`Unable to reload plan without uuid.`);
		}
		// reloading throws away unsaved edits
		if (modified.value && !confirm(t("plan.actions.reload_confirm")))
			return;

		applySavedPlan(await reloadExistingPlan(refPlanData.value.uuid));

		trackEvent("plan:reload", {
			planet_natural_id: planetNaturalId,
		});
	}

	/**
	 * Shows the saved plan, dropping unsaved edits and the history
	 *
	 * @param {IPlanDefinition} plan Saved plan
	 */
	function applySavedPlan(plan: IPlanDefinition): void {
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
	const conflict = useSaveConflict();

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
			applySavedPlan(await fetchSavedPlan());
		} catch (err) {
			console.error("Reloading the saved plan", err);
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
		if (!change || !planUuid || change.uuid !== planUuid) return;

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
			if (!modified.value) applySavedPlan(plan);
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

	// Route and Browser Guard: leaving with unsaved changes
	useUnsavedGuard(
		() => modified.value && !props.sharedPlanUuid,
		() => t("plan.notifications.leave_unsaved"),
		() =>
			trackEvent("plan:leave_unsaved", {
				planet_natural_id: planetNaturalId,
			})
	);

	onUnmounted(() => {
		flushPlanEdits();
		// toasts belong to the app, don't let one outlive its plan
		remoteToast?.destroy();
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
		reloadPlan,
		applySavedPlan,
		conflict,
	};
}
