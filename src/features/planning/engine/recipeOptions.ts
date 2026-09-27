// Prices
import {
	getMaterialIOTotalPrice,
	type IPriceBook,
} from "@/features/cx/priceBook";

// Material IO
import { TOTALMSDAY } from "@/features/planning/engine/materialIO";

// Static data
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Types & Interfaces
import type { Building, Recipe } from "@/features/api/schemas/gameData.schemas";
import type { IRecipeBuildingOption } from "@/features/planning/usePlanCalculation.types";

/**
 * Calculates every recipe option of a building: its daily revenue at the
 * building's efficiency, ROI and profit per area
 *
 * @param {Building} building Building Data
 * @param {Recipe[]} recipes The building's recipes
 * @param {number} totalEfficiency Building efficiency
 * @param {number} constructionCost Construction cost (positive)
 * @param {number} workforceCost Daily workforce cost (positive)
 * @param {IPriceBook} prices Price Book
 * @returns {IRecipeBuildingOption[]} Recipe options
 */
export function calculateRecipeOptions(
	building: Building,
	recipes: Recipe[],
	totalEfficiency: number,
	constructionCost: number,
	workforceCost: number,
	prices: IPriceBook
): IRecipeBuildingOption[] {
	return recipes.map((br) => {
		// calculate daily revenue
		const dailyIncome: number = getMaterialIOTotalPrice(
			prices,
			br.outputs.map((o) => ({
				ticker: o.material_ticker,
				output: o.material_amount,
				input: 0,
			})),
			"SELL"
		);

		const dailyCost: number =
			-1 *
			getMaterialIOTotalPrice(
				prices,
				br.inputs.map((i) => ({
					ticker: i.material_ticker,
					output: 0,
					input: i.material_amount,
				})),
				"BUY"
			);

		// Daily Revenue of a recipe option
		const maxDailyRuns: number =
			TOTALMSDAY / (br.time_ms / totalEfficiency);

		const dailyRevenue: number =
			dailyIncome * maxDailyRuns -
			dailyCost * maxDailyRuns -
			constructionCost * (1 / 180) -
			workforceCost;

		// Recipe option ROI
		const roi: number = constructionCost / dailyRevenue;

		// Recipe option Profit per Area
		const optimalProductionData = optimalProduction.find(
			(op) => op.ticker === br.building_ticker
		);
		const areaPerBuilding: number = optimalProductionData
			? (optimalProductionData.total_area + 25) /
				optimalProductionData.amount
			: building.area_cost + 25;

		const profitPerArea = dailyRevenue / areaPerBuilding;

		return {
			recipe_id: br.recipe_id,
			recipe_name: br.recipe_name,
			building_ticker: br.building_ticker,
			time_ms: br.time_ms / totalEfficiency,
			inputs: br.inputs,
			outputs: br.outputs,
			dailyRevenue,
			roi,
			profitPerArea,
		};
	});
}
