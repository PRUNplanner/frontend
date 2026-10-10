// Prices
import type { IPriceBook } from "@/features/cx/priceBook";

// Material IO
import { TOTALMSDAY } from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type {
	ICOGMMaterialCost,
	ICOGMMaterialReturn,
	IProductionBuildingRecipe,
	IProductionBuildingRecipeCOGM,
} from "@/features/planning/usePlanCalculation.types";

/**
 * COGM
 *
 * Calculates an active recipe's cost of goods manufactured, taking into
 * account the active recipes share of a full daily runtime cycle with the
 * following logics:
 *
 * degradation: share of full daily building degradation
 * workforce: share of buildings daily workforce cost
 * input cost: buy prices for the required input materials
 *
 * total cost: degradation share + workforce share + input total
 *
 * cogm: per output material
 * 	- either consuming the full cost
 * 	- or just its material output / all output
 *
 * @param {IProductionBuildingRecipe} ar Active recipe
 * @param {number} totalEfficiency Building efficiency
 * @param {number} constructionCost Construction cost (positive)
 * @param {number} workforceCost Daily workforce cost (positive)
 * @param {boolean} visible Show COGM (a CX is selected)
 * @param {IPriceBook} prices Price Book
 * @returns {IProductionBuildingRecipeCOGM} COGM
 */
export function calculateCOGM(
	ar: IProductionBuildingRecipe,
	totalEfficiency: number,
	constructionCost: number,
	workforceCost: number,
	visible: boolean,
	prices: IPriceBook
): IProductionBuildingRecipeCOGM {
	const runtimeShare: number =
		ar.recipe.time_ms / totalEfficiency / TOTALMSDAY;
	const degradation: number = constructionCost / 180;
	const degradationShare: number = degradation * runtimeShare;
	const workforceCostTotal: number = workforceCost;
	// no workforce cost has no share, also at 0% efficiency (0 * ∞ is NaN)
	const workforceCostShare: number =
		workforceCostTotal === 0 ? 0 : workforceCostTotal * runtimeShare;

	const inputCost: ICOGMMaterialCost[] = ar.recipe.inputs.map((inputMat) => {
		const price = prices.getPrice(inputMat.material_ticker, "BUY");
		return {
			ticker: inputMat.material_ticker,
			amount: inputMat.material_amount,
			costUnit: price,
			costTotal: price * inputMat.material_amount,
		};
	});

	inputCost.sort((a, b) => (a.ticker > b.ticker ? 1 : -1));

	const inputTotal: number = inputCost.reduce(
		(sum, current) => sum + current.costTotal,
		0
	);

	const outputRevenue = ar.recipe.outputs
		.map(
			(current) =>
				prices.getPrice(current.material_ticker, "SELL") *
				current.material_amount
		)
		.reduce((a, b) => a + b, 0);

	const totalCost: number =
		degradationShare + workforceCostShare + inputTotal;

	const sumOutputs: number = ar.recipe.outputs.reduce(
		(sum, current) => sum + current.material_amount,
		0
	);

	const totalProfit: number = outputRevenue - totalCost;

	const outputCOGM: ICOGMMaterialReturn[] = ar.recipe.outputs
		.map((outputMat) => ({
			ticker: outputMat.material_ticker,
			amount: outputMat.material_amount,
			costSplit: totalCost / sumOutputs,
			costTotal: totalCost / outputMat.material_amount,
		}))
		.sort((a, b) => (a.ticker > b.ticker ? 1 : -1));

	return {
		visible,
		runtime: ar.recipe.time_ms / totalEfficiency,
		runtimeShare,
		efficiency: totalEfficiency,
		degradation,
		degradationShare,
		workforceCost: workforceCostShare,
		workforceCostTotal,
		inputCost,
		inputTotal,
		outputCOGM,
		totalCost,
		outputRevenue,
		totalProfit,
	} as IProductionBuildingRecipeCOGM;
}
