// @vitest-environment node
import { describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
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

const DAY = 86_400_000;
const EMPTY_UUID = "11111111-2222-4333-8444-555555555555";
const MISSING_UUID = "99999999-2222-4333-8444-555555555555";
const UNKNOWN_EMPIRE = "00000000-0000-4000-8000-000000000000";

// an unnamed planet in no known system, without resources or programs
const BARREN = {
	...fixtures.planet,
	planet_natural_id: "AB-123a",
	planet_name: "AB-123a",
	system_id: "f".repeat(32),
	resources: [],
	cogc_programs: [],
	active_cogc_program_type: null,
};
// a planet whose last COGC program ended two days ago
const ENDED = {
	...fixtures.planet,
	planet_natural_id: "CD-456b",
	planet_name: "Endedworld",
	resources: [],
	active_cogc_program_type: null,
	cogc_programs: [
		{
			program_type: "ADVERTISING_METALLURGY",
			start_epochms: Date.now() - 9 * DAY,
			end_epochms: Date.now() - 2 * DAY,
		},
	],
};
// a plan without buildings, in no empire, on the ended planet
const EMPTY = {
	...fixtures.plan,
	uuid: EMPTY_UUID,
	plan_name: "Empty",
	planet_natural_id: "CD-456b",
	empires: [],
	plan_data: { ...fixtures.plan.plan_data, buildings: [] },
};

const PLANETS: [RegExp, unknown][] = [
	[/^\/data\/planet\/AB-123a\/$/, BARREN],
	[/^\/data\/planet\/CD-456b\/$/, ENDED],
	[new RegExp(`^/planning/plan/${EMPTY_UUID}/$`), EMPTY],
];

let backend: IFakeBackend;
/** a tool env on the fake backend; MISSING_UUID's plan is "not found" */
function env(routes: [RegExp, unknown][] = [], status?: number): IToolEnv {
	backend = fakeBackend(status, [...routes, ...PLANETS]);
	const inner = backend.fetch;
	const fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
		String(input).includes(MISSING_UUID)
			? new Response("{}", { status: 404 })
			: inner(input, init)) as typeof globalThis.fetch;
	return {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch,
		}),
	};
}
const prefs = (p: Record<string, unknown>): [RegExp, unknown] => [
	/^\/user\/preferences\/$/,
	{ ...preferenceDefaults, ...p },
];
// the user has no empires at all
const NO_EMPIRES: [RegExp, unknown] = [/^\/planning\/empire\/$/, []];

const tool = (name: string) => TOOLS.find((t) => t.name === name)!;
const run = (
	name: string,
	args: Record<string, unknown>,
	e: IToolEnv = env()
): Promise<any> => tool(name).run(args as never, e);

describe("get_xit_action: defaults and variants", () => {
	it("unreadable preferences: the app's defaults, initial supply of the workforce", async () => {
		// no preferences route: 404, so the defaults apply
		const { data, text } = await run("get_xit_action", {
			kind: "supply_initial",
			plan_uuid: PLAN_UUID,
			part: "workforce",
		});
		expect(data.origin).toBe(preferenceDefaults.burnOrigin);
		expect(data.package.global.name).toBe(
			"PRUNplanner Supply Cart Initial"
		);
		expect(data.note).toContain(
			`Supply for ${preferenceDefaults.supplyCartDays} days (workforce only)`
		);
		// buying needs a warehouse; "Configure on Execution" only transfers
		expect(data.note).toContain("Buying needs a warehouse origin");
		expect(data.buy_first).toBe(false);
		expect(data.materials.length).toBeGreaterThan(0);
		expect(data.totals.cost).toBeGreaterThan(0);
		expect(text).toContain("at the plan's prices");
	});

	it("supply of production only: net use, in a given empire", async () => {
		const workforceOnly = await run("get_xit_action", {
			kind: "supply",
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
			part: "workforce",
			days: 3,
			buy: false,
		});
		const production = await run("get_xit_action", {
			kind: "supply",
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
			part: "production",
			days: 3,
			buy: false,
		});
		expect(production.data.note).toBe(
			"Supply for 3 days (production only); stock already on the planet is not subtracted."
		);
		const tickers = (d: any) =>
			d.data.materials.map((m: { ticker: string }) => m.ticker);
		// food and water for the workers vs the factories' inputs
		expect(tickers(workforceOnly)).toContain("OVE");
		expect(tickers(production)).not.toContain("OVE");
		expect(production.data.package.global.name).toBe(
			"PRUNplanner Supply Cart"
		);
	});

	it("construction: the saved Built column subtracts", async () => {
		const plain = await run("get_xit_action", {
			kind: "construction",
			plan_uuid: PLAN_UUID,
		});
		const built = await run(
			"get_xit_action",
			{ kind: "construction", plan_uuid: PLAN_UUID },
			env([
				prefs({
					planOverrides: {
						[PLAN_UUID]: {
							autoOptimizeHabs: false,
							constructionBuilt: { RIG: 21, EXT: 1 },
						},
					},
				}),
			])
		);
		expect(built.data.note).toContain(
			"Built: the plan's saved Built column"
		);
		expect(built.data.totals.weight_t).toBeLessThan(
			plain.data.totals.weight_t
		);
		expect(built.data.package.global.name).toBe("PRUNplanner Construct");
	});

	it("materials: the default name, an empty list refused", async () => {
		const { data, text } = await run("get_xit_action", {
			kind: "materials",
			materials: [{ ticker: "dw", amount: 2 }],
			origin: "Moria Station Warehouse",
			buy: true,
		});
		expect(data.package.global.name).toBe("PRUNplanner Transfer");
		expect(data.buy_first).toBe(true);
		expect(data.note).toBeNull();
		expect(data.plan).toBeUndefined();
		expect(data.totals.cost).toBeUndefined();
		expect(text).toContain("bought there first");
		expect(text).not.toContain("plan's prices");
		await expect(
			run("get_xit_action", { kind: "materials", materials: [] })
		).rejects.toThrow("kind materials needs materials.");
	});
});

describe("get_distances: places", () => {
	it("a plan not in the account, and key errors passed on", async () => {
		await expect(
			run("get_distances", { places: [MISSING_UUID, "AI1"] })
		).rejects.toThrow(`No plan ${MISSING_UUID} in your account.`);
		await expect(
			run("get_distances", { places: [PLAN_UUID, "AI1"] }, env([], 401))
		).rejects.toThrow("API key invalid or revoked");
	});

	it("an unnamed planet off the jump graph: no jumps, no route", async () => {
		const { data, text } = await run("get_distances", {
			places: ["AB-123a", "IC1"],
			path: true,
		});
		expect(data.places[0]).toMatchObject({
			kind: "planet",
			name: "AB-123a",
			planet: "AB-123a",
		});
		expect(data.pairs).toEqual([
			{ from: "AB-123a", to: "IC1", jumps: null, route: [] },
		]);
		expect(data.order_jumps).toBeNull();
		expect(text).toBe("2 places: 1 pairs; in the order given – jumps.");
	});
});

describe("get_planet: COGC states", () => {
	it("nothing running, nothing before, no resources, no route", async () => {
		const { data, text } = await run("get_planet", {
			planet_natural_id: "AB-123a",
		});
		expect(data.cogc_boost).toBeNull();
		expect(data.last_cogc_program).toBeUndefined();
		expect(text).toBe(
			`AB-123a (AB-123a): no resources; COGC none; nearest exchange ${data.nearest_exchanges[0].exchange} (? jumps).`
		);
	});

	it("nothing running: the last program", async () => {
		const { data, text } = await run("get_planet", {
			planet_natural_id: "CD-456b",
		});
		expect(data.last_cogc_program).toMatchObject({
			program: "METALLURGY",
			ended_days_ago: 2,
		});
		expect(text).toContain(
			"COGC none now, last METALLURGY (ended 2 days ago)"
		);
	});
});

describe("list_plans: variants", () => {
	it("with_profit false only lists, an empire's plans with their empires", async () => {
		const all = await run("list_plans", { with_profit: false });
		expect(all.data.plans[0].per_day).toBeUndefined();
		expect(all.data.note).toBeUndefined();
		expect(all.text).toBe(`1 plan: ${fixtures.plan.plan_name} (KW-688c)`);
		// the empire's list comes without empires: read from the empire list
		const one = await run("list_plans", {
			with_profit: false,
			empire_uuid: EMPIRE_UUID,
		});
		expect(
			one.data.plans[0].empires.map((e: { uuid: string }) => e.uuid)
		).toContain(EMPIRE_UUID);
		expect(
			backend.requests.some((r) => r.path === "/planning/empire/")
		).toBe(true);
	});

	it("no empires: priced without empire or CX, no margin without revenue", async () => {
		const { data } = await run(
			"list_plans",
			{},
			env([
				NO_EMPIRES,
				[
					/^\/planning\/plan\/$/,
					[EMPTY, { ...fixtures.plan, empires: [] }],
				],
			])
		);
		const empty = data.plans.find(
			(p: { uuid: string }) => p.uuid === EMPTY_UUID
		);
		expect(empty).toMatchObject({
			calculated_in: null,
			cx_preference: null,
			margin_pct: null,
			in_several_empires: false,
		});
		// ranked: the base that earns comes first
		expect(data.plans[0].uuid).toBe(PLAN_UUID);
	});
});

describe("compare_plans: edge cases", () => {
	it("a plan in no empire against an empty one on another planet", async () => {
		const e = env([NO_EMPIRES]);
		const { data, text } = await run(
			"compare_plans",
			{ plan_a: PLAN_UUID, plan_b: EMPTY_UUID },
			e
		);
		expect(data.a.empire).toBeNull();
		expect(data.b.empire).toBeNull();
		expect(data.note).toContain("A: The plan's empire couldn't be loaded");
		expect(data.note).toContain(
			"B: The plan is in no empire and you have none"
		);
		expect(data.note).toContain("Different planets");
		// both in no empire: not "different empires"
		expect(data.note).not.toContain("different empires");
		// the empty base never pays back
		expect(data.b.per_day.roi_days).toBeNull();
		expect(
			data.figures.find((f: { figure: string }) => f.figure === "roi").b
		).toBeNull();
		expect(text).toMatch(/ROI [\d.]+ vs never days/);
		// B costs less to build: no payback of the difference
		expect(data.payback_of_difference.days).toBeNull();
		const reverse = await run(
			"compare_plans",
			{ plan_a: EMPTY_UUID, plan_b: PLAN_UUID },
			e
		);
		expect(reverse.text).toMatch(/ROI never vs [\d.]+ days/);
	});
});

describe("calculate_plan_variant: edge cases", () => {
	it("refuses an unknown empire and a faction without an empire", async () => {
		await expect(
			run("calculate_plan_variant", {
				plan_uuid: PLAN_UUID,
				switch_empire_uuid: UNKNOWN_EMPIRE,
			})
		).rejects.toThrow(`Unknown empire ${UNKNOWN_EMPIRE}.`);
		await expect(
			run(
				"calculate_plan_variant",
				{ plan_uuid: PLAN_UUID, faction: "MORIA" },
				env([NO_EMPIRES])
			)
		).rejects.toThrow("You have no empire to calculate in");
	});

	it("moved to a planet without resources: extraction dropped, no empire", async () => {
		const { data } = await run(
			"calculate_plan_variant",
			{ plan_uuid: PLAN_UUID, planet_natural_id: "CD-456b" },
			env([NO_EMPIRES])
		);
		expect(data.planet).toBe("CD-456b");
		expect(data.empire).toBeNull();
		expect(data.note).toContain(
			"COGC set to CD-456b's active program --- (was RESOURCE_EXTRACTION)."
		);
		expect(data.note).toContain(
			"Not possible on CD-456b, dropped: EXT: EXT#SIO, RIG: RIG#H2O."
		);
	});

	it("every building removed: never pays back, construction freed", async () => {
		const { data } = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: fixtures.plan.plan_data.buildings.map((b) => ({
				ticker: b.name,
				amount: 0,
			})),
		});
		expect(data.after.roi_days).toBeNull();
		expect(data.delta.roi_days).toBeNull();
		expect(data.delta.profit).toBeLessThan(0);
		expect(data.construction_change.freed.length).toBeGreaterThan(0);
		expect(data.construction_change.net_cost).toBeLessThan(0);
	});

	it("a new building: its new materials before 0", async () => {
		const { data } = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [
				{
					ticker: "SME",
					amount: 1,
					recipe_id: "SME#1xC 3xAUO=>2xAU",
				},
				// built from materials the plan doesn't use yet (RDE, RSE, RBH)
				{
					ticker: "ELP",
					amount: 1,
					recipe_id: "ELP#16xSEN 4xPCB=>1xSAR",
				},
			],
		});
		const au = data.changed_material_io.find(
			(m: { ticker: string }) => m.ticker === "AU"
		);
		expect(au.before).toEqual({ input: 0, output: 0, delta: 0, value: 0 });
		expect(au.after.output).toBeGreaterThan(0);
		expect(au.value_change).toBe(au.after.value);
		const rde = data.construction_change.to_buy.find(
			(m: { ticker: string }) => m.ticker === "RDE"
		);
		expect(rde.change).toBeGreaterThan(0);
		expect(rde.value).toBeCloseTo(rde.unit_price * rde.change, 1);
		expect(data.construction_change.freed).toEqual([]);
	});
});

describe("calculate_empire_variant and calculate_new_plan", () => {
	it("refuses an unknown empire; a new plan's materials start at 0", async () => {
		await expect(
			run("calculate_empire_variant", { empire_uuid: UNKNOWN_EMPIRE })
		).rejects.toThrow(`Unknown empire ${UNKNOWN_EMPIRE}.`);
		const { data } = await run("calculate_empire_variant", {
			empire_uuid: EMPIRE_UUID,
			new_plans: [
				{
					planet_natural_id: "KW-688c",
					buildings: [
						{
							ticker: "SME",
							amount: 1,
							recipe_id: "SME#1xC 3xAUO=>2xAU",
						},
					],
				},
			],
		});
		const au = data.changed_materials.find(
			(m: { ticker: string }) => m.ticker === "AU"
		);
		expect(au.before).toEqual({ delta: 0, value: 0, position: "balanced" });
		expect(au.after.position).toBe("sells surplus");
		expect(au.made_by_after[0].plan).toBe("New plan 1 (KW-688c)");
	});

	it("a new base without production never pays back", async () => {
		const { data, text } = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			buildings: [{ ticker: "FP", amount: 0 }],
			experts: [],
			empire_uuid: EMPIRE_UUID,
		});
		expect(data.per_day.roi_days).toBeNull();
		expect(text).toContain("ROI never days");
		expect(data.buildings).toEqual([]);
	});
});
