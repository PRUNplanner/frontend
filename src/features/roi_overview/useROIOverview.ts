import { Ref, ref } from "vue";

// Composables
import { usePlanContext } from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { useBuildingData } from "@/database/services/useBuildingData";
import { TOTALMSDAY } from "@/features/planning/calculations/buildingCalculations";

// Util
import { deepClone } from "@/util/data";

// Static
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Types & Interfaces
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import { IRecipe } from "@/features/api/gameData.types";
import { IPlanContext } from "@/features/planning/engine/engine.types";
import {
	IROIResult,
	IStaticOptimalProduction,
} from "@/features/roi_overview/useROIOverview.types";

export function useROIOverview(
	definition: Ref<IPlanDefinition>,
	cxUuid: Ref<string | undefined>
) {
	const { getBuilding, getBuildingRecipes } = useBuildingData();
	const { loadGameData, createContext } = usePlanContext();

	// Filter for all non-extracting and non-fertility needing buildings
	const filteredOptimalProduction = optimalProduction.filter(
		(e) => !["RIG", "EXT", "COL", "FRM"].includes(e.ticker)
	);

	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	const resultData: Ref<IROIResult[]> = ref([]);

	// game data, the definition's planet and prices for the selected CX
	async function createPlanContext(): Promise<IPlanContext> {
		return createContext(
			await loadGameData(),
			definition.value.planet_natural_id,
			cxUuid.value
		);
	}

	/**
	 * Calculates a single optimal building with all its recipe options
	 * @author jplacht
	 *
	 * @async
	 * @param {IStaticOptimalProduction} optimal Optimal Building Setup
	 * @param {IPlanContext} [ctx] Shared plan context, built if not given
	 * @returns {Promise<void>} Void, adds to resultData directly
	 */
	async function calculateItem(
		optimal: IStaticOptimalProduction,
		ctx?: IPlanContext
	): Promise<IROIResult[]> {
		ctx ??= await createPlanContext();

		// get a deep copy of the definition as otherwise parallel runs would
		// overwrite each other in terms of setup
		const definitionCopy = deepClone(definition.value);

		const buildingRecipes: IRecipe[] = await getBuildingRecipes(
			optimal.ticker,
			[]
		);

		// get building data
		const building = await getBuilding(optimal.ticker);

		const itemResults: IROIResult[] = [];

		for (const recipe of buildingRecipes) {
			// as we're using production buildings, they all have a COGC
			definitionCopy.plan_cogc =
				`${building.expertise}` as PlanCOGCProgram;

			// set building
			definitionCopy.plan_data.buildings = [
				{
					name: optimal.ticker,
					amount: optimal.amount,
					active_recipes: [],
				},
			];

			// set infrastructure
			definitionCopy.plan_data.infrastructure = [
				{ building: "HB1", amount: optimal.HB1 },
				{ building: "HB2", amount: optimal.HB2 },
				{ building: "HB3", amount: optimal.HB3 },
				{ building: "HB4", amount: optimal.HB4 },
				{ building: "HB5", amount: optimal.HB5 },
				{ building: "HBB", amount: optimal.HBB },
				{ building: "HBC", amount: optimal.HBC },
				{ building: "HBM", amount: optimal.HBM },
				{ building: "HBL", amount: optimal.HBL },
				{ building: "STO", amount: optimal.sto },
				{ building: "STA", amount: optimal.sta },
				{ building: "STE", amount: optimal.ste },
				{ building: "STV", amount: optimal.stv },
				{ building: "STW", amount: optimal.stw },
			];

			// set recipe
			definitionCopy.plan_data.buildings[0].active_recipes = [
				{
					recipeid: recipe.recipe_id,
					amount: 1,
				},
			];

			const { result, overview: overviewData } = calculatePlan(
				{
					plan: definitionCopy,
					empire: undefined,
					cxUuid: cxUuid.value,
					// never read here
					recipeOptions: false,
				},
				ctx
			);

			itemResults.push({
				buildingTicker: optimal.ticker,
				optimalSetup: optimal,
				recipeId: recipe.recipe_id,
				dailyRuns: TOTALMSDAY / recipe.time_ms,
				recipeInputs: recipe.inputs,
				recipeOutputs: recipe.outputs,
				cogc: result.cogc,
				cogm: result.production.buildings[0].activeRecipes[0].cogm,
				outputProfit:
					result.production.buildings[0].activeRecipes[0].cogm
						?.totalProfit ?? 0,
				dailyProfit: overviewData.profit,
				planCost: overviewData.totalConstructionCost,
				planROI: overviewData.roi,
				planArea: result.area.areaUsed,
				planProfitArea: overviewData.profit / result.area.areaUsed,
			});
		}

		return itemResults;
	}

	let latestRun = 0;

	/**
	 * Triggers calculation of all optimal definitions, a newer call
	 * stops the running one
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<IROIResult[] | undefined>} ROI results, undefined
	 * if a newer calculation took over
	 */
	async function calculate(): Promise<IROIResult[] | undefined> {
		const run = ++latestRun;
		const results: IROIResult[] = [];
		resultData.value = [];
		progressCurrent.value = 0;
		progressTotal.value = filteredOptimalProduction.length;

		// set all the experts to 5
		definition.value.plan_data.experts.forEach(
			(expert) => (expert.amount = 5)
		);

		// one context for all plans: same planet and CX
		const ctx: IPlanContext = await createPlanContext();

		for (const optimal of filteredOptimalProduction) {
			await Promise.resolve();

			const result = await calculateItem(optimal, ctx);
			if (run !== latestRun) return undefined;
			results.push(...result);

			progressCurrent.value++;

			// yield back to vue and update dom
			await new Promise((r) => setTimeout(r, 0));
		}

		if (run !== latestRun) return undefined;
		resultData.value = results;
		return results;
	}

	/**
	 * Formats an optimal production setup into comma separated string list
	 * for building and its amount as well as non-zero infrastructures
	 *
	 * @author jplacht
	 *
	 * @param {IStaticOptimalProduction} optimal Optimal Building Setup
	 * @returns {string} Formatted string
	 */
	function formatOptimal(optimal: IStaticOptimalProduction): string {
		const skipKeys = ["total_area", "ticker", "amount"];

		const prefix = `${optimal.amount}x ${optimal.ticker}`;

		const infrastructure = Object.entries(optimal)
			.filter(
				([key, value]) => !skipKeys.includes(key) && Number(value) !== 0
			)
			.sort((a, b) => (a > b ? 1 : -1))
			.map(([key, value]) => `${value}x ${key.toUpperCase()}`);

		return [prefix, ...infrastructure].join(", ");
	}

	return {
		resultData,
		calculate,
		calculateItem,
		formatOptimal,
		// progress
		progressCurrent,
		progressTotal,
	};
}
