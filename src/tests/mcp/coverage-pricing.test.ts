// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { PLANNED_NOTE } from "@/mcp/gameData";
import {
	API_KEY,
	EMPIRE_UUID,
	PLAN_UUID,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

// "RFab Plan": an empire without a CX preference
const NO_CX_EMPIRE = "2eac235a-9f8d-4994-8c71-933c31127423";
const UNKNOWN = "00000000-0000-4000-8000-000000000000";
const PLANNED: [RegExp, unknown] = [
	/^\/analytics\/planning_insights\/materials\/$/,
	[
		["RAT", 120, 40, 80],
		["DW", 300, 100, 200],
	],
];

let backend: IFakeBackend;
let env: IToolEnv;

function setup(routes: [RegExp, unknown][] = [], status?: number) {
	backend = fakeBackend(status, [...routes, PLANNED]);
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
}

const call = (name: string, args: Record<string, unknown> = {}) => {
	const tool = TOOLS.find((t) => t.name === name)!;
	return tool.run(tool.inputSchema.parse(args) as never, env) as Promise<{
		text: string;
		data: any;
	}>;
};
const run = (name: string, args: Record<string, unknown> = {}) =>
	call(name, args).then((r) => r.data);

beforeEach(() => setup());

describe("check_plan_market", () => {
	it("without a CX preference ask and bid can't be checked", async () => {
		const { text, data } = await call("check_plan_market", {
			plan_uuid: PLAN_UUID,
			empire_uuid: NO_CX_EMPIRE,
		});
		expect(data.price_basis.cx_preference).toBeNull();
		expect(data.at_ask_bid).toEqual({
			note: expect.stringContaining("No exchange to check"),
		});
		expect(data.profit_at).toBeUndefined();
		expect(data.variant).toBeUndefined();
		expect(text).not.toContain("at ask/bid");
		for (const m of data.materials) {
			expect(m.exchange).toBe("UNIVERSE");
			expect([m.ask, m.bid, m.spread_pct]).toEqual([null, null, null]);
		}
	});

	it("an exchange basis checks ask and bid on that exchange", async () => {
		const { text, data } = await call("check_plan_market", {
			plan_uuid: PLAN_UUID,
			empire_uuid: NO_CX_EMPIRE,
			price_basis: "NC1_ASKBID",
			variant: { permits: 2 },
		});
		expect(data.variant).toBe(true);
		expect(data.at_ask_bid.exchange_checked).toBe(true);
		expect(text).toContain("(variant)");
		expect(text).toContain("at ask/bid");
		const nc1 = data.materials.filter(
			(m: { exchange: string }) => m.exchange === "NC1"
		);
		expect(nc1.length).toBeGreaterThan(0);
		for (const m of nc1) {
			expect(m.ask).toEqual(expect.any(Number));
			expect(m.bid).toEqual(expect.any(Number));
		}
	});

	it("target: an input's price, an unreachable target, a material not traded", async () => {
		const base = await run("check_plan_market", { plan_uuid: PLAN_UUID });
		const bought = base.profit_range.materials.find(
			(m: { side: string }) => m.side === "buy"
		);
		const cheaper = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			target: {
				ticker: bought.ticker.toLowerCase(),
				daily_profit: base.profit_per_day + 100,
			},
		});
		expect(cheaper.target).toMatchObject({
			ticker: bought.ticker,
			side: "buy",
		});
		expect(cheaper.target.change_pct).toBeLessThan(0);
		expect(cheaper.target.note).toBeUndefined();

		const never = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			target: { ticker: bought.ticker, daily_profit: 1e12 },
		});
		expect(never.target).toMatchObject({
			price_needed: null,
			change_pct: null,
			note: "No price of this material reaches the target.",
		});

		await expect(
			run("check_plan_market", {
				plan_uuid: PLAN_UUID,
				target: { ticker: "AAR", daily_profit: 1 },
			})
		).rejects.toThrow("AAR doesn't move this plan's profit");
	});

	it("a small base breaks even within the range", async () => {
		const data = await run("check_plan_market", {
			new_plan: {
				planet_natural_id: "KW-688c",
				buildings: [
					{ ticker: "FP", amount: 2, recipe_id: "FP#10xH2O=>7xDW" },
				],
			},
			range_pct: 50,
		});
		expect(data.plan.uuid).toBeNull();
		expect(data.profit_range.price_move_pct).toBe(50);
		const numbers = data.profit_range.materials.filter(
			(m: { break_even_pct: unknown }) =>
				typeof m.break_even_pct === "number"
		);
		expect(numbers.length).toBeGreaterThan(0);
	});

	it("a base too big for the market is flagged", async () => {
		const { text, data } = await call("check_plan_market", {
			new_plan: {
				planet_natural_id: "KW-688c",
				buildings: [
					{ ticker: "FP", amount: 150, recipe_id: "FP#10xH2O=>7xDW" },
				],
				permits: 3,
			},
			price_basis: "NC1_ASKBID",
		});
		const flagged = data.materials.filter(
			(m: { level: string | null }) => m.level !== null
		);
		expect(flagged.map((m: { ticker: string }) => m.ticker)).toEqual([
			"H2O",
			"DW",
		]);
		const h2o = flagged[0];
		expect(h2o.flags).toEqual(["bigger"]);
		expect(h2o.share_of_daily_volume_pct).toBeGreaterThan(100);
		expect(text).toContain(
			`2 of ${data.materials.length} materials flagged (H2O, DW).`
		);
	});
});

describe("check_make_or_buy", () => {
	/** the empire's plans: one with 10 buildings running one recipe */
	const onePlan = (recipeId: string) => {
		const plan = fixtures.plan;
		setup([
			[
				/^\/planning\/empire\/[^/]+\/plans\/$/,
				[
					{
						...plan,
						empires: undefined,
						plan_data: {
							...plan.plan_data,
							buildings: [
								{
									name: recipeId.split("#")[0],
									amount: 10,
									active_recipes: [
										{ amount: 1, recipeid: recipeId },
									],
								},
							],
						},
					},
				],
			],
		]);
	};

	it("an unknown empire is a tool error", async () => {
		await expect(
			run("check_make_or_buy", { empire_uuid: UNKNOWN })
		).rejects.toThrow(`Unknown empire ${UNKNOWN}.`);
	});

	it("an input that is cheaper to buy", async () => {
		// INC burning HCP: making HCP costs more than buying it
		onePlan("INC#4xHCP=>4xC");
		const { text, data } = await call("check_make_or_buy", {
			empire_uuid: EMPIRE_UUID,
			top: 1,
		});
		expect(data.inputs).toHaveLength(1);
		const hcp = data.inputs[0];
		expect(hcp).toMatchObject({
			ticker: "HCP",
			source_when_making: "made",
			verdict: "cheaper to buy (rough)",
		});
		expect(hcp.rough_saving_per_day).toBeLessThan(0);
		expect(hcp.rough_margin_pct).toBeLessThan(0);
		expect(hcp.planets_with_it).toBeUndefined();
		expect(text).toBe(
			"Sky Productions: 1 biggest inputs; 0 look cheaper to make (rough)."
		);
	});

	it("raw inputs list planets with them; at most 10 by default", async () => {
		// a plan that buys its water: FP turning H2O into DW
		onePlan("FP#10xH2O=>7xDW");
		const { text, data } = await call("check_make_or_buy", {
			empire_uuid: EMPIRE_UUID,
			price_basis: "UNIVERSE_30D",
		});
		expect(data.price_basis.basis).toBe("UNIVERSE_30D");
		expect(data.inputs.length).toBeGreaterThan(0);
		expect(data.inputs.length).toBeLessThanOrEqual(10);
		const h2o = data.inputs.find(
			(r: { ticker: string }) => r.ticker === "H2O"
		);
		expect(h2o.recipe_id).toBeNull();
		expect(h2o.planets_with_it.length).toBeGreaterThan(0);
		for (const p of h2o.planets_with_it)
			expect(p.daily_extraction).toBeGreaterThan(0);
		expect(text).toContain(`${data.inputs.length} biggest inputs`);
	});
});

describe("get_production_cost", () => {
	it("a plan's own production without a loaded empire", async () => {
		setup([
			[
				/^\/planning\/plan\/[^/]+\/$/,
				{
					...fixtures.plan,
					empires: [{ ...fixtures.plan.empires[0], uuid: UNKNOWN }],
				},
			],
		]);
		const data = await run("get_production_cost", {
			ticker: "rat",
			plan_uuid: PLAN_UUID,
		});
		expect(data.own_production.empire).toBeNull();
		expect(data.own_production.note).toContain("couldn't be loaded");
		expect(data.pricing_note).toBeNull();
	});

	it("a plan in a given empire has no note", async () => {
		const data = await run("get_production_cost", {
			ticker: "RAT",
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
			price_basis: "AI1_30D",
		});
		expect(data.own_production.empire).toBe("Sky Productions");
		expect(data.own_production.note).toBeNull();
		expect(data.price_basis.basis).toBe("AI1_30D");
		// another basis than the plan's: the link carries no CX preference
		expect(new URL(data.url).searchParams.has("cx")).toBe(false);
	});

	it("an unknown empire is a tool error", async () => {
		await expect(
			run("get_production_cost", { ticker: "RAT", empire_uuid: UNKNOWN })
		).rejects.toThrow(`Unknown empire ${UNKNOWN}.`);
	});

	it("extracted materials say why", async () => {
		const water = await call("get_production_cost", {
			ticker: "H2O",
			raw_source: "extract",
		});
		expect(water.data.source).toBe("extracted");
		expect(water.data.note).toContain("H2O has no recipe");
		expect(water.data.note).toContain("typical planet");
		expect(water.text).toContain("per unit to extract");

		const onPlanet = await run("get_production_cost", {
			ticker: "SIO",
			raw_source: "extract",
			planet: "Etherwind",
		});
		expect(onPlanet.note).toContain(
			"SIO is cheaper to extract than to make"
		);
		expect(onPlanet.note).not.toContain("typical planet");
	});
});

describe("rank_bases", () => {
	it("another basis, with what players plan per output", async () => {
		const { text, data } = await call("rank_bases", {
			price_basis: "AI1_30D",
			limit: 100,
		});
		expect(data.note).toBe(
			"Priced with price_basis; Base ROI applies no faction bonus."
		);
		expect(data.planned_note).toBe(PLANNED_NOTE);
		const outputs = data.rows.flatMap(
			(r: { outputs: unknown[] }) => r.outputs
		);
		const dw = outputs.find((o: { ticker: string }) => o.ticker === "DW");
		if (dw) expect(dw.planned_by_players_per_day).toBe(300);
		expect(
			outputs.some(
				(o: { ticker: string; planned_by_players_per_day: number }) =>
					o.ticker !== "DW" &&
					o.ticker !== "RAT" &&
					o.planned_by_players_per_day === 0
			)
		).toBe(true);
		expect(text).toContain("Best:");
	});
});

describe("rank_recipes", () => {
	const insights = (status: string, buildings: unknown[] = []) => ({
		status,
		planet_natural_id: "KW-688c",
		total_plans_analyzed: 20,
		total_users: 10,
		last_updated: "2026-11-17T00:00:00Z",
		insights_data: {
			expert_distribution: [],
			building_distribution: [],
			recipe_distribution: {},
			buildings,
			experts: [],
		},
	});
	const INSIGHTS = /^\/analytics\/planet_insights\/[^/]+\/$/;

	it("too few plans on the planet: no popularity", async () => {
		setup([
			[
				INSIGHTS,
				{
					status: "below_threshold",
					planet_natural_id: "KW-688c",
					total_plans_analyzed: 0,
				},
			],
		]);
		const data = await run("rank_recipes", {
			plan_uuid: PLAN_UUID,
			building: "FP",
		});
		expect(data.recipes.length).toBeGreaterThan(1);
		for (const r of data.recipes) expect(r.plans_here_pct).toBeNull();
		expect(
			backend.requests.some((r) =>
				r.path.startsWith("/analytics/planet_insights/")
			)
		).toBe(true);
	});

	it("no insights row for the building; every other recipe earns less", async () => {
		setup([[INSIGHTS, insights("success", [])]]);
		const { text, data } = await call("rank_recipes", {
			plan_uuid: PLAN_UUID,
			building: "hyf",
			limit: 3,
		});
		expect(data.recipes).toHaveLength(3);
		expect(data.recipes[0].current).toBe(true);
		for (const r of data.recipes) expect(r.plans_here_pct).toBeNull();
		const best = data.recipes[1];
		expect(best.vs_current).toBeLessThan(0);
		expect(text).toContain(
			`best other ${best.recipe_id} at ${best.daily_profit} per building per day (${best.vs_current} vs current).`
		);
	});

	it("a building with one recipe has no other", async () => {
		const { text, data } = await call("rank_recipes", {
			plan_uuid: PLAN_UUID,
			building: "RIG",
		});
		expect(
			data.recipes.map((r: { recipe_id: string }) => r.recipe_id)
		).toEqual(["RIG#H2O"]);
		expect(text).toContain(
			"1 recipes; best other none at 0 per building per day."
		);
	});
});

describe("get_material_prices", () => {
	it("planned production for known, unplanned and unknown tickers", async () => {
		const { text, data } = await call("get_material_prices", {
			tickers: ["rat", "FE", "ZZZ"],
			exchanges: ["UNIVERSE"],
			history: false,
		});
		expect(data.missing).toEqual(["ZZZ"]);
		expect(text).toContain("; no data for ZZZ");
		expect(data.planned_by_players.RAT.production_per_day).toBe(120);
		expect(data.planned_by_players.FE).toMatchObject({
			production_per_day: 0,
			consumption_per_day: 0,
			net_per_day: 0,
			production_vs_traded_pct: 0,
		});
		expect(data.planned_by_players.ZZZ).toEqual({
			production_per_day: 0,
			consumption_per_day: 0,
			net_per_day: 0,
			production_vs_traded_pct: null,
		});
		expect(data.history_note).toBeUndefined();
	});
});

describe("get_price_history", () => {
	const DAY = 86_400_000;
	const LAST = Date.UTC(2026, 10, 17);
	/** oldest first, VWAP = close = the given prices, one row a day */
	const rows = (
		ticker: string,
		exchange: string,
		prices: number[],
		traded = 10
	): Exploration[] =>
		prices.map((price, i) => ({
			ticker,
			exchange_code: exchange,
			date_epoch: LAST - (prices.length - 1 - i) * DAY,
			open_p: price,
			close_p: price,
			high_p: price + (i % 3),
			low_p: price - (i % 2),
			volume: price * traded,
			traded,
		}));

	it("a short history: no long changes, defaults to every exchange", async () => {
		setup([
			[
				/^\/data\/cxpc\/FE\/$/,
				rows("FE", "AI1", [100, 90, 110, 95, 105, 98, 102, 101]),
			],
		]);
		const { text, data } = await call("get_price_history", {
			ticker: "FE",
		});
		expect(Object.keys(data.exchanges)).toEqual([
			"AI1",
			"CI1",
			"IC1",
			"NC1",
			"UNIVERSE",
		]);
		const ai1 = data.exchanges.AI1;
		expect(ai1.change_pct.d7).toBeCloseTo((101 / 100 - 1) * 100, 2);
		expect(ai1.change_pct).toMatchObject({
			d30: null,
			d90: null,
			d365: null,
		});
		// unsorted prices: the highest high and lowest low wherever they are
		expect(ai1.all_time.high).toEqual({ price: 112, date: "2026-11-12" });
		expect(ai1.all_time.low).toEqual({ price: 89, date: "2026-11-11" });
		expect(ai1.last_close).toBe(101);
		expect(ai1.range.daily_volatility_pct).toEqual(expect.any(Number));
		expect(data.exchanges.NC1).toEqual({
			traded_days: 0,
			note: "No trades recorded.",
		});
		expect(text).toContain("AI1 101 (– % in 30 days)");
		expect(text).toContain("NC1 no trades");
	});

	it("one trading day: no volatility; all days of an empty exchange", async () => {
		setup([[/^\/data\/cxpc\/AL\/$/, rows("AL", "CI1", [250])]]);
		const data = await run("get_price_history", {
			ticker: "AL",
			exchanges: ["CI1", "IC1"],
			days: "all",
			bars: false,
		});
		const ci1 = data.exchanges.CI1;
		expect(ci1.range).toMatchObject({
			days: "all",
			traded_days: 1,
			vwap: 250,
			daily_volatility_pct: null,
		});
		expect(ci1.change_pct.d7).toBeNull();
		expect(ci1.bars).toBeUndefined();
		expect(data.exchanges.IC1.traded_days).toBe(0);
	});

	it("a day priced at zero gives no change from it", async () => {
		const prices = [0, 10, 11, 12, 13, 14, 15, 16];
		const zero = rows("O", "IC1", prices).map((r, i) =>
			i === 0 ? { ...r, volume: 0 } : r
		);
		setup([[/^\/data\/cxpc\/O\/$/, zero]]);
		const data = await run("get_price_history", {
			ticker: "O",
			exchanges: ["IC1"],
			days: 7,
		});
		expect(data.exchanges.IC1.change_pct.d7).toBeNull();
		expect(data.exchanges.IC1.last_vwap).toBe(16);
	});
});

describe("suggest_base", () => {
	const INSIGHTS = /^\/analytics\/planet_insights\/[^/]+\/$/;
	const payload = (buildings: unknown[], experts: unknown[] = []) => ({
		status: "success",
		planet_natural_id: "KW-688c",
		total_plans_analyzed: 30,
		total_users: 12,
		last_updated: "2026-11-16T10:00:00Z",
		insights_data: {
			expert_distribution: [],
			building_distribution: [],
			recipe_distribution: {},
			buildings,
			experts,
		},
	});
	const building = (
		ticker: string,
		percentage: number,
		recipes: unknown[] = []
	) => ({
		ticker,
		plans: 10,
		users: 5,
		percentage,
		median_amount: 1,
		recipes,
		mixes: [],
	});

	it("no starter setup: nothing to include or calculate", async () => {
		setup([[INSIGHTS, payload([])]]);
		await expect(
			run("suggest_base", {
				planet_natural_id: "KW-688c",
				include: ["FP"],
			})
		).rejects.toThrow("It lists: none.");
		const { text, data } = await call("suggest_base", {
			planet_natural_id: "KW-688c",
		});
		expect(text).toBe(
			"KW-688c: 30 plans analysed, 0 buildings others run; starter setup empty. Nothing selected to calculate."
		);
		expect(data.calculation).toBeUndefined();
	});

	it("a starter building without typical recipes, an expert the plan lacks", async () => {
		setup([
			[
				INSIGHTS,
				payload(
					[building("RIG", 60)],
					[
						{
							type: "Resource_Extraction",
							plans_percentage: 80,
							median_amount: 2,
						},
						{
							type: "Nonsense",
							plans_percentage: 90,
							median_amount: 3,
						},
					]
				),
			],
		]);
		const { text, data } = await call("suggest_base", {
			planet_natural_id: "KW-688c",
			price_basis: "UNIVERSE_7D",
		});
		expect(data.starter_setup.buildings).toEqual([
			expect.objectContaining({ ticker: "RIG", recipes: [] }),
		]);
		expect(data.calculation.buildings[0]).toMatchObject({
			ticker: "RIG",
			amount: 1,
		});
		expect(data.calculation.price_basis.basis).toBe("UNIVERSE_7D");
		expect(text).toContain("Nothing was saved.");
	});
});
