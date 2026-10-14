import { bench, describe, vi } from "vitest";

// Engine
import { usePlanContext } from "@/features/planning/usePlanContext";
import { priceSensitivity } from "@/features/planning/util/whatIf.util";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";

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
 * Opening the What-if price sensitivity view: the base plan plus one
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

describe("what-if price sensitivity", () => {
	for (const [name, factory] of plans) {
		const input = { plan: factory(), empire: undefined, cxUuid: undefined };
		bench(name, () => {
			priceSensitivity(input, ctx);
		});
	}
});
