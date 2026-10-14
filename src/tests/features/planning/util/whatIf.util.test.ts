import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { usePlanContext } from "@/features/planning/usePlanContext";

// Util
import {
	breakEven,
	calculateScaled,
	priceSensitivity,
	sensitivityRows,
} from "@/features/planning/util/whatIf.util";

// Types & Interfaces
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
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
function mio(ticker: string, delta: number, price: number): IMaterialIO {
	return {
		ticker,
		input: Math.max(-delta, 0),
		output: Math.max(delta, 0),
		delta,
		individualWeight: 0,
		individualVolume: 0,
		totalWeight: 0,
		totalVolume: 0,
		price: delta * price,
	};
}

// Montem iron, the spec's mockup (as in profitBreakdown.util.test.ts)
const MONTEM_PROFIT = 19313;
const MONTEM_IO = [
	mio("FE", 1, 47417),
	mio("LST", 1, 2700),
	mio("FLX", 1, 1600),
	mio("C", -1, 13400),
	mio("FEO", -1, 2029),
	mio("O", -1, 300),
	mio("RAT", -1, 6992),
	mio("DW", -1, 4500),
	mio("OVE", -1, 400),
];
// without degradation of these materials, a price's slope is its i/o value
const linearSlopes = (io: IMaterialIO[]) =>
	new Map(io.map((m) => [m.ticker, m.price]));

describe("breakEven", () => {
	it("is the price change at which profit is 0", () => {
		expect(breakEven(100, 400)).toBe(-25);
		expect(breakEven(100, -50)).toBe(200);
	});

	it("is never when a sold material's price would have to fall below 0", () => {
		expect(breakEven(500, 400)).toBe("never");
		expect(breakEven(100, 0)).toBe("never");
	});

	it("caps a rise beyond +500 %", () => {
		expect(breakEven(100, -10)).toBe("over");
		expect(breakEven(100, -20)).toBe(500);
	});

	it("tells a loss plan how far a price must move to break even", () => {
		expect(breakEven(-100, 400)).toBe(25);
		expect(breakEven(-100, -400)).toBe(-25);
	});
});

describe("sensitivityRows", () => {
	it("gives the Montem iron numbers at ±20 %", () => {
		const rows = sensitivityRows(
			MONTEM_IO,
			linearSlopes(MONTEM_IO),
			MONTEM_PROFIT
		);
		const fe = rows.find((r) => r.ticker === "FE")!;
		const c = rows.find((r) => r.ticker === "C")!;

		expect(fe.side).toBe("sell");
		expect(Math.round(Math.abs(fe.slope) * 0.2)).toBe(9483);
		expect((fe.breakEven as number).toFixed(1)).toBe("-40.7");

		expect(c.side).toBe("buy");
		expect(Math.round(Math.abs(c.slope) * 0.2)).toBe(2680);
		expect(Math.round(c.breakEven as number)).toBe(144);

		expect(rows.find((r) => r.ticker === "LST")!.breakEven).toBe("never");
		expect(rows.find((r) => r.ticker === "OVE")!.breakEven).toBe("over");
	});

	it("sorts by impact and leaves out materials that don't move profit", () => {
		const rows = sensitivityRows(
			[mio("A", 1, 10), mio("B", -1, 30), mio("Z", 0, 99)],
			new Map([
				["A", 10],
				["B", -30],
				["Z", 0],
			]),
			100
		);
		expect(rows.map((r) => r.ticker)).toEqual(["B", "A"]);
	});
});

describe("priceSensitivity on the real engine", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	it("a scaled recalculation equals the linear figure for every material", () => {
		const input = {
			plan: etherwindPlan(),
			empire: undefined,
			cxUuid: undefined,
		};
		const { result, rows } = priceSensitivity(input, ctx);
		expect(rows.length).toBeGreaterThan(3);

		for (const row of rows)
			for (const pct of [-0.5, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.5]) {
				const scaled = calculateScaled(input, ctx, row.ticker, 1 + pct)
					.result.profit;
				expect(
					Math.abs(scaled - (result.profit + row.slope * pct))
				).toBeLessThan(0.01);
			}
	});

	it("a full recalculation at the break-even price makes 0 profit", () => {
		const input = {
			plan: etherwindPlan(),
			empire: undefined,
			cxUuid: undefined,
		};
		const numeric = priceSensitivity(input, ctx).rows.filter(
			(r) => typeof r.breakEven === "number"
		);
		expect(numeric.length).toBeGreaterThan(0);

		for (const row of numeric) {
			const factor = 1 + (row.breakEven as number) / 100;
			expect(
				Math.abs(
					calculateScaled(input, ctx, row.ticker, factor).result.profit
				)
			).toBeLessThan(0.01);
		}
	});
});
