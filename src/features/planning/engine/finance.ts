// Types & Interfaces
import type {
	IMaterialIO,
	IOverviewData,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanTracer } from "@/features/planning/engine/engine.types";

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
 * @param {IPlanTracer} [trace] Tracer
 * @returns {IPlanFinance} Finance
 */
export function calculateFinance(
	materialIO: IMaterialIO[],
	production: IProductionBuilding[],
	totalConstructionCost: number,
	trace?: IPlanTracer
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
	const profit: number =
		materialRevenue - materialCost - dailyDegradationCost;

	if (trace) {
		const step = (
			label: string,
			value: number,
			formula: string,
			inputs?: Record<string, number>
		) =>
			trace.step({
				phase: "finance",
				label,
				formula,
				inputs,
				value,
				unit: "/day",
			});
		step(
			"material cost",
			materialCost,
			"Σ −value of materials with delta < 0"
		);
		step("revenue", materialRevenue, "Σ value of materials with delta > 0");
		step("degradation", dailyDegradationCost, "construction × 1/180", {
			construction: constructionCost,
		});
		step(
			"overview degradation",
			dailyDegradationValue * -1,
			"construction ÷ 180",
			{ construction: constructionCost }
		);
		step("profit", profit, "revenue − material_cost − degradation", {
			revenue: materialRevenue,
			material_cost: materialCost,
			degradation: dailyDegradationCost,
		});
		step(
			"overview profit",
			overviewProfit,
			"revenue − material_cost − overview_degradation",
			{
				revenue: materialRevenue,
				material_cost: materialValueBought * -1,
				overview_degradation: dailyDegradationValue * -1,
			}
		);
		trace.step({
			phase: "finance",
			label: "ROI",
			formula: "total_construction_cost ÷ overview_profit",
			inputs: {
				total_construction_cost: totalConstructionCost,
				overview_profit: overviewProfit,
			},
			value: totalConstructionCost / overviewProfit,
			unit: "days",
		});
	}

	return {
		profit,
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
