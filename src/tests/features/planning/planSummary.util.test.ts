import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { usePlanContext } from "@/features/planning/usePlanContext";

// Util
import { buildPlanSummary } from "@/features/planning/planSummary.util";

// Schemas
import { PlanSummarySchema } from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanContext,
} from "@/features/planning/engine/engine.types";
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";
import {
	type IMaterialIO,
	planEmptyResult,
} from "@/features/planning/usePlanCalculation.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	emptyPlan,
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

const source = (s: Partial<IPriceSource>): IPriceSource => ({
	level: "empire_exchange",
	exchange: "CI1",
	key: "vwap_30d",
	zero: false,
	volume: "CI1",
	...s,
});

function prices(s: Partial<IPriceSource> = {}): IPriceBook {
	return {
		getPrice: () => 1,
		getPriceSource: vi.fn(() => source(s)),
	};
}

const io = (ticker: string, delta: number, price: number): IMaterialIO =>
	({ ticker, delta, price }) as IMaterialIO;

function calculation(
	materialio: IMaterialIO[],
	overview: Partial<IPlanCalculation["overview"]> = {}
): IPlanCalculation {
	return {
		result: {
			...planEmptyResult,
			cogc: "METALLURGY",
			area: { permits: 1, areaUsed: 412, areaTotal: 500, areaLeft: 88 },
			materialio,
		},
		overview: {
			dailyCost: 100,
			dailyProfit: 1000,
			totalConstructionCost: 45000,
			dailyDegradationCost: 20,
			dailyProductionFeeCost: 30,
			profit: 850,
			roi: 45000 / 850,
			...overview,
		},
	};
}

describe("buildPlanSummary", () => {
	it("takes the overview's numbers and the top four sold outputs", () => {
		const book = prices();
		const summary = buildPlanSummary(
			calculation([
				io("C", -5, -50),
				io("FE", 10, 300),
				io("LST", 2, 900),
				io("O", 1, 5),
				io("SI", 3, 100),
				io("AL", 1, 50),
			]),
			book
		);

		expect(summary).toStrictEqual({
			v: 1,
			profit: 850,
			revenue: 1000,
			cost: 150,
			payback_days: 45000 / 850,
			plan_cost: 45000,
			area_used: 412,
			area_total: 500,
			outputs: [
				{ ticker: "LST", per_day: 2 },
				{ ticker: "FE", per_day: 10 },
				{ ticker: "SI", per_day: 3 },
				{ ticker: "AL", per_day: 1 },
			],
			price_basis: "CI1_30D",
			cogc: "METALLURGY",
		});
		expect(book.getPriceSource).toHaveBeenCalledWith("LST", "SELL");
		expect(PlanSummarySchema.parse(summary)).toStrictEqual(summary);
	});

	it("has no payback without profit", () => {
		const summary = buildPlanSummary(
			calculation([io("FE", 1, 10)], { profit: -5, roi: -9000 }),
			prices()
		);
		expect(summary.payback_days).toBeNull();

		const zero = buildPlanSummary(
			calculation([], { profit: 0, roi: Infinity }),
			prices()
		);
		expect(zero.payback_days).toBeNull();
		expect(zero.outputs).toStrictEqual([]);
		// nothing to price
		expect(zero.price_basis).toBeNull();
	});

	it("prices an input-only plan with the input's buy basis", () => {
		const book = prices({ exchange: "UNIVERSE", key: "vwap_7d" });
		const summary = buildPlanSummary(
			calculation([io("C", -5, -50)], { profit: -50 }),
			book
		);
		expect(summary.price_basis).toBe("UNIVERSE_7D");
		expect(book.getPriceSource).toHaveBeenCalledWith("C", "BUY");
	});

	it.each([
		[{ level: "planet_ticker" as const }, "CUSTOM"],
		[{ level: "empire_ticker" as const }, "CUSTOM"],
		[{ exchange: "AI1" as const, key: "ask" as const }, "AI1_ASK"],
		[{ exchange: "NC1" as const, key: "bid" as const }, "NC1_BID"],
		[{ exchange: "UNIVERSE" as const, key: "ask" as const }, null],
		[{ level: "unresolved" as const, exchange: null, key: null }, null],
	])("price basis %o is %s", (s, code) => {
		expect(
			buildPlanSummary(calculation([io("FE", 1, 1)]), prices(s))
				.price_basis
		).toBe(code);
	});

	it("leaves out a missing COGC and non-finite numbers", () => {
		const calc = calculation([io("FE", 1, 1)], {
			profit: NaN,
			totalConstructionCost: Infinity,
		});
		calc.result.cogc = "---";
		const summary = buildPlanSummary(calc, prices());

		expect(summary.cogc).toBeNull();
		expect(summary.profit).toBe(0);
		expect(summary.plan_cost).toBe(0);
		expect(summary.payback_days).toBeNull();
	});
});

describe("buildPlanSummary with the engine", () => {
	let ctx: IPlanContext;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), "KW-688c", undefined);
	});

	it.each([
		["etherwind", etherwindPlan, /^(UNIVERSE|AI1|CI1|IC1|NC1)_/],
		["empty", emptyPlan, null],
	])(
		"%s plan: the overview's profit and a valid summary",
		(_, plan, basis) => {
			const calc = calculatePlan(
				{ plan: plan(), empire: undefined, cxUuid: undefined },
				ctx
			);
			const summary = buildPlanSummary(calc, ctx.prices);

			expect(PlanSummarySchema.safeParse(summary).success).toBe(true);
			expect(summary.profit).toBe(calc.overview.profit);
			expect(summary.area_used).toBe(
				Math.round(calc.result.area.areaUsed)
			);
			expect(summary.outputs.length).toBeLessThanOrEqual(4);
			if (basis) expect(summary.price_basis).toMatch(basis);
			else expect(summary.price_basis).toBeNull();
		}
	);
});
