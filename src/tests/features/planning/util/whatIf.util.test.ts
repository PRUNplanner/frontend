import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { usePlanContext } from "@/features/planning/usePlanContext";

// Util
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import {
	breakEven,
	calculateScaled,
	compareRows,
	compareVerdict,
	materialChanges,
	priceSensitivity,
	sensitivityRows,
} from "@/features/planning/util/whatIf.util";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanContext,
} from "@/features/planning/engine/engine.types";
import type {
	IMaterialIO,
	IOverviewData,
} from "@/features/planning/usePlanCalculation.types";

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

describe("whatIf on the real engine", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	const run = (plan = etherwindPlan()) =>
		calculatePlan(
			{
				plan,
				empire: undefined,
				cxUuid: undefined,
				recipeOptions: false,
			},
			ctx
		);

	it("an unchanged copy differs nowhere and reads the same", () => {
		const a = run();
		const b = run();
		const rows = compareRows(a, b);

		expect(rows.every((r) => r.delta === 0)).toBe(true);
		expect(materialChanges(a, b)).toEqual([]);
		expect(compareVerdict(rows, [], "copy", t)).toBe("same");
	});

	it("one more building shows up in the figures and the materials", () => {
		const plan = etherwindPlan();
		plan.plan_data.buildings[0].amount += 1;
		const a = run();
		const b = run(plan);

		const area = compareRows(a, b).find((r) => r.key === "area")!;
		expect(area.delta).toBeGreaterThan(0);
		expect(materialChanges(a, b).length).toBeGreaterThan(0);
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
					calculateScaled(input, ctx, row.ticker, factor).result
						.profit
				)
			).toBeLessThan(0.01);
		}
	});
});

/** a calculation with just the figures the comparison reads */
function calc(
	overview: Partial<IOverviewData>,
	area: number,
	materialio: IMaterialIO[] = []
): IPlanCalculation {
	return {
		overview: {
			dailyCost: 0,
			dailyProfit: 0,
			totalConstructionCost: 0,
			dailyDegradationCost: 0,
			profit: 0,
			roi: 0,
			...overview,
		},
		result: { area: { areaUsed: area }, materialio },
	} as unknown as IPlanCalculation;
}

// the spec's mockup: Montem iron and Montem iron · 7 SME
const MONTEM = calc(
	{
		profit: 19313,
		dailyProfit: 51717,
		dailyCost: 28821,
		dailyDegradationCost: 3583,
		totalConstructionCost: 1231984,
		roi: 63.79,
	},
	404
);
const SME7 = calc(
	{
		profit: 18650,
		dailyProfit: 59623,
		dailyCost: 36878,
		dailyDegradationCost: 4095,
		totalConstructionCost: 1283238,
		roi: 68.81,
	},
	421
);

// i18n stand-in: the key's last part and its params
const t = (key: string, params?: Record<string, string | number>) =>
	`${key.split(".").pop()}${params ? JSON.stringify(params) : ""}`;

describe("compareRows", () => {
	const byKey = (a: IPlanCalculation, b: IPlanCalculation) =>
		Object.fromEntries(compareRows(a, b).map((r) => [r.key, r]));

	it("gives other minus this, coloured by what is better for you", () => {
		const rows = byKey(MONTEM, SME7);

		expect(rows.profit).toMatchObject({ delta: -663, better: false });
		expect(rows.output).toMatchObject({ delta: 7906, better: true });
		expect(rows.cost).toMatchObject({ delta: 8057, better: false });
		expect(rows.degradation).toMatchObject({ delta: 512, better: false });
		expect(rows.planCost).toMatchObject({ delta: 51254, better: false });
		expect(rows.roi.delta).toBeCloseTo(5.02);
		expect(rows.roi.better).toBe(false);
		expect(rows.profitArea.delta).toBeCloseTo(44.3 - 47.8, 1);
		expect(rows.profitArea.better).toBe(false);
		// area is neutral either way
		expect(rows.area).toMatchObject({ delta: 17, better: undefined });
	});

	it("flips every colour the other way round, area stays neutral", () => {
		const rows = byKey(SME7, MONTEM);

		expect(rows.profit.better).toBe(true);
		expect(rows.output.better).toBe(false);
		expect(rows.cost.better).toBe(true);
		expect(rows.degradation.better).toBe(true);
		expect(rows.planCost.better).toBe(true);
		expect(rows.roi.better).toBe(true);
		expect(rows.profitArea.better).toBe(true);
		expect(rows.area.better).toBeUndefined();
	});

	it("counts a payback that never happens as the worst", () => {
		const never = calc({ profit: -10, roi: -500 }, 10);
		const rows = byKey(MONTEM, never);
		expect(rows.roi.better).toBe(false);
		expect(rows.roi.delta).toBe(Infinity);
		expect(byKey(never, MONTEM).roi.better).toBe(true);
		// both never: equal
		expect(byKey(never, never).roi).toMatchObject({
			delta: 0,
			better: undefined,
		});
	});

	it("reads tiny differences and no area as 0", () => {
		const rows = byKey(
			calc({ profit: 100.001 }, 0),
			calc({ profit: 100.003 }, 0)
		);
		expect(rows.profit).toMatchObject({ delta: 0, better: undefined });
		expect(rows.profitArea).toMatchObject({ a: 0, b: 0, delta: 0 });
	});
});

describe("materialChanges", () => {
	it("gives ȼ/day other minus this per material, by size", () => {
		const changes = materialChanges(
			calc({}, 0, [mio("FE", 1, 100), mio("C", -1, 50), mio("O", -1, 5)]),
			calc({}, 0, [mio("FE", 2, 100), mio("C", -3, 50), mio("O", -1, 5)])
		);
		expect(changes).toEqual([
			{ ticker: "FE", a: 100, b: 200, delta: 100 },
			{ ticker: "C", a: -50, b: -150, delta: -100 },
		]);
	});

	it("includes materials only one plan has", () => {
		const changes = materialChanges(
			calc({}, 0, [mio("FE", 1, 100)]),
			calc({}, 0, [mio("FEO", -2, 10)])
		);
		expect(changes.map((c) => [c.ticker, c.delta])).toEqual([
			["FE", -100],
			["FEO", -20],
		]);
	});
});

describe("compareVerdict", () => {
	it("says both plans are the same when nothing differs", () => {
		expect(compareVerdict(compareRows(MONTEM, MONTEM), [], "B", t)).toBe(
			"same"
		);
	});

	it("names profit, payback, the top gain and the top two costs", () => {
		const changes = [
			{ ticker: "FE", a: 0, b: 7906, delta: 7906 },
			{ ticker: "FEO", a: 0, b: -3320, delta: -3320 },
			{ ticker: "C", a: 0, b: -2233, delta: -2233 },
			{ ticker: "RAT", a: 0, b: -1165, delta: -1165 },
		];
		const text = compareVerdict(
			compareRows(MONTEM, SME7),
			changes,
			"7 SME",
			t
		);
		expect(text).toBe(
			[
				'earns_more{"value":"663"}',
				'sooner{"days":"5.0"}',
				'trade{"name":"7 SME","gain":"7.9k","ticker":"FE","cost":"5.6k","tickers":"and{\\"a\\":\\"FEO\\",\\"b\\":\\"C\\"}"}',
			].join(" ")
		);
	});

	it("speaks from this plan's side when the other one is better", () => {
		const text = compareVerdict(
			compareRows(SME7, MONTEM),
			[{ ticker: "C", a: 0, b: -100, delta: -100 }],
			"Montem iron",
			t
		);
		expect(text).toContain('earns_less{"value":"663"}');
		expect(text).toContain('later{"days":"5.0"}');
		expect(text).toContain(
			'cost{"name":"Montem iron","cost":"100","tickers":"C"}'
		);
	});

	it("holds when the other plan is the smaller one", () => {
		const changes = [
			{ ticker: "FE", a: 7906, b: 0, delta: -7906 },
			{ ticker: "FEO", a: -3320, b: 0, delta: 3320 },
			{ ticker: "C", a: -2233, b: 0, delta: 2233 },
		];
		const text = compareVerdict(
			compareRows(SME7, MONTEM),
			changes,
			"Montem iron",
			t
		);
		expect(text).toContain(
			'trade{"name":"Montem iron","gain":"3.3k","ticker":"FEO","cost":"7.9k","tickers":"FE"}'
		);
	});

	it("names a gain alone, and equal profit without a payback change", () => {
		const text = compareVerdict(
			compareRows(MONTEM, MONTEM),
			[{ ticker: "FE", a: 0, b: 50, delta: 50 }],
			"B",
			t
		);
		expect(text).toBe(
			'earns_same gain{"name":"B","gain":"50","ticker":"FE"}'
		);
	});
});
