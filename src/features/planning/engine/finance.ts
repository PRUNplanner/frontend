// Types & Interfaces
import {
	IMaterialIO,
	IOverviewData,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

interface IPlanFinance {
	profit: number;
	cost: number;
	revenue: number;
	overview: IOverviewData;
}

/**
 * Revenue, cost, profit and the plan overview, computed in one pass
 *
 * Revenue: Material IO with positive Delta
 * Cost: Material IO with negative delta + 1/180 of all buildings daily degradation
 * Profit: Revenue - cost
 *
 * @remark The plan result and the overview report the same money with
 * different signs and a different degradation formula (x * (1 / 180)
 * versus x / 180, which can differ in the last bit). Both are kept as they
 * were, down to the sign of zero, so no displayed number changes.
 *
 * @param {IMaterialIO[]} materialIO Priced material io
 * @param {IProductionBuilding[]} production Production buildings
 * @param {number} totalConstructionCost Total construction cost
 * @returns {IPlanFinance} Finance
 */
export function calculateFinance(
	materialIO: IMaterialIO[],
	production: IProductionBuilding[],
	totalConstructionCost: number
): IPlanFinance {
	// bought materials: as a positive cost, and as their (negative) value
	let materialCost: number = 0;
	let materialValueBought: number = 0;
	let materialRevenue: number = 0;

	for (const e of materialIO) {
		materialCost = materialCost + (e.delta < 0 ? e.price * -1 : 0);
		materialValueBought = materialValueBought + (e.delta < 0 ? e.price : 0);
		materialRevenue = materialRevenue + (e.delta > 0 ? e.price : 0);
	}

	// construction materials of all production buildings: as a positive
	// cost, and as their (negative) value
	let constructionCost: number = 0;
	let constructionValue: number = 0;

	for (const b of production) {
		constructionCost =
			constructionCost + b.constructionCost * -1 * b.amount;
		constructionValue = constructionValue + b.constructionCost * b.amount;
	}

	const dailyDegradationCost: number = constructionCost * (1 / 180);
	const dailyDegradationValue: number = constructionValue / 180;

	// both values negative, so this subtracts their costs
	const overviewProfit: number =
		materialRevenue + dailyDegradationValue + materialValueBought;

	return {
		profit: materialRevenue - materialCost - dailyDegradationCost,
		cost: materialCost + dailyDegradationCost,
		revenue: materialRevenue,
		overview: {
			dailyCost: materialValueBought * -1,
			dailyProfit: materialRevenue,
			totalConstructionCost,
			dailyDegradationCost: dailyDegradationValue * -1,
			profit: overviewProfit,
			roi: totalConstructionCost / overviewProfit,
		},
	};
}
