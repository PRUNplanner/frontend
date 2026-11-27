import { createPriceBook } from "../../src/cx/priceBook";
import { groupRecipesByBuilding } from "../../src/engine/buildings";

// Types & Interfaces
import type { IPlanContext, IPlanInput } from "../../src/engine/engine.types";
import type {
	Building,
	Exchange,
	Material,
	Planet,
	Recipe,
} from "../../src/schemas/gameData.schemas";
import type { Plan, PlanEmpire } from "../../src/schemas/planningData.schemas";

// test data
import {
	buildings,
	exchanges,
	materials,
	planEtherwind,
	planetEtherwind,
	recipes,
} from "./gameData";

/**
 * An engine context from the fixture JSON in plain Node: the same maps the
 * app's usePlanContext builds from IndexedDB (keyed like its stores) and a
 * Universe price book. No stores, no IndexedDB.
 */
export function fixtureContext(warn?: IPlanContext["warn"]): IPlanContext {
	const byTicker = new Map(
		(exchanges as unknown as Exchange[]).map((e) => [e.ticker_id, e])
	);
	return {
		buildings: new Map(
			(buildings as unknown as Building[]).map((b) => [
				b.building_ticker,
				b,
			])
		),
		recipesByBuilding: groupRecipesByBuilding(recipes as Recipe[]),
		materials: new Map((materials as Material[]).map((m) => [m.ticker, m])),
		planet: planetEtherwind as unknown as Planet,
		prices: createPriceBook(undefined, undefined, (id) => {
			const exchange = byTicker.get(id);
			if (!exchange) throw new Error(`no exchange ${id}`);
			return exchange;
		}),
		...(warn ? { warn } : {}),
	};
}

const etherwind = (): Plan => structuredClone(planEtherwind) as unknown as Plan;

/**
 * The golden plans: Etherwind as saved (experts, 3 permits, resource
 * extraction COGC), and a variant with a faction, corp HQ, other experts,
 * 2 permits and a food industries COGC
 */
export function goldenPlans(): Record<string, IPlanInput> {
	const variant = etherwind();
	variant.plan_cogc = "FOOD_INDUSTRIES";
	variant.plan_corphq = true;
	variant.plan_permits_used = 2;
	variant.plan_data.experts = variant.plan_data.experts.map((e) => ({
		...e,
		amount: e.type === "Food_Industries" ? 5 : e.amount === 0 ? 0 : 1,
	}));
	const empire: PlanEmpire = variant.empires![0];

	return {
		etherwind: { plan: etherwind(), empire: undefined, cxUuid: undefined },
		variant: { plan: variant, empire, cxUuid: undefined },
	};
}
