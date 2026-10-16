import { describe, it, expect, beforeAll, vi } from "vitest";

// Engine
import { createPriceBook } from "@/features/cx/priceBook";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { usePlanContext } from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPlanContext } from "@/features/planning/engine/engine.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import cx_list from "@/tests/test_data/api_data_cx_list.json";
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

/*
 * Price regression guard for the Exchanges redesign: records every price,
 * source, Material I/O price, profit and COGM the price book and the plan
 * engine give today for fixed plans and CX data. Any change to how prices
 * are calculated breaks the snapshot. Never update the snapshot to make it
 * pass.
 */

const PLANET = "KW-688c";

const empty: CXData = {
	cx_empire: [],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

const CX_SETS: Record<string, CXData | undefined> = {
	universe: undefined,
	...Object.fromEntries(
		(cx_list as { cx_name: string; cx_data: CXData }[]).map((c) => [
			`fixture:${c.cx_name}`,
			c.cx_data,
		])
	),
	// exchange gaps: materials without asks or bids price at 0
	trade_now_nc1: {
		...empty,
		cx_empire: [
			{ type: "BUY", exchange: "NC1_ASK" },
			{ type: "SELL", exchange: "NC1_BID" },
		],
	},
	trade_now_ic1: {
		...empty,
		cx_empire: [
			{ type: "BUY", exchange: "IC1_ASK" },
			{ type: "SELL", exchange: "IC1_BID" },
		],
	},
	// only a BUY rule: SELL falls back to Universe VWAP 30D
	buy_only: {
		...empty,
		cx_empire: [{ type: "BUY", exchange: "CI1_30D" }],
	},
	// planet rules over all-planets rules, fixed 0, BOTH / BUY / SELL mix
	planet_overrides: {
		cx_empire: [{ type: "BOTH", exchange: "AI1_7D" }],
		cx_planets: [
			{
				planet: PLANET,
				preferences: [
					{ type: "BUY", exchange: "NC1_30D" },
					{ type: "SELL", exchange: "IC1_BID" },
				],
			},
			{
				planet: "OT-580b",
				preferences: [{ type: "BOTH", exchange: "CI1_ASK" }],
			},
		],
		ticker_empire: [
			{ type: "BOTH", ticker: "H2O", value: 0 },
			{ type: "BUY", ticker: "RAT", value: 75 },
			{ type: "SELL", ticker: "RAT", value: 120 },
			{ type: "BOTH", ticker: "DW", value: 90 },
		],
		ticker_planets: [
			{
				planet: PLANET,
				preferences: [
					{ type: "BUY", ticker: "DW", value: 0 },
					{ type: "BOTH", ticker: "OVE", value: 55.5 },
				],
			},
		],
	},
};

// materials with exchange data plus one without (unresolved)
const EXTRA_TICKERS = ["RAT", "DW", "H2O", "OVE", "FE", "NUT", "ZZZ"];

const round = (v: number) => Math.round(v * 1e6) / 1e6;

describe("price regression guard", () => {
	let ctx: IPlanContext;
	let getExchange: (id: string) => ReturnType<
		ReturnType<typeof useExchangeData>["getExchangeTickerLoaded"]
	>;

	beforeAll(async () => {
		await setupPlanningTestData();
		const { loadGameData, createContext } = usePlanContext();
		ctx = await createContext(await loadGameData(), PLANET, undefined);
		getExchange = useExchangeData().getExchangeTickerLoaded;
	});

	it("keeps every price, source, profit and COGM", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const plans = { etherwind: etherwindPlan(), large: largePlan() };
		const record: Record<string, unknown> = {};

		for (const [name, cxData] of Object.entries(CX_SETS)) {
			const book = () =>
				createPriceBook(
					cxData ? () => cxData : undefined,
					PLANET,
					getExchange
				);

			const planRecords: Record<string, unknown> = {};
			const tickers = new Set(EXTRA_TICKERS);

			for (const [planName, plan] of Object.entries(plans)) {
				const { result } = calculatePlan(
					{
						plan,
						empire: undefined,
						cxUuid: cxData ? "cx" : undefined,
						recipeOptions: false,
					},
					{ ...ctx, prices: book() }
				);
				result.materialio.forEach((m) => tickers.add(m.ticker));

				planRecords[planName] = {
					profit: round(result.profit),
					cost: round(result.cost),
					revenue: round(result.revenue),
					materialio: result.materialio.map(
						(m) => `${m.ticker} ${round(m.delta)} ${round(m.price)}`
					),
					cogm: result.production.buildings.flatMap((b) =>
						b.activeRecipes.map((ar) =>
							[
								ar.recipeId,
								...ar.cogm!.inputCost.map(
									(i) => `${i.ticker}@${round(i.costUnit)}`
								),
								`wf ${round(ar.cogm!.workforceCost)}`,
								`total ${round(ar.cogm!.totalCost)}`,
								...ar.cogm!.outputCOGM.map(
									(o) =>
										`${o.ticker} ${round(o.costSplit)} ${round(o.costTotal)}`
								),
							].join(" | ")
						)
					),
				};
			}

			const prices = book();
			record[name] = {
				prices: [...tickers].sort().flatMap((ticker) =>
					(["BUY", "SELL"] as const).map((type) => {
						const s = prices.getPriceSource(ticker, type);
						return [
							ticker,
							type,
							round(prices.getPrice(ticker, type)),
							s.level,
							s.exchange,
							s.key,
							s.zero,
							s.volume,
						].join(" ");
					})
				),
				plans: planRecords,
			};
		}
		error.mockRestore();

		await expect(JSON.stringify(record, null, 1)).toMatchFileSnapshot(
			"./__snapshots__/priceRegression.snap.json"
		);
	});
});
