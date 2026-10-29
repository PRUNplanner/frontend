import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Util
import { profitBreakdown } from "@/features/planning/util/profitBreakdown.util";

// Types & Interfaces
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IOverviewData } from "@/features/planning/usePlanCalculation.types";
import type { IProfitBreakdown } from "@/features/planning/util/profitBreakdown.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	building,
	etherwindPlan,
	io,
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

/** a priced material i/o row: delta per day at a unit price */
/** price is per unit, the row carries delta × price */
const mio = (ticker: string, delta: number, price: number) =>
	io(ticker, delta, { price: delta * price });

function overview(profit: number, degradation: number): IOverviewData {
	return {
		dailyCost: 0,
		dailyProfit: 0,
		totalConstructionCost: degradation * 180,
		dailyDegradationCost: degradation,
		profit,
		roi: 0,
	};
}

const sumSteps = (b: IProfitBreakdown) =>
	b.output - b.inputs - b.workforce - b.degradation;

// Montem iron, the spec's mockup: 51,717 − 15,729 − 13,092 − 3,583 = 19,313
const MONTEM_WORKFORCE = [
	mio("RAT", -1, 6992),
	mio("DW", -1, 4500),
	mio("OVE", -1, 400),
	mio("PWO", -1, 300),
	mio("COF", -1, 300),
	mio("KOM", -1, 300),
	mio("EXO", -1, 300),
];
const MONTEM_IO = [
	mio("FE", 1, 47417),
	mio("LST", 1, 2700),
	mio("FLX", 1, 1600),
	mio("C", -1, 13400),
	mio("FEO", -1, 2029),
	mio("O", -1, 300),
	...MONTEM_WORKFORCE,
];

describe("profitBreakdown", () => {
	it("splits the Montem iron plan into steps that add up to its profit", () => {
		const b = profitBreakdown(
			MONTEM_IO,
			MONTEM_WORKFORCE,
			[],
			overview(19313, 3583)
		);

		expect(b.output).toBe(51717);
		expect(b.inputs).toBe(15729);
		expect(b.workforce).toBe(13092);
		expect(b.degradation).toBe(3583);
		expect(b.profit).toBe(19313);
		expect(sumSteps(b)).toBeCloseTo(b.profit, 2);

		expect(b.outputItems.map((i) => i.key)).toEqual(["FE", "LST", "FLX"]);
		expect(b.inputItems.map((i) => i.key)).toEqual(["C", "FEO", "O"]);
		expect(b.workforceItems[0]).toEqual({
			key: "RAT",
			value: 6992,
			amount: 1,
			price: 6992,
		});
	});

	it("nets a material made and used here, and gives a shortfall to workforce first", () => {
		const b = profitBreakdown(
			[
				// made 10, used 4 in production: only the surplus is output
				mio("C", 6, 100),
				// combined shortfall 10, workers eat 6: 6 workforce, 4 inputs
				mio("RAT", -10, 50),
				// workers drink 8, the plan makes 5: the shortfall of 3 is workforce
				mio("DW", -3, 20),
			],
			[mio("RAT", -6, 50), mio("DW", -8, 20)],
			[],
			overview(600 - 500 - 60 - 10, 10)
		);

		expect(b.outputItems).toEqual([
			{ key: "C", value: 600, amount: 6, price: 100 },
		]);
		expect(b.workforceItems).toEqual([
			{ key: "RAT", value: 300, amount: 6, price: 50 },
			{ key: "DW", value: 60, amount: 3, price: 20 },
		]);
		expect(b.inputItems).toEqual([
			{ key: "RAT", value: 200, amount: 4, price: 50 },
		]);
		expect(sumSteps(b)).toBeCloseTo(b.profit, 2);
	});

	it("keeps a loss negative", () => {
		const b = profitBreakdown(
			[mio("FE", 1, 100), mio("C", -1, 300)],
			[],
			[],
			overview(-250, 50)
		);

		expect(b.profit).toBe(-250);
		expect(sumSteps(b)).toBeCloseTo(-250, 2);
	});

	it("adds each building's degradation back and leaves the rest unattributed", () => {
		// constructionCost is a negative value: 1,800 ¢ over 180 d is 10 ¢/day each
		const b = profitBreakdown(
			[],
			[],
			[
				building("SME", {
					dailyRevenue: 90,
					constructionCost: -1800,
					amount: 2,
				}),
				building("EXT", { dailyRevenue: 290, constructionCost: -1800 }),
			],
			overview(330, 30)
		);

		expect(b.buildings).toEqual([
			{ key: "EXT", value: 300 },
			{ key: "SME", value: 110 },
		]);
		// 300 + 110 − 30 = 380, the plan says 330
		expect(b.unattributed).toBeCloseTo(-50, 6);
	});

	describe("on the real engine", () => {
		let ctx: IPlanContext;

		beforeAll(async () => {
			await setupPlanningTestData();
			const { loadGameData, createContext } = usePlanContext();
			ctx = await createContext(
				await loadGameData(),
				"KW-688c",
				undefined
			);
		});

		it.each([
			["etherwind", etherwindPlan],
			["large", largePlan],
		])("both modes end at the Overview profit (%s)", (_name, plan) => {
			const { result, overview: o } = calculatePlan(
				{ plan: plan(), empire: undefined, cxUuid: undefined },
				ctx
			);
			const b = profitBreakdown(
				result.materialio,
				result.workforceMaterialIO,
				result.production.buildings,
				o
			);

			expect(b.output).toBeGreaterThan(0);
			expect(Math.abs(sumSteps(b) - o.profit)).toBeLessThan(0.01);
			const byBuilding =
				b.buildings.reduce((s, i) => s + i.value, 0) -
				b.degradation +
				b.unattributed;
			expect(Math.abs(byBuilding - o.profit)).toBeLessThan(0.01);
		});
	});
});
