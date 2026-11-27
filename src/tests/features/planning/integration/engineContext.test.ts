import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan, type IPlanContext } from "@prunplanner/engine";
import { usePlanContext } from "@/features/planning/usePlanContext";

// test data
import planet_etherwind from "@prunplanner/test-data/api_data_planet_etherwind.json";
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { golden } from "@prunplanner/test-data/golden";
import { goldenPlans } from "../../../../../packages/engine/tests/fixtures/context";

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
 * Cross-check: the engine package's Node golden plans, calculated through
 * the app's usePlanContext (IndexedDB, stores), give exactly the package's
 * snapshots. So the package's plain-Node fixture context is the app's.
 */
describe("engine context: app equals package fixture", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	// Vitest runs in development mode; production builds get {} (devWarn)
	it("passes console.warn as the engine's warn in development", () => {
		expect(ctx.warn).toBe(console.warn);
	});

	it.each(Object.entries(goldenPlans()))("%s", async (name, input) => {
		await expect(golden(calculatePlan(input, ctx))).toMatchFileSnapshot(
			`../../../../../packages/engine/tests/__snapshots__/calculatePlan.${name}.golden.json`
		);
	});
});
