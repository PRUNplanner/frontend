// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { pickerOptions } from "@/features/planning/recipePicker.util";

// MCP
import { createBackend } from "@/mcp/backend";
import { loadPlanSetup } from "@/mcp/context";
import { loadGameData } from "@/mcp/gameData";
import { basisBook } from "@/mcp/priceBasis";
import { TOOLS } from "@/mcp/tools";
import { pathfinder } from "@/features/pathfinding/pathfinder";
import { cogcWarnings } from "@/mcp/tools/shared";
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

const APP = "https://app.test";
let backend: IFakeBackend;
let env: IToolEnv;

const run = (name: string, args: Record<string, unknown> = {}): Promise<any> =>
	TOOLS.find((t) => t.name === name)!
		.run(args, env)
		.then((r) => r.data);

beforeEach(() => {
	backend = fakeBackend();
	env = {
		appUrl: APP,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
});

describe("MCP planning tools", () => {
	it("rank_recipes: the recipe picker's rows and numbers", async () => {
		const data = await run("rank_recipes", {
			plan_uuid: PLAN_UUID,
			building: "fp",
		});
		const setup = await loadPlanSetup(env.backend, PLAN_UUID, undefined);
		const { result } = calculatePlan(
			{ ...setup.input, recipeOptions: true },
			setup.ctx
		);
		const fp = result.production.buildings.find((b) => b.name === "FP")!;
		const ids = fp.activeRecipes.map((r) => r.recipeId);
		const rows = pickerOptions(
			"change",
			fp.recipeOptions,
			ids,
			ids[0],
			"daily",
			() => undefined
		);
		expect(
			data.recipes.map((r: { recipe_id: string }) => r.recipe_id)
		).toEqual(rows.slice(0, 30).map((r) => r.recipe.recipe_id));
		expect(data.recipes[0].current).toBe(true);
		expect(data.recipes[1].daily_profit).toBeCloseTo(
			rows[1].recipe.dailyRevenue,
			2
		);
		expect(data.recipes[1].vs_current).toBeCloseTo(
			rows[1].recipe.dailyRevenue - rows[0].recipe.dailyRevenue,
			2
		);
		await expect(
			run("rank_recipes", { plan_uuid: PLAN_UUID, building: "SME" })
		).rejects.toThrow("isn't in");
	});

	it("get_plan: per-order economics and warnings", async () => {
		const data = await run("get_plan", { plan_uuid: PLAN_UUID });
		const fp = data.buildings.find(
			(b: { ticker: string }) => b.ticker === "FP"
		);
		for (const r of fp.recipes) {
			expect(r.per_run.profit).toBeCloseTo(
				r.per_run.revenue - r.per_run.cost,
				1
			);
			expect(r.per_day.profit).toBeCloseTo(
				r.per_run.profit * r.runs_per_day,
				-1
			);
		}
		expect(Array.isArray(data.warnings)).toBe(true);
		// a plan with an idle building warns about it
		const idle = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [{ ticker: "FP", amount: 2 }],
		});
		expect(idle.warnings.join(" ")).toContain("without a recipe");
	});

	it("get_empire: margin and ROI per plan, material rows optional", async () => {
		const full = await run("get_empire", { empire_uuid: EMPIRE_UUID });
		expect(full.plans[0]).toMatchObject({
			margin_pct: expect.any(Number),
		});
		expect(full.material_io.length).toBeGreaterThan(0);
		const short = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			include_material_io: false,
		});
		expect(short.material_io).toBeUndefined();
		expect(short.per_day).toEqual(full.per_day);
	});

	it("check_plan_market: variant, other price bases, profit range", async () => {
		const base = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			profit_at: ["UNIVERSE_7D", "NC1_ASKBID"],
			range_pct: 20,
		});
		expect(base.profit_at.map((p: { basis: string }) => p.basis)).toEqual([
			"UNIVERSE_7D",
			"NC1_ASKBID",
		]);
		const plain = await run("get_plan", {
			plan_uuid: PLAN_UUID,
		});
		const variant = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			price_basis: "NC1_ASKBID",
		});
		expect(base.profit_at[1].profit_per_day).toBeCloseTo(
			variant.after.profit,
			2
		);
		expect(base.profit_per_day).toBeCloseTo(plain.per_day.profit, 2);
		const row = base.profit_range.materials[0];
		expect(row.range[1] - row.range[0]).toBeCloseTo(
			row.profit_change * 2,
			1
		);
		expect(base.profit_range.price_move_pct).toBe(20);

		const v = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			variant: { buildings: [{ ticker: "EXT", amount: 0 }] },
		});
		expect(v.variant).toBe(true);
		expect(
			v.materials.some((m: { ticker: string }) => m.ticker === "SIO")
		).toBe(false);
	});

	it("find_planets with a plan: ranked by the plan's profit there", async () => {
		const data = await run("find_planets", {
			resources: [{ ticker: "SIO" }],
			plan_uuid: PLAN_UUID,
			limit: 5,
		});
		const profits = data.planets.map(
			(p: { plan_there: { profit_per_day: number } }) =>
				p.plan_there.profit_per_day
		);
		expect(profits.length).toBeGreaterThan(0);
		expect([...profits].sort((a, b) => b - a)).toEqual(profits);
	});

	it("find_planets with a plan: only planets that can run its extraction", async () => {
		// the plan extracts SIO with EXT (mineral) and H2O with RIG (liquid);
		// the index also has mineral and gaseous H2O, which a RIG can't use
		for (const filter of [{}, { resources: [{ ticker: "H2O" }] }]) {
			const data = await run("find_planets", {
				...filter,
				plan_uuid: PLAN_UUID,
				limit: 10,
			});
			expect(data.planets.length).toBeGreaterThan(0);
			expect(data.not_possible_for_plan).toBeGreaterThan(0);
			for (const p of data.planets) {
				const types = (ticker: string) =>
					p.resources
						.filter((r: { ticker: string }) => r.ticker === ticker)
						.map((r: { type: string }) => r.type);
				expect(types("SIO")).toContain("MINERAL");
				expect(types("H2O")).toContain("LIQUID");
			}
		}
	});

	it("calculate_empire_variant: no change equals get_empire; a change adds up", async () => {
		const empire = await run("get_empire", { empire_uuid: EMPIRE_UUID });
		const same = await run("calculate_empire_variant", {
			empire_uuid: EMPIRE_UUID,
		});
		expect(same.before.profit).toBeCloseTo(empire.per_day.profit, 1);
		expect(same.profit_change).toBe(0);
		expect(same.changed_materials).toEqual([]);

		const change = {
			buildings: [{ ticker: "EXT", amount: 3, recipe_id: "EXT#SIO" }],
		};
		const changed = await run("calculate_empire_variant", {
			empire_uuid: EMPIRE_UUID,
			changes: [{ plan_uuid: PLAN_UUID, ...change }],
			new_plans: [
				{
					planet_natural_id: "KW-688c",
					buildings: [
						{ ticker: "RIG", amount: 2, recipe_id: "RIG#H2O" },
					],
				},
			],
		});
		const variant = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
			...change,
		});
		const planRow = changed.plans.find(
			(p: { uuid: string }) => p.uuid === PLAN_UUID
		);
		expect(planRow.status).toBe("changed");
		expect(planRow.profit_after).toBeCloseTo(variant.after.profit, 2);
		expect(
			changed.plans.some((p: { status: string }) => p.status === "new")
		).toBe(true);
		const sio = changed.changed_materials.find(
			(m: { ticker: string }) => m.ticker === "SIO"
		);
		expect(sio.after.delta).toBeGreaterThan(sio.before.delta);
		expect(changed.note).toContain("Nothing was saved");
		expect(new Set(backend.requests.map((r) => r.method))).toEqual(
			new Set(["GET"])
		);

		const removed = await run("calculate_empire_variant", {
			empire_uuid: EMPIRE_UUID,
			remove_plans: [PLAN_UUID],
		});
		expect(removed.after.profit).toBe(0);
		await expect(
			run("calculate_empire_variant", {
				empire_uuid: EMPIRE_UUID,
				remove_plans: ["00000000-0000-4000-8000-000000000000"],
			})
		).rejects.toThrow("isn't in");
	});

	it("get_material_prices: order-book depth, none on UNIVERSE", async () => {
		const data = await run("get_material_prices", {
			tickers: ["RAT"],
			exchanges: ["NC1", "UNIVERSE"],
		});
		const u = data.prices.find(
			(p: { exchange: string }) => p.exchange === "UNIVERSE"
		);
		const n = data.prices.find(
			(p: { exchange: string }) => p.exchange === "NC1"
		);
		expect(u).toMatchObject({
			ask: null,
			bid: null,
			supply_units_in_sell_orders: null,
		});
		expect(n.supply_units_in_sell_orders).toEqual(expect.any(Number));
	});

	it("a planet move takes that planet's COGC program and says so", async () => {
		const other = {
			...fixtures.planet,
			planet_natural_id: "XX-001a",
			active_cogc_program_type: null,
		};
		backend = fakeBackend(undefined, [
			[/^\/data\/planet\/XX-001a\/$/, other],
		]);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const moved = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			planet_natural_id: "XX-001a",
		});
		expect(moved.note).toContain(
			"COGC set to XX-001a's active program ---"
		);
		expect(moved.after.profit).not.toBe(moved.before.profit);
		const kept = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			planet_natural_id: "XX-001a",
			cogc: "RESOURCE_EXTRACTION",
		});
		// cogc given: kept, no note (prices may still differ: the CX has planet preferences)
		expect(kept.note).not.toContain("COGC set");
		// the planet ranking carries its price basis
		const ranked = await run("find_planets", {
			resources: [{ ticker: "SIO" }],
			plan_uuid: PLAN_UUID,
			limit: 2,
		});
		expect(ranked.price_basis.basis).toBe("plan");
	});

	it("an exchange basis falls back to the Universe VWAP 30D where it has no price", async () => {
		const gameData = await loadGameData(env.backend);
		const book = basisBook("NC1_ASKBID", undefined, "KW-688c", gameData);
		const universe = gameData.exchanges.get("AFP.UNIVERSE")!.vwap_30d;
		expect(book.getPrice("AFP", "BUY")).toBe(universe);
		expect(book.getPriceSource("AFP", "BUY")).toMatchObject({
			level: "fallback",
			exchange: "UNIVERSE",
		});
		const rat = gameData.exchanges.get("RAT.NC1")!;
		if (rat.ask > 0) expect(book.getPrice("RAT", "BUY")).toBe(rat.ask);
	});

	it("rank_recipes shows the share of plans on the planet running each recipe", async () => {
		const payload = {
			status: "success",
			planet_natural_id: "KW-688c",
			total_plans_analyzed: 20,
			total_users: 10,
			last_updated: "2026-11-17T00:00:00Z",
			insights_data: {
				expert_distribution: [],
				building_distribution: [],
				recipe_distribution: {},
				buildings: [
					{
						ticker: "FP",
						plans: 20,
						users: 10,
						percentage: 80,
						median_amount: 10,
						recipes: [
							{
								recipe_id: "FP#10xH2O=>7xDW",
								plans: 18,
								percentage: 90,
								median_amount: 2,
							},
						],
						mixes: [],
					},
				],
				experts: [],
			},
		};
		backend = fakeBackend(undefined, [
			[/^\/analytics\/planet_insights\/[^/]+\/$/, payload],
		]);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const data = await run("rank_recipes", {
			plan_uuid: PLAN_UUID,
			building: "FP",
		});
		const dw = data.recipes.find(
			(r: { recipe_id: string }) => r.recipe_id === "FP#10xH2O=>7xDW"
		);
		expect(dw.plans_here_pct).toBe(90);
	});

	it("a variant in another empire or faction changes only the after side", async () => {
		const other = "cfddf9ec-6f9b-4c74-affb-bd55fd1f8aa6";
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			switch_empire_uuid: other,
			faction: "HORTUS",
		});
		expect(data.empire).toMatchObject({ uuid: other, faction: "HORTUS" });
		expect(data.price_basis.before.cx_preference).toBe("PRUN CX REAL");
		// the plan's own planet in another case is no move
		const same = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			planet_natural_id: "kw-688c",
		});
		expect(same.note).not.toContain("COGC set");
		expect(same.delta.profit).toBe(0);
	});

	it("check_make_or_buy: the empire's biggest inputs, costed like get_production_cost", async () => {
		const data = await run("check_make_or_buy", {
			empire_uuid: EMPIRE_UUID,
			top: 3,
		});
		expect(data.inputs.length).toBeGreaterThan(0);
		expect(data.note).toContain("Rough");
		const first = data.inputs[0];
		const cost = await run("get_production_cost", {
			ticker: first.ticker,
			per_day: first.needed_per_day,
			empire_uuid: EMPIRE_UUID,
		});
		expect(first.cost_to_make_per_unit).toBeCloseTo(cost.unit_cost, 1);
		// biggest first
		const buying = data.inputs.map(
			(r: { buying_per_day: number }) => r.buying_per_day
		);
		expect([...buying].sort((a, b) => b - a)).toEqual(buying);
	});

	it("warnings: a CX preference that prices nothing, an over-area plan's biggest users", async () => {
		const emptyCX = fixtures.cxs.map((c) => ({
			...c,
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		}));
		backend = fakeBackend(undefined, [[/^\/planning\/cx\/$/, emptyCX]]);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const plan = await run("get_plan", { plan_uuid: PLAN_UUID });
		expect(plan.cx_matched.matched).toBe(0);
		expect(plan.warnings.join(" ")).toContain("matched 0 of");
		const empire = await run("get_empire", { empire_uuid: EMPIRE_UUID });
		expect(empire.warnings.join(" ")).toContain("matched none");

		const crowded = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [
				{ ticker: "FP", amount: 60, recipe_id: "FP#10xH2O=>7xDW" },
			],
		});
		expect(crowded.warnings.join(" ")).toContain("Biggest users: 60 FP");
	});

	it("planets by name; empty searches say what the default filter hid", async () => {
		const byName = await run("get_planet", {
			planet_natural_id: "etherwind",
		});
		expect(byName.planet_natural_id).toBe("KW-688c");
		await expect(
			run("get_planet", { planet_natural_id: "Nowhere-at-all" })
		).rejects.toThrow("No planet named");
		const search = await run("find_planets", { name: "Etherwind" });
		expect(
			search.planets.map(
				(p: { planet_natural_id: string }) => p.planet_natural_id
			)
		).toContain("KW-688c");
		const hidden = await run("find_planets", {
			resources: [{ ticker: "ZIR" }],
		});
		expect(hidden.hidden_by_default_filter).toMatchObject({
			needing_special_materials: expect.any(Number),
			gaseous: expect.any(Number),
		});
	});

	it("list_plans calculates by default; get_empire limits and sorts its rows", async () => {
		const { plans } = await run("list_plans");
		expect(plans[0]).toMatchObject({
			per_day: { profit: expect.any(Number) },
			margin_pct: expect.any(Number),
			in_several_empires: true,
		});
		const empire = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			limit: 3,
		});
		expect(empire.material_io).toHaveLength(3);
		const values = empire.material_io.map((m: { value: number }) =>
			Math.abs(m.value)
		);
		expect([...values].sort((a, b) => b - a)).toEqual(values);
		expect(empire.material_io[0].made_by).toBeUndefined();
		expect(empire.material_rows.total).toBeGreaterThan(3);
	});

	it("COGC: what the planet's program lifts, per-building factors, hints", async () => {
		const planet = await run("get_planet", {
			planet_natural_id: "KW-688c",
		});
		expect(planet.cogc_boost).toMatchObject({
			program: "RESOURCE_EXTRACTION",
			bonus_pct: 25,
		});
		expect(planet.cogc_boost.buildings).toEqual(
			expect.arrayContaining(["EXT", "RIG", "COL"])
		);
		const plan = await run("get_plan", { plan_uuid: PLAN_UUID });
		const ext = plan.buildings.find(
			(b: { ticker: string }) => b.ticker === "EXT"
		);
		expect(ext.efficiency_factors.COGC).toBe(1.25);
		expect(plan.cogc.planet_runs.program).toBe("RESOURCE_EXTRACTION");

		// a base that ignores the planet's program says so
		const offCogc = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [
				{ ticker: "FP", amount: 2, recipe_id: "FP#10xH2O=>7xDW" },
			],
		});
		expect(offCogc.warnings.join(" ")).toContain(
			"none of the plan's buildings get it"
		);
		const onCogc = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [{ ticker: "RIG", amount: 2, recipe_id: "RIG#H2O" }],
		});
		expect(onCogc.warnings.join(" ")).not.toContain(
			"none of the plan's buildings"
		);

		// a saved plan assuming another program than the planet runs now
		const setup = await loadPlanSetup(env.backend, PLAN_UUID, undefined);
		const stale = cogcWarnings(
			calculatePlan(setup.input, setup.ctx),
			{ ...setup.planet, active_cogc_program_type: null },
			setup.gameData.buildings
		);
		expect(stale.join(" ")).toContain("assumes COGC RESOURCE_EXTRACTION");
	});

	it("get_empire: no CX warning when planet preferences price the plans", async () => {
		const planetOnly = fixtures.cxs.map((c) => ({
			...c,
			cx_data: {
				cx_empire: [],
				cx_planets: [
					{
						planet: "KW-688c",
						preferences: [{ type: "BOTH", exchange: "NC1_30D" }],
					},
				],
				ticker_empire: [],
				ticker_planets: [],
			},
		}));
		backend = fakeBackend(undefined, [[/^\/planning\/cx\/$/, planetOnly]]);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const empire = await run("get_empire", { empire_uuid: EMPIRE_UUID });
		expect(empire.warnings).toEqual([]);
		const shortRows = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			include_material_io: false,
		});
		expect(shortRows.material_rows.shown).toBe(0);
	});

	it("no COGC program now: the planet's last one is reported", async () => {
		const setup = await loadPlanSetup(env.backend, PLAN_UUID, undefined);
		const ended = {
			...setup.planet,
			active_cogc_program_type: null,
			cogc_programs: [
				{
					program_type: "ADVERTISING_RESOURCE_EXTRACTION",
					start_epochms: Date.now() - 9 * 86_400_000,
					end_epochms: Date.now() - 2 * 86_400_000,
				},
			],
		};
		const plan = calculatePlan(
			{ ...setup.input, plan: { ...setup.input.plan, plan_cogc: "---" } },
			setup.ctx
		);
		const hints = cogcWarnings(
			plan,
			ended as never,
			setup.gameData.buildings
		);
		expect(hints.join(" ")).toContain(
			"runs no COGC program now; its last one was RESOURCE_EXTRACTION"
		);
		expect(hints.join(" ")).toContain(
			"Some of the plan's buildings would get it"
		);
	});

	it("check_plan_market on an unsaved plan equals the saved plan's check", async () => {
		const saved = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
		});
		const plan = fixtures.plan;
		const lux = plan.plan_data.workforce.every((w) => w.lux1 && w.lux2);
		const unsaved = await run("check_plan_market", {
			empire_uuid: EMPIRE_UUID,
			new_plan: {
				planet_natural_id: plan.planet_natural_id,
				buildings: [
					...plan.plan_data.buildings.flatMap((b) =>
						b.active_recipes.map((r) => ({
							ticker: b.name,
							amount: b.amount,
							recipe_id: r.recipeid,
							recipe_amount: r.amount,
						}))
					),
					...plan.plan_data.infrastructure
						.filter((i) => i.amount > 0)
						.map((i) => ({ ticker: i.building, amount: i.amount })),
				],
				experts: plan.plan_data.experts.filter((e) => e.amount > 0),
				luxuries: plan.plan_data.workforce.map((w) => ({
					type: w.type,
					lux1: w.lux1,
					lux2: w.lux2,
				})),
				cogc: plan.plan_cogc,
				permits: plan.plan_permits_used,
				habs: "keep",
			},
		});
		expect(lux).toBe(false);
		expect(unsaved.plan.uuid).toBeNull();
		expect(unsaved.profit_per_day).toBeCloseTo(saved.profit_per_day, 2);
		const rows = (r: {
			materials: {
				ticker: string;
				flags: string[];
				share_of_daily_volume_pct: number | null;
			}[];
		}) =>
			r.materials.map((m) => [
				m.ticker,
				m.flags,
				m.share_of_daily_volume_pct,
			]);
		expect(rows(unsaved)).toEqual(rows(saved));
		expect(unsaved.at_ask_bid).toEqual(saved.at_ask_bid);
		await expect(
			run("check_plan_market", {
				new_plan: {
					planet_natural_id: "KW-688c",
					buildings: [{ ticker: "RIG", amount: 1 }],
				},
				variant: { permits: 2 },
			})
		).rejects.toThrow("variant works with plan_uuid");
		await expect(run("check_plan_market", {})).rejects.toThrow(
			"either plan_uuid or new_plan"
		);
	});

	it("30-day price history and where today's quotes sit in it", async () => {
		const series = [
			10,
			12,
			null,
			11,
			14,
			13,
			15,
			16,
			18,
			17,
			19,
			20,
			22,
			21,
			24,
		];
		const spark = { exchange: "NC1", days: 30, series: { RAT: series } };
		backend = fakeBackend(undefined, [
			[/^\/data\/cxpc\/spark\/NC1\/$/, spark],
		]);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		const data = await run("get_material_prices", {
			tickers: ["RAT"],
			exchanges: ["NC1"],
		});
		const h = data.prices[0].history_30d;
		expect(h).toMatchObject({
			days_traded: 14,
			min: 10,
			max: 24,
			last: 24,
		});
		expect(h.last_days_ago).toBe(0);
		const bid = data.prices[0].bid;
		expect(data.prices[0].bid_vs_30d_pct).toBeCloseTo(
			((bid - 10) / 14) * 100,
			1
		);
		expect(h.median).toBe(16.5);
		expect(h.trend_pct).toBeGreaterThan(0);
		expect(
			backend.requests.some((r) => r.path === "/data/cxpc/spark/NC1/")
		).toBe(true);
	});

	it("nearest exchanges by jumps, as the app's pathfinder", async () => {
		const planet = await run("get_planet", {
			planet_natural_id: "KW-688c",
		});
		expect(planet.nearest_exchanges).toHaveLength(4);
		const pf = pathfinder();
		const ai1 = pf.getJumpsFrom(pf.systemidAI1).get(planet.system_id);
		expect(
			planet.nearest_exchanges.find(
				(e: { exchange: string }) => e.exchange === "AI1"
			).jumps
		).toBe(ai1);
		const jumps = planet.nearest_exchanges.map(
			(e: { jumps: number }) => e.jumps
		);
		expect([...jumps].sort((a, b) => a - b)).toEqual(jumps);
		const search = await run("find_planets", { name: "Etherwind" });
		expect(search.planets[0].exchange_jumps.AI1).toBe(ai1);
	});

	it("one building with several recipes: the recipes form, not repeats", async () => {
		await expect(
			run("calculate_new_plan", {
				planet_natural_id: "KW-688c",
				buildings: [
					{ ticker: "FP", amount: 3, recipe_id: "FP#10xH2O=>7xDW" },
					{
						ticker: "FP",
						amount: 4,
						recipe_id: "FP#1xCAF 3xDW=>3xCOF",
					},
				],
			})
		).rejects.toThrow("listed twice with amounts 3 and 4");
		const data = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [
				{
					ticker: "FP",
					amount: 6,
					recipes: [
						{ recipe_id: "FP#10xH2O=>7xDW", amount: 4 },
						{ recipe_id: "FP#1xCAF 3xDW=>3xCOF", amount: 1 },
					],
				},
			],
		});
		const fp = data.buildings.find(
			(b: { ticker: string }) => b.ticker === "FP"
		);
		expect(fp.amount).toBe(6);
		expect(fp.recipes.map((r: { amount: number }) => r.amount)).toEqual([
			4, 1,
		]);
	});
});
