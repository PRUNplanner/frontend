import { computed, type ComputedRef, ref, type Ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Stores
import { useUserStore } from "@/stores/userStore";
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
import { usePlanetData } from "@/database/services/usePlanetData";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useToast } from "@/ui";

// Util
import config from "@/lib/config";
import { inertClone } from "@/util/data";
import { diffPlan } from "@/features/planning_data/planDiff";
import {
	buildChangeSummary,
	buildingChanges,
	planFigures,
} from "@/features/sharing/sharedPlan.util";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type {
	IPlanChanges,
	IPlanCompare,
} from "@/features/sharing/sharedPlan.types";
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";

/**
 * A shared plan, edited as the viewer's working copy: compared against
 * the shared version with the same empire and prices, reset to it, its
 * changes copied as text, priced with the viewer's empire
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation The working copy's calculation
 * @param {{ uuid: Ref<string | undefined>; list: Ref<PlanEmpireElement[] | undefined>; cxUuid: Readonly<Ref<string | undefined>> }} empire Empire and CX the plan calculates with
 * @param {(plan: IPlanDefinition) => void} applySavedPlan Shows a plan as saved
 * @param {IPlanViewProps} props The view's props
 */
export function usePlanSharedCopy(
	calculation: IPlanCalculation,
	empire: {
		uuid: Ref<string | undefined>;
		list: Ref<PlanEmpireElement[] | undefined>;
		cxUuid: Readonly<Ref<string | undefined>>;
	},
	applySavedPlan: (plan: IPlanDefinition) => void,
	props: IPlanViewProps
) {
	const { t } = useI18n();
	const toast = useToast();
	const userStore = useUserStore();
	const planningStore = usePlanningStore();
	const { planetName } = usePlanetData();
	const {
		modified,
		result,
		overviewData,
		planName,
		snapshot,
		savedSnapshot,
	} = calculation;
	const planetNaturalId: string = props.planData.planet_natural_id;

	const sharedBaseline: IPlanDefinition = inertClone(props.planData);
	const baselineCalculation = props.shared
		? usePlanCalculation(
				ref(inertClone(sharedBaseline)),
				empire.uuid,
				empire.list,
				empire.cxUuid
			)
		: undefined;

	const sharedChanged: ComputedRef<boolean> = computed(
		() => !!props.shared && modified.value
	);

	const sharedCompare: ComputedRef<IPlanCompare | undefined> = computed(() =>
		sharedChanged.value && baselineCalculation
			? {
					before: planFigures(
						baselineCalculation.result.value,
						baselineCalculation.overviewData.value
					),
					after: planFigures(result.value, overviewData.value),
				}
			: undefined
	);

	const sharedChanges: ComputedRef<IPlanChanges | undefined> = computed(() =>
		sharedChanged.value
			? buildingChanges(
					JSON.parse(savedSnapshot()),
					JSON.parse(snapshot())
				)
			: undefined
	);

	const sharedPriceSource: ComputedRef<string> = computed(() => {
		const cxName: string | undefined = empire.cxUuid.value
			? planningStore.cxs[empire.cxUuid.value]?.cx_name
			: undefined;
		return cxName
			? t("sharing.banner.price_cx", { name: cxName })
			: t("sharing.banner.price_universe");
	});

	// a logged in viewer's empire (the default one first) prices the copy
	// with its CX, also after logging in on the page
	if (props.shared) {
		let picked: boolean = false;
		watch(
			() => props.empireList,
			(list) => {
				if (!list?.length) return;
				empire.list.value = list;
				if (
					!picked ||
					!list.some((e) => e.uuid === empire.uuid.value)
				) {
					const preferred: string | undefined =
						userStore.preferences.defaultEmpireUuid;
					empire.uuid.value = (
						list.find((e) => e.uuid === preferred) ?? list[0]
					).uuid;
					picked = true;
				}
			},
			{ immediate: true }
		);
	}

	function resetShared(): void {
		applySavedPlan(sharedBaseline);
		trackEvent("plan:shared_reset", {
			planet_natural_id: planetNaturalId,
		});
	}

	async function copySharedChanges(): Promise<void> {
		const changes = diffPlan(
			JSON.parse(savedSnapshot()),
			JSON.parse(snapshot())
		);
		const text: string = buildChangeSummary(
			{
				name: planName.value || t("plan.name.untitled"),
				planet: planetNaturalId,
				changes,
				before: sharedCompare.value!.before,
				after: sharedCompare.value!.after,
				priceSource: sharedPriceSource.value,
				url: `${config.SHARE_BASE_URL}/${props.sharedPlanUuid}`,
			},
			t,
			(id) => planetName(id, id)
		);

		try {
			await navigator.clipboard.writeText(text);
			toast(t("sharing.banner.copied"));
			trackEvent("plan:shared_copy_changes", {
				planet_natural_id: planetNaturalId,
				change_count: changes.length,
			});
		} catch {
			toast(t("sharing.banner.copy_failed"), { type: "error" });
		}
	}

	return {
		sharedChanged,
		sharedCompare,
		sharedChanges,
		sharedPriceSource,
		resetShared,
		copySharedChanges,
	};
}
