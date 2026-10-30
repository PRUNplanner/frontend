import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { createPriceBook } from "@/features/cx/priceBook";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";

// Util
import {
	calculateMaterialCOGMs,
	priceMaterials,
	toPlanBase,
} from "@/features/exchanges/exchangePlanData.util";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IExchangePlanBase } from "@/features/exchanges/useExchangePlanData.types";

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

const PLANET = "KW-688c";

const cx: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "AI1_7D" }],
	cx_planets: [
		{
			planet: PLANET,
			preferences: [
				{ type: "BUY", exchange: "NC1_ASK" },
				{ type: "SELL", exchange: "IC1_BID" },
			],
		},
	],
	ticker_empire: [{ type: "BOTH", ticker: "H2O", value: 0 }],
	ticker_planets: [
		{
			planet: PLANET,
			preferences: [{ type: "BUY", ticker: "DW", value: 50 }],
		},
	],
};

describe("exchange plan data", () => {
	let ctx: IPlanContext;
	let book: (planet: string) => ReturnType<typeof createPriceBook>;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), PLANET, undefined);
		const { getExchangeTickerLoaded } = useExchangeData();
		book = (planet) =>
			createPriceBook(() => cx, planet, getExchangeTickerLoaded);
	});

	const base = (plan = etherwindPlan()) =>
		toPlanBase(
			{
				planUuid: plan.uuid,
				planName: "Etherwind",
				planet: PLANET,
				empireUuid: undefined,
				linked: true,
			},
			// price-free: calculated with Universe prices
			calculatePlan({ plan, empire: undefined, cxUuid: undefined }, ctx)
		);

	it("re-priced Material I/O matches a full calculation", () => {
		const full = calculatePlan(
			{ plan: etherwindPlan(), empire: undefined, cxUuid: "cx" },
			{ ...ctx, prices: book(PLANET) }
		).result.materialio.filter((m) => m.delta !== 0);
		const rows = priceMaterials([base()], book);

		expect(rows.map((r) => r.ticker).sort()).toEqual(
			full.map((m) => m.ticker).sort()
		);
		for (const m of full) {
			const row = rows.find((r) => r.ticker === m.ticker)!;
			const side = m.delta < 0 ? row.buy! : row.sell!;
			expect(side.planets[0].price * m.delta).toBeCloseTo(m.price, 6);
		}
	});

	it("re-priced COGM matches a full calculation", () => {
		for (const plan of [etherwindPlan(), largePlan()]) {
			const full = calculatePlan(
				{ plan, empire: undefined, cxUuid: "cx" },
				{ ...ctx, prices: book(PLANET) }
			).result;
			const cogms = calculateMaterialCOGMs([base(plan)], book);

			const expected = new Map<string, number>();
			for (const b of full.production.buildings)
				for (const ar of b.activeRecipes)
					for (const o of ar.cogm!.outputCOGM)
						if (Number.isFinite(o.costTotal))
							expected.set(
								o.ticker,
								Math.min(
									expected.get(o.ticker) ?? Infinity,
									o.costTotal
								)
							);

			expect([...cogms.keys()].sort()).toEqual(
				[...expected.keys()].sort()
			);
			for (const [ticker, value] of expected)
				expect(cogms.get(ticker)!.value).toBeCloseTo(value, 9);
		}
	});

	it("aggregates planets: ranges, varies and the lowest COGM", () => {
		const one = base();
		const other: IExchangePlanBase = {
			...one,
			planUuid: "other",
			planName: "Other",
			planet: "OT-580b",
		};
		const rows = priceMaterials([one, other], book);
		const dw = rows.find((r) => r.ticker === "DW");
		expect(dw?.planets.sort()).toEqual(["KW-688c", "OT-580b"]);
		// DW is fixed on KW-688c only, AI1 elsewhere
		if (dw?.buy) {
			expect(dw.buy.varies).toBe(true);
			expect(dw.buy.min).toBeLessThanOrEqual(dw.buy.max);
		}
		// a material bought on one planet only doesn't vary
		const same = rows.find(
			(r) => r.buy && r.buy.planets.length === 2 && !r.buy.varies
		);
		if (same) expect(same.buy!.min).toBe(same.buy!.max);

		const cogms = calculateMaterialCOGMs([one, other], book);
		for (const c of cogms.values()) {
			expect(c.value).toBe(Math.min(...c.entries.map((e) => e.value)));
			expect(new Set(c.entries.map((e) => e.planUuid)).size).toBe(2);
		}
	});
});
