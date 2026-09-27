// Prices
import { enhanceMaterialIOMaterial } from "@/features/cx/priceBook";

// Engine
import {
	calculateWorkforce,
	calculateWorkforceConsumption,
} from "@/features/planning/engine/workforce";
import {
	calculateArea,
	calculateInfrastructure,
	calculateStorage,
} from "@/features/planning/engine/area";
import { calculateExperts } from "@/features/planning/engine/efficiency";
import { calculateProduction } from "@/features/planning/engine/production";
import {
	combineMaterialIOMinimal,
	enhanceMaterialIOMinimal,
} from "@/features/planning/engine/materialIO";
import {
	calculateConstructionMaterials,
	calculateInfrastructureCosts,
	calculateTotalConstructionCost,
} from "@/features/planning/engine/construction";
import { calculateFinance } from "@/features/planning/engine/finance";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type {
	IMaterialIO,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";

/**
 * # Plan calculation engine
 *
 * Calculates a plan's full result and overview from its input and a
 * context of game data, planet and prices. Synchronous, plain data in and
 * out, no Vue, and it never mutates its input.
 *
 * @param {IPlanInput} input Plan, empire and CX
 * @param {IPlanContext} ctx Game data, planet and price book
 * @returns {IPlanCalculation} Plan result and overview
 */
export function calculatePlan(
	input: IPlanInput,
	ctx: IPlanContext
): IPlanCalculation {
	const { plan } = input;
	const data = plan.plan_data;

	const workforce = calculateWorkforce(data, ctx.buildings);
	const area = calculateArea(data, plan.plan_permits_used, ctx.buildings);
	const infrastructure = calculateInfrastructure(data);
	const storage = calculateStorage(data);
	const experts = calculateExperts(data.experts);
	const production = calculateProduction(input, ctx, workforce, experts);

	// get individual material IOs, combine and enhance
	const workforceMaterialIO: IMaterialIOMinimal[] =
		calculateWorkforceConsumption(workforce);
	const productionMaterialIO: IMaterialIOMinimal[] = production.materialio;

	const priced = (minimal: IMaterialIOMinimal[]): IMaterialIO[] =>
		enhanceMaterialIOMaterial(
			ctx.prices,
			enhanceMaterialIOMinimal(ctx.materials, minimal)
		);

	const materialIO: IMaterialIO[] = priced(
		combineMaterialIOMinimal([workforceMaterialIO, productionMaterialIO])
	);

	// construction, once for the result and the overview
	const constructionMaterials = calculateConstructionMaterials(
		infrastructure,
		production.buildings,
		ctx.planet,
		ctx.buildings
	);

	const { profit, cost, revenue, overview } = calculateFinance(
		materialIO,
		production.buildings,
		calculateTotalConstructionCost(constructionMaterials, ctx.prices)
	);

	return {
		result: {
			done: true,
			corphq: plan.plan_corphq,
			cogc: plan.plan_cogc,
			workforce,
			area,
			infrastructure,
			storage,
			experts,
			production,
			materialio: materialIO,
			workforceMaterialIO: priced(workforceMaterialIO),
			productionMaterialIO: priced(productionMaterialIO),
			profit,
			cost,
			revenue,
			infrastructureCosts: calculateInfrastructureCosts(
				ctx.prices,
				ctx.planet,
				ctx.buildings
			),
			constructionMaterials,
		},
		overview,
	};
}
