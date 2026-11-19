// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { createPriceBook } from "@/features/cx/priceBook";
import { groupRecipesByBuilding } from "@/features/planning/engine/buildings";
import { marketCheck } from "@/features/cx/marketCheck.util";
import { calculateScaled } from "@/features/planning/util/whatIf.util";
import { calculateVisitation } from "@/features/planning/engine/visitation";
import {
	defaultFilter,
	defaultSort,
	filterPlanets,
	sortPlanets,
} from "@/features/planet_search/planetSearch.engine";
import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";

// MCP
import { createBackend } from "@/mcp/backend";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";
import { autoExperts } from "@/mcp/tools/planEdit";
import { loadPlanSetup } from "@/mcp/context";
import { TOOLS } from "@/mcp/tools";
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
import type { Exchange, Planet } from "@/features/api/schemas/gameData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import { ExchangePayloadSchema } from "@/features/api/schemas/gameData.schemas";

const APP = "https://app.test";
let backend: IFakeBackend;
let env: IToolEnv;

const tool = (name: string) => TOOLS.find((t) => t.name === name)!;
const run = (name: string, args: Record<string, unknown> = {}): Promise<any> =>
	tool(name)
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

/** the fixture user with a default empire (the app opens a plan in it when the plan is in it) */
function withDefaultEmpire(uuid: string | null) {
	backend = fakeBackend(undefined, [
		[
			/^\/user\/preferences\/$/,
			{ ...preferenceDefaults, defaultEmpireUuid: uuid },
		],
	]);
	env = {
		...env,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
}

/** the plan calculated with a context built here, the way the app builds it */
function appCalculation(plan: Plan = fixtures.plan as Plan) {
	const exchanges = new Map(
		ExchangePayloadSchema.parse(fixtures.exchanges).map((e: Exchange) => [
			e.ticker_id,
			e,
		])
	);
	const cx = (fixtures.cxs as unknown as CX[]).find((c) =>
		c.empires.some((e) => e.uuid === EMPIRE_UUID)
	)!;
	const planet = fixtures.planet as unknown as Planet;
	const empire = (fixtures.empires as unknown as PlanEmpireElement[]).find(
		(e) => e.uuid === EMPIRE_UUID
	);
	const ctx = {
		buildings: new Map(
			fixtures.buildings.map((b) => [b.building_ticker, b])
		),
		materials: new Map(fixtures.materials.map((m) => [m.ticker, m])),
		recipesByBuilding: groupRecipesByBuilding(fixtures.recipes),
		planet,
		prices: createPriceBook(
			() => cx.cx_data,
			planet.planet_natural_id,
			(id) => exchanges.get(id)!
		),
	};
	return calculatePlan(
		{ plan, empire, cxUuid: cx.uuid, recipeOptions: false },
		ctx as any
	);
}

describe("MCP tools", () => {
	it("registers the 33 tools of the spec", () => {
		expect(TOOLS.map((t) => t.name).sort()).toEqual(
			[
				"calculate_empire_variant",
				"calculate_new_plan",
				"calculate_plan_variant",
				"check_make_or_buy",
				"check_plan_market",
				"diff_plan_versions",
				"find_planets",
				"get_empire",
				"get_material_prices",
				"get_market_report",
				"get_price_history",
				"get_xit_action",
				"get_plan",
				"get_shared_plan",
				"compare_plans",
				"get_planet",
				"get_distances",
				"get_production_cost",
				"list_empires",
				"list_plan_versions",
				"list_plans",
				"lookup_material",
				"rank_bases",
				"rank_recipes",
				"suggest_base",
				"save_plan",
				"restore_plan_version",
				"save_empire",
				"save_cx_preference",
				"share_plan",
				"copy_shared_plan",
				"set_preferences",
				"delete",
			].sort()
		);
	});

	it("list_empires: faction, CX preference, plan count and url", async () => {
		const { empires } = await run("list_empires");
		expect(empires).toHaveLength(fixtures.empires.length);
		expect(
			empires.find((e: { uuid: string }) => e.uuid === EMPIRE_UUID)
		).toMatchObject({
			name: "Sky Productions",
			cx_preference: "PRUN CX REAL",
			plan_count: 18,
			url: `${APP}/empire/${EMPIRE_UUID}`,
		});
	});

	it("get_material_prices: what PRUNplanner players plan, against the traded volume", async () => {
		backend = fakeBackend(undefined, [
			[
				/^\/analytics\/planning_insights\/materials\/$/,
				[["RAT", 140, 40, 100]],
			],
		]);
		env = {
			...env,
			backend: createBackend({
				apiUrl: "http://backend",
				apiKey: API_KEY,
				userAgent: "test",
				fetch: backend.fetch,
			}),
		};
		const data = await run("get_material_prices", {
			tickers: ["RAT"],
			history: false,
		});
		const universe = (
			fixtures.exchanges as { ticker_id: string; sum_traded_7d: number }[]
		).find((e) => e.ticker_id === "RAT.UNIVERSE")!;
		expect(data.planned_by_players.RAT).toMatchObject({
			production_per_day: 140,
			consumption_per_day: 40,
			net_per_day: 100,
		});
		expect(
			data.planned_by_players.RAT.production_vs_traded_pct
		).toBeCloseTo((140 / (universe.sum_traded_7d / 7)) * 100, 1);
		// public data: without the key
		expect(
			backend.requests
				.find((r) =>
					r.path.startsWith("/analytics/planning_insights/")
				)!
				.headers.has("Authorization")
		).toBe(false);
	});

	it("list_plans: a limit with the total and a hint", async () => {
		const second = {
			...fixtures.plan,
			uuid: "11111111-2222-4333-8444-555555555555",
		};
		backend = fakeBackend(undefined, [
			[/^\/planning\/plan\/$/, [fixtures.plan, second]],
		]);
		env = {
			...env,
			backend: createBackend({
				apiUrl: "http://backend",
				apiKey: API_KEY,
				userAgent: "test",
				fetch: backend.fetch,
			}),
		};
		const data = await run("list_plans", { limit: 1 });
		expect(data.total).toBe(2);
		expect(data.plans).toHaveLength(1);
		expect(data.note).toContain("Showing 1 of 2");
	});

	it("list_plans: all plans, or one empire's", async () => {
		const all = await run("list_plans");
		expect(all.plans[0]).toMatchObject({
			uuid: PLAN_UUID,
			planet: "KW-688c",
			url: `${APP}/plan/KW-688c/${PLAN_UUID}`,
		});
		const one = await run("list_plans", { empire_uuid: EMPIRE_UUID });
		expect(
			backend.requests.some(
				(r) => r.path === `/planning/empire/${EMPIRE_UUID}/plans/`
			)
		).toBe(true);
		// filled from the empire list, which names each empire's plans
		expect(
			one.plans[0].empires.map((e: { name: string }) => e.name).sort()
		).toEqual(
			fixtures.empires
				.filter((e) => e.plans.some((p) => p.uuid === PLAN_UUID))
				.map((e) => e.empire_name)
				.sort()
		);
		expect(one.plans[0].empires.length).toBeGreaterThan(0);
	});

	it("the empire a plan page opens with: the default if the plan is in it, else the list's first that holds it, else the first", async () => {
		const empires = fixtures.empires as {
			uuid: string;
			plans: { uuid: string }[];
		}[];
		const holding = empires.find((e) =>
			e.plans.some((p) => p.uuid === PLAN_UUID)
		)!;
		withDefaultEmpire(null);
		expect(
			(await run("get_plan", { plan_uuid: PLAN_UUID })).empire.uuid
		).toBe(holding.uuid);
		// a default the plan isn't in doesn't count
		const other = empires.find(
			(e) => !e.plans.some((p) => p.uuid === PLAN_UUID)
		)!;
		withDefaultEmpire(other.uuid);
		expect(
			(await run("get_plan", { plan_uuid: PLAN_UUID })).empire.uuid
		).toBe(holding.uuid);
		// a plan in no empire: the user's first empire
		backend = fakeBackend(undefined, [
			[/^\/planning\/plan\/[^/]+\/$/, { ...fixtures.plan, empires: [] }],
		]);
		env = {
			...env,
			backend: createBackend({
				apiUrl: "http://backend",
				apiKey: API_KEY,
				userAgent: "test",
				fetch: backend.fetch,
			}),
		};
		const lone = await run("get_plan", { plan_uuid: PLAN_UUID });
		expect(lone.empire.uuid).toBe(empires[0].uuid);
		expect(lone.note).toContain("in no empire");
	});

	it("list_plans with_profit: every plan calculated as get_plan, ranked", async () => {
		withDefaultEmpire(EMPIRE_UUID);
		const { plans, note } = await run("list_plans", { with_profit: true });
		const app = appCalculation();
		expect(plans[0]).toMatchObject({
			uuid: PLAN_UUID,
			calculated_in: "Sky Productions",
			cx_preference: "PRUN CX REAL",
		});
		expect(plans[0].per_day.profit).toBeCloseTo(app.result.profit, 2);
		expect(note).toContain("CX preference");
	});

	it("get_plan: the engine's numbers with the empire's CX (parity)", async () => {
		withDefaultEmpire(EMPIRE_UUID);
		const data = await run("get_plan", {
			plan_uuid: PLAN_UUID,
			detail: "full",
		});
		const app = appCalculation();
		expect(data.per_day.profit).toBeCloseTo(app.result.profit, 2);
		expect(data.per_day.revenue).toBeCloseTo(app.result.revenue, 2);
		expect(data.per_day.construction_cost).toBeCloseTo(
			app.overview.totalConstructionCost,
			2
		);
		expect(data.material_io).toHaveLength(app.result.materialio.length);
		data.material_io.forEach(
			(
				m: { ticker: string; value: number; delta: number },
				i: number
			) => {
				expect(m.ticker).toBe(app.result.materialio[i].ticker);
				expect(m.value).toBeCloseTo(app.result.materialio[i].price, 2);
			}
		);
		// the plan is in two empires: the default one, as its plan page opens
		expect(data.empire.uuid).toBe(EMPIRE_UUID);
		expect(data.note).toContain("2 empires");
		expect(data.price_basis.cx_preference).toBe("PRUN CX REAL");
		expect(
			data.material_io.every(
				(m: { price_source: string }) => m.price_source
			)
		).toBe(true);
		expect(data.construction_materials.length).toBeGreaterThan(0);
	});

	it("get_plan: an unknown empire is a tool error", async () => {
		await expect(
			run("get_plan", {
				plan_uuid: PLAN_UUID,
				empire_uuid: "00000000-0000-4000-8000-000000000000",
			})
		).rejects.toThrow("Unknown empire");
	});

	it("get_empire: totals and material rows with makers and users", async () => {
		const data = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			include_plan_breakdown: true,
		});
		const app = appCalculation();
		expect(data.plans).toHaveLength(1);
		expect(data.plans[0].profit).toBeCloseTo(app.result.profit, 2);
		expect(data.per_day.profit).toBeCloseTo(app.result.profit, 1);
		const made = data.material_io.find(
			(m: { output: number }) => m.output > 0
		);
		expect(made.made_by[0]).toMatchObject({ plan_uuid: PLAN_UUID });
	});

	it("get_plan: shipping as Visitation frequency, priced construction", async () => {
		const data = await run("get_plan", {
			plan_uuid: PLAN_UUID,
			detail: "full",
		});
		const app = appCalculation();
		const v = calculateVisitation(app.result);
		expect(data.shipping.import_weight_t).toBeCloseTo(
			v.dailyWeightImport,
			3
		);
		expect(data.shipping.export_volume_m3).toBeCloseTo(
			v.dailyVolumeExport,
			3
		);
		expect(data.shipping.storage_days).toBeCloseTo(v.storageFilled, 3);
		const total = data.construction_materials.reduce(
			(sum: number, m: { value: number }) => sum + m.value,
			0
		);
		expect(total).toBeCloseTo(app.overview.totalConstructionCost, -1);
		expect(data.construction_materials[0]).toMatchObject({
			unit_price: expect.any(Number),
			price_source: expect.any(String),
		});
	});

	it("calculate_new_plan: an existing plan rebuilt unsaved gives its numbers", async () => {
		const plan = structuredClone(fixtures.plan) as Plan;
		// a new plan in the app has every luxury on
		plan.plan_data.workforce.forEach((w) => {
			w.lux1 = true;
			w.lux2 = true;
		});
		const buildings = [
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
		];
		const data = await run("calculate_new_plan", {
			planet_natural_id: plan.planet_natural_id,
			empire_uuid: EMPIRE_UUID,
			buildings,
			experts: plan.plan_data.experts.filter((e) => e.amount > 0),
			cogc: plan.plan_cogc,
			corphq: plan.plan_corphq,
			permits: plan.plan_permits_used,
			habs: "keep",
		});
		const app = appCalculation(plan);
		expect(data.per_day.profit).toBeCloseTo(app.result.profit, 2);
		expect(data.per_day.construction_cost).toBeCloseTo(
			app.overview.totalConstructionCost,
			2
		);
		expect(data.price_basis.cx_preference).toBe("PRUN CX REAL");
		expect(data.plan).toMatchObject({
			uuid: null,
			url: `${APP}/plan/${plan.planet_natural_id}`,
		});
		expect(data.habitation).toBe("as given");
	});

	it("calculate_new_plan: auto habs house the workforce, extraction per planet", async () => {
		const data = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [
				{ ticker: "RIG", amount: 4, recipe_id: "RIG#H2O" },
				{ ticker: "FP", amount: 3, recipe_id: "FP#10xH2O=>7xDW" },
			],
		});
		expect(data.habitation).toContain("optimiser (auto)");
		// a new plan takes the planet's active COGC program, as in the app
		expect(data.plan.cogc).toBe("RESOURCE_EXTRACTION");
		expect(data.workforce.every((w: { left: number }) => w.left >= 0)).toBe(
			true
		);
		expect(Object.keys(data.infrastructure).length).toBeGreaterThan(0);
		expect(data.note).toContain("Universe VWAP 30D");
		await expect(
			run("calculate_new_plan", {
				planet_natural_id: "KW-688c",
				buildings: [{ ticker: "EXT", amount: 1, recipe_id: "EXT#FEO" }],
			})
		).rejects.toThrow("Recipes there: EXT#SIO");
	});

	it("calculate_new_plan: experts auto by default, at most 6 per base", async () => {
		const buildings = [
			{ ticker: "RIG", amount: 4, recipe_id: "RIG#H2O" },
			{ ticker: "FP", amount: 3, recipe_id: "FP#10xH2O=>7xDW" },
		];
		const total = (text: string) =>
			[...text.matchAll(/(\d+) /g)].reduce((n, m) => n + Number(m[1]), 0);

		const auto = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings,
		});
		expect(auto.plan.experts_auto).toBe(true);
		expect(total(auto.plan.experts)).toBe(6);
		expect(auto.plan.experts).toMatch(/^5 /);

		const none = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings,
			experts: [],
		});
		expect(none.plan).toMatchObject({
			experts: "none",
			experts_auto: false,
		});
		expect(auto.per_day.profit).toBeGreaterThan(none.per_day.profit);

		await expect(
			run("calculate_new_plan", {
				planet_natural_id: "KW-688c",
				buildings,
				experts: [
					{ type: "Resource_Extraction", amount: 5 },
					{ type: "Food_Industries", amount: 5 },
				],
			})
		).rejects.toThrow("10 experts");

		const variant = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			experts: "auto",
		});
		expect(variant.note).toContain("Experts (auto): 5 ");
	});

	it("calculate_new_plan: storage_days adds STO, then STA, as Base ROI's buffer", async () => {
		const buildings = [
			{ ticker: "RIG", amount: 30, recipe_id: "RIG#H2O" },
			{ ticker: "FP", amount: 20, recipe_id: "FP#10xH2O=>7xDW" },
		];
		const plain = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings,
		});
		expect(plain.plan.storage).toBeNull();
		expect(plain.shipping).toMatchObject({
			storage_capacity_t: 1500,
			storage_capacity_m3: 1500,
		});
		expect(["weight", "volume"]).toContain(
			plain.shipping.storage_limited_by
		);
		const days = Math.min(
			30,
			Math.ceil(plain.shipping.storage_days * 2) + 1
		);
		expect(days).toBeGreaterThan(plain.shipping.storage_days);

		const sized = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings,
			storage_days: days,
		});
		expect(sized.plan.storage).toMatch(/^added \d+ STO|^added \d+ STA/);
		expect(sized.shipping.storage_days).toBeGreaterThanOrEqual(days);
		expect(
			(sized.infrastructure.STO ?? 0) + (sized.infrastructure.STA ?? 0)
		).toBeGreaterThan(0);
		expect(
			sized.construction_cost ?? sized.per_day.construction_cost
		).toBeGreaterThan(plain.per_day.construction_cost);

		const enough = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings,
			storage_days: plain.shipping.storage_days / 2,
		});
		expect(enough.plan.storage).toContain("nothing added");

		const variant = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			storage_days: 30,
		});
		expect(variant.note).toContain("Storage: added");
	});

	it("experts auto: weighted by what experts scale, not count or net profit", () => {
		// 1 EXT: loses money on upkeep, earns 60 a day on materials
		// 5 FRM: earns 10 a day net, 20 on materials
		const building = (
			expertise: string,
			amount: number,
			dailyRevenue: number,
			workforceDailyCost: number,
			constructionCost: number
		) => ({
			expertise,
			amount,
			dailyRevenue,
			workforceDailyCost,
			constructionCost,
		});
		const calc = {
			result: {
				production: {
					buildings: [
						building("RESOURCE_EXTRACTION", 1, -50, -100, -1800),
						building("AGRICULTURE", 5, 10, -1, -180),
					],
				},
			},
		} as unknown as IPlanCalculation;
		const picked = Object.fromEntries(
			autoExperts(calc).map((e) => [e.type, e.amount])
		);
		expect(picked).toMatchObject({
			Resource_Extraction: 5,
			Agriculture: 1,
		});
	});

	it("calculate_plan_variant: switch, remove and re-weight orders like the editor", async () => {
		const fp = (fixtures.plan as Plan).plan_data.buildings.find(
			(b) => b.name === "FP"
		)!;
		// replace FP's three orders with only DW
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [
				{
					ticker: "FP",
					amount: fp.amount,
					recipes: [{ recipe_id: "FP#10xH2O=>7xDW", amount: 1 }],
				},
			],
		});
		const plan = structuredClone(fixtures.plan) as Plan;
		plan.plan_data.buildings.find((b) => b.name === "FP")!.active_recipes =
			[{ recipeid: "FP#10xH2O=>7xDW", amount: 1 }];
		expect(data.after.profit).toBeCloseTo(
			appCalculation(plan).result.profit,
			2
		);
		// RAT no longer made; the pioneers still eat it
		const rat = data.changed_material_io.find(
			(l: { ticker: string }) => l.ticker === "RAT"
		);
		expect(rat.after.output).toBe(0);
		expect(rat.after.input).toBe(rat.before.input);

		// a material the variant no longer touches reads 0 after, not its old amounts
		const noExt = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "EXT", amount: 0 }],
		});
		const sio = noExt.changed_material_io.find(
			(l: { ticker: string }) => l.ticker === "SIO"
		);
		expect(sio.after).toEqual({ input: 0, output: 0, delta: 0, value: 0 });
		expect(sio.before.output).toBeGreaterThan(0);

		// recipe_amount 0 drops one order
		const dropped = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [
				{
					ticker: "FP",
					amount: fp.amount,
					recipe_id: "FP#1xCAF 3xDW=>3xCOF",
					recipe_amount: 0,
				},
			],
		});
		const plan2 = structuredClone(fixtures.plan) as Plan;
		const fp2 = plan2.plan_data.buildings.find((b) => b.name === "FP")!;
		fp2.active_recipes = fp2.active_recipes.filter(
			(r) => r.recipeid !== "FP#1xCAF 3xDW=>3xCOF"
		);
		expect(dropped.after.profit).toBeCloseTo(
			appCalculation(plan2).result.profit,
			2
		);
	});

	it("calculate_plan_variant: permits, luxuries, habs and planet", async () => {
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			permits: 2,
			luxuries: [{ type: "pioneer", lux1: false }],
			habs: "auto",
		});
		const plan = structuredClone(fixtures.plan) as Plan;
		plan.plan_permits_used = 2;
		plan.plan_data.workforce.find((w) => w.type === "pioneer")!.lux1 =
			false;
		// the fixture uses 3 permits: 2 means less area
		expect(data.area_after.areaTotal).toBeLessThan(
			data.area_before.areaTotal
		);
		expect(
			data.workforce_after.every((w: { left: number }) => w.left >= 0)
		).toBe(true);
		expect(data.note).toContain("optimiser (auto)");
		// a price override only returns lines whose value changed
		const priced = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			prices: [{ ticker: "DW", sell: 1 }],
		});
		expect(
			priced.changed_material_io.map((l: { ticker: string }) => l.ticker)
		).toEqual(["DW"]);
		// same planet id → nothing dropped; the fake planet has no FEO, so EXT#SIO stays
		const moved = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			planet_natural_id: "KW-688c",
		});
		expect(moved.delta.profit).toBe(0);
		expect(moved.construction_change.net_cost).toBe(0);
	});

	it("calculate_plan_variant: no changes, zero deltas", async () => {
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
		});
		expect(
			Object.values(data.delta).every((v) => v === 0 || v === null)
		).toBe(true);
		expect(data.changed_material_io).toEqual([]);
		expect(data.note).toContain("Nothing was saved");
	});

	it("calculate_plan_variant: one more building, as in the editor", async () => {
		const plan = structuredClone(fixtures.plan) as Plan;
		const ext = plan.plan_data.buildings.find((b) => b.name === "EXT")!;
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "EXT", amount: ext.amount + 1 }],
		});
		ext.amount += 1;
		const app = appCalculation(plan);
		expect(data.after.profit).toBeCloseTo(app.result.profit, 2);
		expect(data.delta.profit).not.toBe(0);
		expect(
			data.payback_of_difference.extra_construction_cost
		).toBeGreaterThan(0);
		const pio = data.workforce_after.find(
			(w: { type: string }) => w.type === "pioneer"
		);
		const pioBefore = data.workforce_before.find(
			(w: { type: string }) => w.type === "pioneer"
		);
		expect(pio.required).toBeGreaterThan(pioBefore.required);
	});

	it("calculate_plan_variant: habs are infrastructure, they house workers", async () => {
		const hb1 =
			fixtures.plan.plan_data.infrastructure.find(
				(i) => i.building === "HB1"
			)?.amount ?? 0;
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "HB1", amount: hb1 + 5 }],
		});
		const capacity = (rows: { type: string; capacity: number }[]) =>
			rows.find((w) => w.type === "pioneer")?.capacity ?? 0;
		expect(capacity(data.workforce_after)).toBeGreaterThan(
			capacity(data.workforce_before)
		);
		expect(data.workforce_left_delta.pioneer).toBeGreaterThan(0);
		await expect(
			run("calculate_plan_variant", {
				plan_uuid: PLAN_UUID,
				buildings: [{ ticker: "CM", amount: 2 }],
			})
		).rejects.toThrow("core module");
	});

	it("calculate_plan_variant: unknown building or recipe is a tool error", async () => {
		await expect(
			run("calculate_plan_variant", {
				plan_uuid: PLAN_UUID,
				buildings: [{ ticker: "XXX", amount: 1 }],
			})
		).rejects.toThrow("Unknown building");
		await expect(
			run("calculate_plan_variant", {
				plan_uuid: PLAN_UUID,
				buildings: [{ ticker: "EXT", amount: 1, recipe_id: "nope" }],
			})
		).rejects.toThrow("has no recipe");
		// extraction recipes come from the planet's resources
		const ext = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "EXT", amount: 2, recipe_id: "EXT#SIO" }],
		});
		expect(ext.delta.profit).not.toBe(0);
	});

	it("calculate_plan_variant: price overrides change the variant only", async () => {
		const data = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			prices: [{ ticker: "DW", buy: 0, sell: 0 }],
		});
		expect(data.before.profit).toBeCloseTo(
			appCalculation().result.profit,
			2
		);
		expect(data.after.profit).not.toBe(data.before.profit);
		const dw = data.changed_material_io.find(
			(l: { ticker: string }) => l.ticker === "DW"
		);
		expect(dw.price_source).toBe("price override (this variant)");
	});

	it("check_plan_market: the app's market check and target price", async () => {
		const setup = await loadPlanSetup(env.backend, PLAN_UUID, undefined);
		const { result } = calculatePlan(setup.input, setup.ctx);
		const checks = marketCheck(
			result.materialio,
			setup.ctx.prices,
			setup.gameData.getExchange
		);
		const sold = result.materialio.find((m) => m.delta > 0)!;
		const target = Math.round(result.profit + 1000);
		const data = await run("check_plan_market", {
			plan_uuid: PLAN_UUID,
			target: { ticker: sold.ticker, daily_profit: target },
		});
		expect(data.materials.map((m: { ticker: string }) => m.ticker)).toEqual(
			checks.map((c) => c.ticker)
		);
		// "all exchanges" is said once, not on every row
		expect(data.materials.map((m: { flags: string[] }) => m.flags)).toEqual(
			checks.map((c) => c.flags.filter((f) => f !== "all_exchanges"))
		);
		expect(data.at_ask_bid.profit_per_day).toEqual(expect.any(Number));
		// the needed price really reaches the target
		const factor = data.target.price_needed / data.target.price_today;
		expect(
			calculateScaled(setup.input, setup.ctx, sold.ticker, factor).result
				.profit
		).toBeCloseTo(target, -1);
	});

	it("get_material_prices: volume and data age per exchange", async () => {
		const data = await run("get_material_prices", {
			tickers: ["rat"],
			exchanges: ["NC1", "UNIVERSE"],
		});
		expect(
			data.prices.map((p: { exchange: string }) => p.exchange).sort()
		).toEqual(["NC1", "UNIVERSE"]);
		expect(data.prices[0]).toMatchObject({
			ticker: "RAT",
			traded_30d: expect.any(Number),
			data_age_hours: expect.any(Number),
		});
		expect(data.missing).toEqual([]);
	});

	it("find_planets: Planet Search's result for the same filter", async () => {
		const index =
			fixtures.searchIndex as unknown as PlanetSearchIndexEntry[];
		const ctx = { now: Date.now(), refJumps: () => undefined };
		const expected = (cogc: string[]) => {
			const filter = {
				...defaultFilter(),
				materialGroups: [{ op: "all" as const, materials: ["LST"] }],
				cogc: cogc as never,
			};
			return sortPlanets(
				filterPlanets(index, filter, ctx),
				[defaultSort(filter)],
				ctx
			).map((p) => p.planet_natural_id);
		};

		const plain = await run("find_planets", {
			resources: [{ ticker: "LST" }],
			limit: 100,
		});
		expect(plain.count).toBe(expected([]).length);
		expect(
			plain.planets.map(
				(p: { planet_natural_id: string }) => p.planet_natural_id
			)
		).toEqual(expected([]).slice(0, 100));
		expect(plain.url).toBe(`${APP}/search?m=all%3ALST`);

		const withCogc = await run("find_planets", {
			resources: [{ ticker: "LST" }],
			cogc: ["AGRICULTURE"],
		});
		expect(withCogc.count).toBe(expected(["AGRICULTURE"]).length);
	});

	it("find_planets: near_exchange and max_jumps as Planet Search's exchange distance, sort by jumps", async () => {
		const index =
			fixtures.searchIndex as unknown as PlanetSearchIndexEntry[];
		const now = Date.now();
		const ctx = createSearchContext(index, {}, now);
		// a cut that keeps some LST planets and drops others
		const ai1 = ctx.refJumps({ kind: "cx", code: "AI1" })!;
		const lst = index
			.filter((p) => p.resources.some((r) => r.material_ticker === "LST"))
			.map((p) => ai1.get(p.system_id))
			.filter((j): j is number => j !== undefined)
			.toSorted((x, y) => x - y);
		const maxJumps = lst[Math.floor(lst.length / 2)];
		const filter = {
			...defaultFilter(),
			materialGroups: [{ op: "all" as const, materials: ["LST"] }],
			references: [{ kind: "cx" as const, code: "AI1" as const }],
			maxJumps,
		};
		const expected = filterPlanets(index, filter, ctx).map(
			(p) => p.planet_natural_id
		);
		expect(expected.length).toBeGreaterThan(0);

		const near = await run("find_planets", {
			resources: [{ ticker: "LST" }],
			near_exchange: "AI1",
			max_jumps: maxJumps,
			limit: 100,
		});
		expect(near.count).toBe(expected.length);
		const ids = near.planets.map(
			(p: { planet_natural_id: string }) => p.planet_natural_id
		);
		expect(ids.toSorted()).toEqual(expected.slice(0, 100).toSorted());
		expect(
			near.planets.every(
				(p: { exchange_jumps: Record<string, number> }) =>
					p.exchange_jumps.AI1 <= maxJumps
			)
		).toBe(true);
		expect(near.url).toContain("AI1");

		const byJumps = await run("find_planets", {
			resources: [{ ticker: "LST" }],
			near_exchange: "AI1",
			sort: "jumps",
			limit: 100,
		});
		const jumps = byJumps.planets.map(
			(p: { exchange_jumps: Record<string, number> }) =>
				p.exchange_jumps.AI1
		);
		expect(jumps).toEqual(jumps.toSorted((a: number, b: number) => a - b));
		expect(byJumps.url).toContain("sort=ref%3Acx%3AAI1%3Aasc");
		// without max_jumps nothing is filtered out
		expect(byJumps.count).toBeGreaterThan(near.count);

		await expect(
			run("find_planets", {
				resources: [{ ticker: "LST" }],
				max_jumps: 3,
			})
		).rejects.toThrow("need near_exchange");
	});

	it("get_planet and lookup_material", async () => {
		const planet = await run("get_planet", {
			planet_natural_id: "KW-688c",
		});
		expect(planet.planet_natural_id).toBe("KW-688c");

		const rat = await run("lookup_material", { ticker: "RAT" });
		const makes = fixtures.recipes.filter((r) =>
			r.outputs.some((o) => o.material_ticker === "RAT")
		);
		const uses = fixtures.recipes.filter((r) =>
			r.inputs.some((o) => o.material_ticker === "RAT")
		);
		expect(
			rat.made_by.map((r: { recipe_id: string }) => r.recipe_id)
		).toEqual(makes.map((r) => r.recipe_id));
		expect(rat.used_by).toHaveLength(uses.length);
		await expect(run("lookup_material", { ticker: "ZZZ" })).rejects.toThrow(
			"Unknown material"
		);
	});

	it("every reading tool only sends GET requests", async () => {
		await run("list_empires");
		await run("list_plans");
		await run("get_plan", { plan_uuid: PLAN_UUID });
		await run("get_empire", { empire_uuid: EMPIRE_UUID });
		await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "EXT", amount: 9 }],
		});
		await run("check_plan_market", { plan_uuid: PLAN_UUID });
		await run("get_material_prices", { tickers: ["RAT"] });
		await run("find_planets", { resources: [{ ticker: "LST" }] });
		await run("get_planet", { planet_natural_id: "KW-688c" });
		await run("lookup_material", { ticker: "RAT" });
		expect(backend.requests.length).toBeGreaterThan(10);
		expect(new Set(backend.requests.map((r) => r.method))).toEqual(
			new Set(["GET"])
		);
		// game data goes without the key, user data with it
		const keyed = backend.requests.filter((r) =>
			r.headers.has("Authorization")
		);
		expect(
			keyed.every(
				(r) =>
					r.path.startsWith("/planning/") ||
					r.path === "/user/preferences/"
			)
		).toBe(true);
		expect(keyed[0].headers.get("Authorization")).toBe(
			`Api-Key ${API_KEY}`
		);
	});

	it("a revoked key: the invalid-or-revoked tool error", async () => {
		backend = fakeBackend(401);
		env.backend = createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		});
		await expect(run("list_empires")).rejects.toMatchObject({
			code: "auth_error",
			message: expect.stringContaining("invalid or revoked"),
		});
	});
});
