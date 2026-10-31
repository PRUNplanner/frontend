import { computed, type ComputedRef, ref, type Ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import { useQuery } from "@/lib/query_cache/useQuery";

// Util
import { diffPlan } from "@/features/planning_data/planDiff";
import {
	versionAgeDays,
	versionState,
} from "@/features/planning/planVersions.util";

// Types & Interfaces
import type {
	Plan,
	PlanVersion,
} from "@/features/api/schemas/planningData.schemas";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";
import type { IPlanCalculation } from "@/features/planning/planView.types";

// UI
import { useToast } from "@/ui";

/**
 * Previews a saved version in the editor, read-only: the edits are set
 * aside and come back unchanged. Restore loads the version as one undo
 * step of unsaved edits; the next save is marked as its restore.
 *
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation The plan's calculation
 * @param {() => string | undefined} planUuid The plan's uuid
 */
export function usePlanVersionPreview(
	calculation: IPlanCalculation,
	planUuid: () => string | undefined
) {
	const { t } = useI18n();
	const toast = useToast();
	const { snapshot, savedSnapshot, applyState, record } = calculation;

	const refPreview: Ref<PlanVersion | null> = ref(null);
	// the editor state while previewing
	const stash: Ref<string | null> = ref(null);

	// the edits set aside differ from the save: leaving would lose them
	const stashModified: ComputedRef<boolean> = computed(
		() => stash.value !== null && stash.value !== savedSnapshot()
	);

	const previewing: ComputedRef<boolean> = computed(
		() => refPreview.value !== null
	);

	// the version restored into the edits; undoing the restore unsets it
	const refRestoredFrom: Ref<PlanVersion | null> = ref(null);
	let restore: {
		before: string;
		after: string;
		version: PlanVersion;
	} | null = null;

	watch(snapshot, (state) => {
		if (!restore || previewing.value) return;
		if (state === restore.before) refRestoredFrom.value = null;
		else if (state === restore.after)
			refRestoredFrom.value = restore.version;
	});

	/**
	 * Shows a version instead of the edits
	 *
	 * @param {string} versionUuid Version
	 */
	async function open(versionUuid: string): Promise<void> {
		const uuid: string | undefined = planUuid();
		if (!uuid) return;

		let version: PlanVersion;
		try {
			version = await useQuery("GetPlanVersion", {
				planUuid: uuid,
				versionUuid,
			}).execute();
		} catch (err) {
			reportError(err);
			toast(t("common.ui.load_failed"), { type: "error" });
			return;
		}

		if (stash.value === null) stash.value = snapshot();
		applyState(versionState(version));
		refPreview.value = version;
		trackEvent("plan:version_preview", {
			named: version.name !== "",
			age_days: versionAgeDays(version),
		});
	}

	/** Back to the edits, as they were */
	function back(): void {
		if (stash.value !== null) applyState(stash.value);
		stash.value = null;
		refPreview.value = null;
	}

	/** Ends the preview without bringing the edits back: they were replaced */
	function cancel(): void {
		stash.value = null;
		refPreview.value = null;
		refRestoredFrom.value = null;
		restore = null;
	}

	/**
	 * The previewed version's differences from the edits
	 *
	 * @returns {IChangeLine[]} Changes from the edits to the version
	 */
	function compare(): IChangeLine[] {
		if (!refPreview.value || stash.value === null) return [];
		trackEvent("plan:version_compare");
		return diffPlan(
			JSON.parse(stash.value),
			JSON.parse(versionState(refPreview.value))
		);
	}

	/** Loads the previewed version into the edits as one undo step */
	function restoreVersion(): void {
		const version: PlanVersion | null = refPreview.value;
		if (!version) return;
		back();

		const before: string = snapshot();
		record(() => applyState(versionState(version)))();
		restore = { before, after: snapshot(), version };
		refRestoredFrom.value = version;
		trackEvent("plan:version_restore", {
			named: version.name !== "",
			age_days: versionAgeDays(version),
		});
	}

	/** After a save or a reload: nothing is restored any more */
	function clearRestore(): void {
		refRestoredFrom.value = null;
		restore = null;
	}

	/**
	 * Creates a new plan from the previewed version and opens it in a new
	 * tab; this plan stays unchanged
	 */
	async function openAsPlan(): Promise<void> {
		const uuid: string | undefined = planUuid();
		const version: PlanVersion | null = refPreview.value;
		if (!uuid || !version) return;

		let plan: Plan;
		try {
			plan = await useQuery("ClonePlanVersion", {
				planUuid: uuid,
				versionUuid: version.uuid,
			}).execute();
		} catch (err) {
			reportError(err);
			toast(t("common.ui.save_failed"), { type: "error" });
			return;
		}
		trackEvent("plan:version_open_as_plan");
		window.open(`/plan/${plan.planet_natural_id}/${plan.uuid}`, "_blank");
	}

	return {
		refPreview,
		previewing,
		stashModified,
		refRestoredFrom,
		open,
		back,
		cancel,
		compare,
		restoreVersion,
		clearRestore,
		openAsPlan,
	};
}
