import { bench, describe, vi } from "vitest";

// Engine
import { usePlanContext } from "@/features/planning/usePlanContext";
import {
	priceSensitivity,
	realisticPlan,
} from "@/features/planning/util/whatIf.util";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { createPriceBook } from "@/features/cx/priceBook";
import { marketCheck } from "@/features/cx/marketCheck.util";
import { useExchangeData } from "@/database/services/useExchangeData";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { CXData } from "@/features/api/schemas/cxData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
	largePlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

/**
 * Opening the Plan check price sensitivity view: the base plan plus one
 * recalculation per material. Budget 100 ms for a 20-building plan, run
 * with `pnpm vitest bench --run`. Node + jsdom numbers.
 */

await setupPlanningTestData();
const { loadGameData, createContext } = usePlanContext();
const ctx = await createContext(await loadGameData(), "KW-688c", undefined);

function twentyBuildings(): Plan {
	const plan = largePlan();
	plan.plan_data.buildings = plan.plan_data.buildings.slice(0, 20);
	return plan;
}

const plans: [string, () => Plan][] = [
	["etherwind", etherwindPlan],
	["20 buildings", twentyBuildings],
];

describe("plan check price sensitivity", () => {
	for (const [name, factory] of plans) {
		const input = { plan: factory(), empire: undefined, cxUuid: undefined };
		bench(name, () => {
			priceSensitivity(input, ctx);
		});
	}
});

/**
 * Opening the Market check view: the plan, a check per material and the
 * plan at ask/bid prices, with an exchange preference. Budget 100 ms for a
 * 20-building plan.
 */

const { getExchangeTickerLoaded } = useExchangeData();
const cx: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

describe("plan check market check", () => {
	for (const [name, factory] of plans) {
		const input = { plan: factory(), empire: undefined, cxUuid: "cx" };
		bench(name, () => {
			const priced = {
				...ctx,
				prices: createPriceBook(
					() => cx,
					"KW-688c",
					getExchangeTickerLoaded
				),
			};
			const { result } = calculatePlan(
				{ ...input, recipeOptions: false },
				priced
			);
			marketCheck(result.materialio, priced.prices, getExchangeTickerLoaded);
			realisticPlan(input, priced, getExchangeTickerLoaded);
		});
	}
});
