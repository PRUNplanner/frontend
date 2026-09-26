import {
	computed,
	ComputedRef,
	getCurrentScope,
	onScopeDispose,
	ref,
	Ref,
	shallowRef,
	toRef,
	watch,
} from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePlanetData } from "@/database/services/usePlanetData";
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";

// Submodule composables
import { usePlanCalculationHandlers } from "@/features/planning/usePlanCalculationHandlers";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import {
	calculateConstructionMaterials,
	calculateTotalConstructionCost,
} from "@/features/planning/engine/construction";
import { calculateFinance } from "@/features/planning/engine/finance";
import { calculateVisitation } from "@/features/planning/engine/visitation";

// Types & Interfaces
import { IPlanet } from "@/features/api/gameData.types";
import {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import {
	INFRASTRUCTURE_TYPE,
	IMaterialIO,
	IOverviewData,
	IPlanResult,
	IProductionResult,
	IVisitationData,
	planEmptyResult,
} from "@/features/planning/usePlanCalculation.types";
import {
	IPlan,
	IPlanData,
	IPlanEmpire,
	IPlanEmpireElement,
} from "@/stores/planningStore.types";
import { IPlanCreateData } from "@/features/planning_data/usePlan.types";

const overviewEmpty: IOverviewData = {
	dailyCost: 0,
	dailyProfit: 0,
	totalConstructionCost: 0,
	dailyDegradationCost: 0,
	profit: 0,
	roi: 0,
};

/**
 * # Plan Calculation
 *
 * Vue adapter around the planning engine (`engine/calculatePlan.ts`). The
 * plan's result is a synchronous `computed`: it recalculates when the
 * plan, the empire, the CX or its preferences change, and is ready as
 * soon as game data and the plan's planet are loaded (a no-op wait where
 * a view already loaded them).
 *
 * @param {Ref<IPlan>} plan Plan
 * @param {Ref<string | undefined>} empireUuid Active empire
 * @param {Ref<IPlanEmpireElement[] | undefined>} empireOptions Empires
 * @param {Ref<string | undefined>} cxUuid CX preference
 */
export function usePlanCalculation(
	plan: Ref<IPlan>,
	empireUuid: Ref<string | undefined> = ref(undefined),
	empireOptions: Ref<IPlanEmpireElement[] | undefined> = ref(undefined),
	cxUuid: Ref<string | undefined> = ref(undefined)
) {
	// stores
	const planningDataStore = usePlanningStore();
	const { getPlanet } = usePlanetData();
	const { getGameData, loadGameData, createPrices } = usePlanContext();

	const refreshKey: Ref<number> = ref(0);

	// watches external data to trigger a recalculation
	watch(
		() => planningDataStore.cxs,
		() => {
			refreshKey.value++;
		},
		{ deep: true }
	);

	// data references

	const planName: Ref<string | undefined> = toRef(plan.value.plan_name);
	const data: ComputedRef<IPlanData> = computed(() => plan.value.plan_data);
	const empires: Ref<IPlanEmpire[]> = toRef([]);
	const planEmpires: ComputedRef<IPlanEmpire[]> = computed(() =>
		plan.value.empires ? plan.value.empires : []
	);
	const planetNaturalId: Ref<string> = toRef(plan.value.planet_natural_id);

	// computations

	const existing: ComputedRef<boolean> = computed(() => {
		return plan.value.uuid !== undefined;
	});

	const saveable: ComputedRef<boolean> = computed(() => {
		return planName.value != undefined && planName.value != "";
	});

	/**
	 * Holds data of the currently active empire based on all available
	 * empires and the empireUuid passed to this composable
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanEmpire | undefined>}	Empire Information
	 */
	const computedActiveEmpire: ComputedRef<IPlanEmpire | undefined> = computed(
		() => getActiveEmpire(empireUuid.value, empireOptions.value)
	);

	// game data and the plan's planet, loaded once
	const planet = shallowRef<IPlanet>();
	const loaded: Promise<IPlanet> = (async () => {
		await loadGameData();
		planet.value = await getPlanet(planetNaturalId.value);
		return planet.value;
	})();
	loaded.catch((err) => {
		console.error(err);
	});

	function input(): IPlanInput {
		return {
			plan: plan.value,
			empire: computedActiveEmpire.value,
			cxUuid: cxUuid.value,
		};
	}

	function context(loadedPlanet: IPlanet): IPlanContext {
		return {
			...getGameData(),
			planet: loadedPlanet,
			prices: createPrices(planetNaturalId.value, cxUuid.value),
		};
	}

	// a stopped scope keeps its last result, like its stopped watchers did
	let stopped: boolean = false;
	if (getCurrentScope()) onScopeDispose(() => (stopped = true));
	let lastCalculation: IPlanCalculation | undefined;

	const calculation: ComputedRef<IPlanCalculation | undefined> = computed(
		() => {
			// recalculate on CX preference updates
			const _refresh: number = refreshKey.value;

			if (stopped || !planet.value) return lastCalculation;

			try {
				lastCalculation = calculatePlan(input(), context(planet.value));
			} catch (err) {
				// keep the last result, as a failed run did before
				console.error(err);
			}
			return lastCalculation;
		}
	);

	/**
	 * The plan's result, recalculated synchronously on every change
	 */
	const result: ComputedRef<IPlanResult> = computed(
		() => calculation.value?.result ?? planEmptyResult
	);

	const overviewData: ComputedRef<IOverviewData> = computed(
		() => calculation.value?.overview ?? overviewEmpty
	);

	/**
	 * Calculates a plans visitation data
	 * @author jplacht
	 *
	 * @type {ComputedRef<IVisitationData>}
	 */
	const visitationData: ComputedRef<IVisitationData> = computed(() =>
		calculateVisitation(result.value)
	);

	/**
	 * Calculates the plan once, independent of the live result
	 *
	 * @returns {Promise<IPlanResult>} Plan result
	 */
	async function calculate(): Promise<IPlanResult> {
		return calculatePlan(input(), context(await loaded)).result;
	}

	/**
	 * Calculates the overview (costs, profit, ROI) for a result's parts
	 *
	 * @param {IMaterialIO[]} materialIO Material IO
	 * @param {IProductionResult} production Production
	 * @param {Required<Record<INFRASTRUCTURE_TYPE, number>>} infrastructure Infrastructure
	 * @returns {Promise<IOverviewData>} Overview
	 */
	async function calculateOverview(
		materialIO: IMaterialIO[],
		production: IProductionResult,
		infrastructure: Required<Record<INFRASTRUCTURE_TYPE, number>>
	): Promise<IOverviewData> {
		const ctx: IPlanContext = context(await loaded);

		return calculateFinance(
			materialIO,
			production.buildings,
			calculateTotalConstructionCost(
				calculateConstructionMaterials(
					infrastructure,
					production.buildings,
					ctx.planet,
					ctx.buildings
				),
				ctx.prices
			)
		).overview;
	}

	/**
	 * Prepares plans data to conform to the Patch or Put payload
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanCreateData>}
	 */
	const backendData: ComputedRef<IPlanCreateData> = computed(() => {
		return {
			empire_uuid: empireUuid.value,
			plan_name: planName.value ?? "missing name",
			planet_natural_id: plan.value.planet_natural_id,
			plan_permits_used: plan.value.plan_permits_used,
			plan_cogc: plan.value.plan_cogc,
			plan_corphq: plan.value.plan_corphq,
			plan_data: {
				experts: data.value.experts,
				buildings: data.value.buildings,
				workforce: data.value.workforce,
				infrastructure: data.value.infrastructure,
			},
		};
	});

	// submodules
	const handlers = usePlanCalculationHandlers(
		plan,
		data,
		planName,
		result
	);

	return {
		existing,
		saveable,
		result,
		empires,
		backendData,
		planEmpires,
		planName,
		visitationData,
		overviewData,
		computedActiveEmpire,
		// submodules
		...handlers,
		// internal,
		refreshKey,
		calculate,
		calculateOverview,
	};
}
