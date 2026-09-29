import {
	computed,
	type ComputedRef,
	getCurrentScope,
	onScopeDispose,
	ref,
	type Ref,
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
import { usePlanHistory } from "@/features/planning/usePlanHistory";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import {
	calculateConstructionMaterials,
	calculateTotalConstructionCost,
} from "@/features/planning/engine/construction";
import { calculateFinance } from "@/features/planning/engine/finance";
import { calculateVisitation } from "@/features/planning/engine/visitation";

// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type {
	InfrastructureType,
	PlanCreateData,
	PlanData,
	PlanEmpire,
} from "@/features/api/schemas/planningData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import {
	type IMaterialIO,
	type IOverviewData,
	type IPlanResult,
	type IProductionResult,
	type IVisitationData,
	planEmptyResult,
} from "@/features/planning/usePlanCalculation.types";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

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
 * @param {Ref<IPlanDefinition>} plan Plan
 * @param {Ref<string | undefined>} empireUuid Active empire
 * @param {Ref<PlanEmpireElement[] | undefined>} empireOptions Empires
 * @param {Ref<string | undefined>} cxUuid CX preference
 */
export function usePlanCalculation(
	plan: Ref<IPlanDefinition>,
	empireUuid: Ref<string | undefined> = ref(undefined),
	empireOptions: Ref<PlanEmpireElement[] | undefined> = ref(undefined),
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
	const data: ComputedRef<PlanData> = computed(() => plan.value.plan_data);
	const empires: Ref<PlanEmpire[]> = toRef([]);
	const planEmpires: ComputedRef<PlanEmpire[]> = computed(() =>
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
	 * @type {ComputedRef<PlanEmpire | undefined>}	Empire Information
	 */
	const computedActiveEmpire: ComputedRef<PlanEmpire | undefined> = computed(
		() => getActiveEmpire(empireUuid.value, empireOptions.value)
	);

	// game data and the plan's planet, loaded once
	const planet = shallowRef<Planet>();
	const loaded: Promise<Planet> = (async () => {
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

	function context(loadedPlanet: Planet): IPlanContext {
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
	 * @param {Required<Record<InfrastructureType, number>>} infrastructure Infrastructure
	 * @returns {Promise<IOverviewData>} Overview
	 */
	async function calculateOverview(
		materialIO: IMaterialIO[],
		production: IProductionResult,
		infrastructure: Required<Record<InfrastructureType, number>>
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
	 * @type {ComputedRef<PlanCreateData>}
	 */
	const backendData: ComputedRef<PlanCreateData> = computed(() => {
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
	const { handleChangePlanName, ...edits } = usePlanCalculationHandlers(
		plan,
		data,
		planName,
		result
	);
	const { record, wrap, ...history } = usePlanHistory(plan, planName);

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
		...wrap(edits),
		// typing a name is one undo step
		handleChangePlanName: record(handleChangePlanName, "plan_name"),
		...history,
		// internal,
		refreshKey,
		calculate,
		calculateOverview,
	};
}
