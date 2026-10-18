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
import { tracePriceBook } from "@/features/planning/engine/trace";

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
 * out, no Vue, and it never mutates its input. With `ctx.trace` it records
 * every step for the calculation debug panel; the result is the same.
 *
 * @param {IPlanInput} input Plan, empire and CX
 * @param {IPlanContext} ctx Game data, planet and price book
 * @returns {IPlanCalculation} Plan result and overview
 */
export function calculatePlan(
	input: IPlanInput,
	planContext: IPlanContext
): IPlanCalculation {
	const { plan } = input;
	const data = plan.plan_data;
	const { trace } = planContext;
	const ctx: IPlanContext = trace
		? { ...planContext, prices: tracePriceBook(planContext.prices, trace) }
		: planContext;

	trace?.step({
		phase: "input",
		label: "plan input",
		inputs: {
			planet: ctx.planet.planet_natural_id,
			cogc: plan.plan_cogc,
			corphq: plan.plan_corphq,
			permits: plan.plan_permits_used,
			empire_faction: input.empire?.empire_faction ?? "none",
			cx: input.cxUuid ?? "Universe",
		},
	});

	const workforce = calculateWorkforce(data, ctx.buildings, trace);
	const area = calculateArea(
		data,
		plan.plan_permits_used,
		ctx.buildings,
		trace
	);
	const infrastructure = calculateInfrastructure(data);
	const storage = calculateStorage(data);
	const experts = calculateExperts(data.experts, trace);
	// recipe options are not traced, they read the untraced prices
	const production = calculateProduction(
		input,
		ctx,
		workforce,
		experts,
		planContext.prices
	);

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

	if (trace) {
		const workforceIn = new Map(
			workforceMaterialIO.map((m) => [m.ticker, m.input])
		);
		const productionIO = new Map(
			productionMaterialIO.map((m) => [m.ticker, m])
		);
		for (const m of materialIO) {
			const scope = { ticker: m.ticker };
			const side = m.delta >= 0 ? "SELL" : "BUY";
			trace.step({
				phase: "materialio",
				label: `${m.ticker} delta`,
				formula: "production_out − production_in − workforce",
				inputs: {
					production_out: productionIO.get(m.ticker)?.output ?? 0,
					production_in: productionIO.get(m.ticker)?.input ?? 0,
					workforce: workforceIn.get(m.ticker) ?? 0,
				},
				value: m.delta,
				unit: "/day",
				scope,
			});
			trace.step({
				phase: "materialio",
				label: `${m.ticker} value`,
				formula: `delta × ${side} price`,
				inputs: {
					delta: m.delta,
					price: planContext.prices.getPrice(m.ticker, side),
				},
				value: m.price,
				unit: "/day",
				scope,
			});
		}
	}

	// construction, once for the result and the overview
	const constructionMaterials = calculateConstructionMaterials(
		infrastructure,
		production.buildings,
		ctx.planet,
		ctx.buildings,
		trace
	);

	const { profit, cost, revenue, overview } = calculateFinance(
		materialIO,
		production.buildings,
		calculateTotalConstructionCost(
			constructionMaterials,
			ctx.prices,
			trace
		),
		trace
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
