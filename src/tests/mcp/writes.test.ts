// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import {
	API_KEY,
	EMPIRE_UUID,
	PLAN_UUID,
	fakeBackend,
	fixtures,
	type IFakeBackend,
	type WriteAnswer,
} from "@/tests/mcp/fakeBackend";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Schemas
import {
	PlanCreateDataSchema,
	PlanSaveDataSchema,
} from "@/features/api/schemas/planningData.schemas";
import { EmpireMaterialIOStateSchema } from "@/features/api/schemas/empireData.schemas";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

const APP = "https://app.test";
const NEW_UUID = "11111111-2222-4333-8444-555555555555";
const SHARE_UUID = "99999999-8888-4777-8666-555555555555";
const PRUN_CX = "8eec58c8-7fcb-4bc6-bfc9-56879d297a18";
const AI1_CX = "88295b65-fe32-4634-82c2-1c94eaf22577";
const READ_ONLY: WriteAnswer = {
	status: 403,
	body: {
		detail: "This API key is read-only. Create a read-write key to change data.",
		code: "api_key_read_only",
	},
};

let backend: IFakeBackend;
let env: IToolEnv;

/** a backend whose writes answer with `onWrite`, plus extra GET routes */
function setup(
	onWrite?: (method: string, path: string, body: unknown) => WriteAnswer,
	routes: [RegExp, unknown][] = []
) {
	backend = fakeBackend(
		undefined,
		[
			...routes,
			[/^\/planning\/shared\/$/, []],
			[/^\/planning\/plan\/[^/]+\/versions\/$/, []],
		],
		onWrite
	);
	env = {
		appUrl: APP,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
}
beforeEach(() => setup());

const run = (name: string, args: Record<string, unknown> = {}): Promise<any> =>
	TOOLS.find((t) => t.name === name)!
		.run(args, env)
		.then((r) => r.data);
const writes = () => backend.requests.filter((r) => r.method !== "GET");

const NEW_PLAN = {
	planet_natural_id: "KW-688c",
	buildings: [
		{ ticker: "RIG", amount: 4, recipe_id: "RIG#H2O" },
		{ ticker: "FP", amount: 3, recipe_id: "FP#10xH2O=>7xDW" },
	],
	empire_uuid: EMPIRE_UUID,
};

describe("save_plan", () => {
	it("creates what calculate_new_plan calculated, with its summary", async () => {
		setup((method, path) =>
			method === "POST" && path === "/planning/plan/"
				? {
						body: {
							uuid: NEW_UUID,
							modified_at: "2026-11-18T00:00:00Z",
						},
					}
				: {}
		);
		const calculated = await run("calculate_new_plan", NEW_PLAN);
		const saved = await run("save_plan", {
			...NEW_PLAN,
			plan_name: "Water",
		});
		expect(saved.saved).toBe("created");
		expect(saved.plan).toEqual({
			uuid: NEW_UUID,
			name: "Water",
			planet: "KW-688c",
			url: `${APP}/plan/KW-688c/${NEW_UUID}`,
			empire: { uuid: EMPIRE_UUID, name: "Sky Productions" },
		});
		expect(saved.per_day).toEqual(calculated.per_day);
		const [post] = writes();
		expect(post.path).toBe("/planning/plan/");
		// the body the app would send, linked to the asked empire
		const body = PlanCreateDataSchema.parse(post.body);
		expect(body.empire_uuid).toBe(EMPIRE_UUID);
		expect(body.plan_name).toBe("Water");
		expect(body.plan_data.buildings.map((b) => b.name).sort()).toEqual([
			"FP",
			"RIG",
		]);
		expect(body.plan_summary!.profit).toBeCloseTo(
			calculated.per_day.profit,
			1
		);
	});

	it("without empire_uuid: saved in the empire it was calculated in", async () => {
		setup(
			(method) =>
				method === "POST"
					? { body: { uuid: NEW_UUID, modified_at: "x" } }
					: {},
			[
				[
					/^\/user\/preferences\/$/,
					{ ...preferenceDefaults, defaultEmpireUuid: EMPIRE_UUID },
				],
			]
		);
		const { empire_uuid: _e, ...args } = NEW_PLAN;
		const calculated = await run("calculate_new_plan", args);
		const saved = await run("save_plan", { ...args, plan_name: "Water" });
		expect(calculated.note).toContain("default empire");
		expect(saved.plan.empire).toEqual({
			uuid: EMPIRE_UUID,
			name: "Sky Productions",
		});
		expect(saved.per_day).toEqual(calculated.per_day);
		expect(PlanCreateDataSchema.parse(writes()[0].body).empire_uuid).toBe(
			EMPIRE_UUID
		);
	});

	it("as_new_plan into another empire: calculated there", async () => {
		setup((method) =>
			method === "POST"
				? { body: { uuid: NEW_UUID, modified_at: "x" } }
				: {}
		);
		const other = fixtures.plan.empires[1].uuid;
		const there = await run("get_plan", {
			plan_uuid: PLAN_UUID,
			empire_uuid: other,
		});
		const saved = await run("save_plan", {
			plan_uuid: PLAN_UUID,
			as_new_plan: true,
			empire_uuid: other,
		});
		expect(saved.plan.empire.uuid).toBe(other);
		expect(saved.per_day).toEqual(there.per_day);
		expect(PlanCreateDataSchema.parse(writes()[0].body).empire_uuid).toBe(
			other
		);
	});

	it("stores auto-habs on and its empire's state, as the app", async () => {
		setup((method, path) =>
			method === "POST" && path === "/planning/plan/"
				? { body: { uuid: NEW_UUID, modified_at: "x" } }
				: {}
		);
		await run("save_plan", { ...NEW_PLAN, plan_name: "Water" });
		const [, prefs, state] = writes();
		expect(prefs).toMatchObject({
			method: "PATCH",
			path: "/user/preferences/",
			body: { planOverrides: { [NEW_UUID]: { autoOptimizeHabs: true } } },
		});
		expect(state.method).toBe("PATCH");
		expect(state.path).toBe(`/planning/empire/${EMPIRE_UUID}/state/`);
		// the empire calculated as get_empire does, in the Empire page's shape
		const empire = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			limit: 500,
		});
		const body = EmpireMaterialIOStateSchema.parse(state.body);
		expect(body.metadata).toMatchObject({
			faction: "MORIA",
			plan_count: 18,
		});
		expect(Object.keys(body.empire_total).sort()).toEqual(
			empire.material_io.map((m: { ticker: string }) => m.ticker).sort()
		);
	});

	it("a version save refreshes every empire the plan is in", async () => {
		setup((method) => (method === "PUT" ? { body: fixtures.plan } : {}));
		await run("save_plan", { plan_uuid: PLAN_UUID, permits: 2 });
		expect(
			writes()
				.filter((r) => r.path.endsWith("/state/"))
				.map((r) => r.path)
				.sort()
		).toEqual(
			fixtures.plan.empires
				.map((e) => `/planning/empire/${e.uuid}/state/`)
				.sort()
		);
	});

	it("a failed state refresh doesn't fail the save", async () => {
		setup((method, path) =>
			path.endsWith("/state/")
				? { status: 500, body: {} }
				: method === "PUT"
					? { body: fixtures.plan }
					: {}
		);
		const saved = await run("save_plan", {
			plan_uuid: PLAN_UUID,
			permits: 2,
		});
		expect(saved.saved).toBe("version");
		expect(saved.note).toContain("update when the empire is opened");
	});

	it("a new plan needs a name, a planet and buildings", async () => {
		await expect(run("save_plan", NEW_PLAN)).rejects.toThrow("plan_name");
		await expect(
			run("save_plan", { plan_name: "x", planet_natural_id: "KW-688c" })
		).rejects.toThrow("buildings");
		expect(writes()).toHaveLength(0);
	});

	it("saves changes onto a plan as a version, as calculate_plan_variant", async () => {
		setup((method) => (method === "PUT" ? { body: fixtures.plan } : {}));
		const change = {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "EXT", amount: 9 }],
		};
		const variant = await run("calculate_plan_variant", change);
		const saved = await run("save_plan", {
			...change,
			version_name: "More EXT",
		});
		expect(saved.saved).toBe("version");
		expect(saved.per_day).toEqual(variant.after);
		const [put] = writes();
		expect(put.method).toBe("PUT");
		expect(put.path).toBe(`/planning/plan/${PLAN_UUID}/`);
		const body = PlanSaveDataSchema.parse(put.body);
		expect(body).toMatchObject({
			uuid: PLAN_UUID,
			plan_name: fixtures.plan.plan_name,
			version_name: "More EXT",
		});
		// unsaved app edits stay a draft: the save never claims to have seen it
		expect(put.body).not.toHaveProperty("draft_updated_at");
		expect(
			body.plan_data.buildings.find((b) => b.name === "EXT")!.amount
		).toBe(9);
		// a saved plan stays where it is: no empire link on update
		expect(body.empire_uuid).toBeUndefined();
	});

	it("as_new_plan: a copy in the empire the plan page opens with", async () => {
		setup((method) =>
			method === "POST"
				? { body: { uuid: NEW_UUID, modified_at: "x" } }
				: {}
		);
		const saved = await run("save_plan", {
			plan_uuid: PLAN_UUID,
			as_new_plan: true,
			permits: 2,
		});
		expect(saved.plan.name).toBe(`${fixtures.plan.plan_name} (copy)`);
		const body = PlanCreateDataSchema.parse(writes()[0].body);
		// no default empire: the list's first empire that holds the plan
		expect(body.empire_uuid).toBe(
			fixtures.empires.find((e) =>
				e.plans.some((p) => p.uuid === PLAN_UUID)
			)!.uuid
		);
		expect(body.plan_permits_used).toBe(2);
		// no stored setting for the source: the app's default, off
		expect(writes()[1].body).toEqual({
			planOverrides: { [NEW_UUID]: { autoOptimizeHabs: false } },
		});
	});

	it("a read-only key: nothing saved, how to get a read-write key", async () => {
		setup(() => READ_ONLY);
		await expect(
			run("save_plan", { ...NEW_PLAN, plan_name: "Water" })
		).rejects.toMatchObject({
			code: "read_only_key",
			message: expect.stringContaining("https://prunplanner.org/apikey"),
		});
	});

	it("a newer save in the app: conflict, read again", async () => {
		setup(() => ({ status: 409, body: { detail: "Conflict" } }));
		await expect(
			run("save_plan", { plan_uuid: PLAN_UUID, permits: 2 })
		).rejects.toMatchObject({
			code: "conflict",
			message: expect.stringContaining("Read it again"),
		});
	});

	it("a refused change passes the backend's reason on", async () => {
		setup(() => ({
			status: 400,
			body: { version_name: ["Too many named versions."] },
		}));
		await expect(
			run("save_plan", { plan_uuid: PLAN_UUID, version_name: "x" })
		).rejects.toThrow("version_name: Too many named versions.");
	});
});

describe("restore_plan_version", () => {
	it("activates the version without claiming a draft", async () => {
		setup(() => ({ body: fixtures.plan }));
		const data = await run("restore_plan_version", {
			plan_uuid: PLAN_UUID,
			version_uuid: NEW_UUID,
		});
		expect(data.plan.uuid).toBe(PLAN_UUID);
		expect(writes()[0]).toMatchObject({
			method: "POST",
			path: `/planning/plan/${PLAN_UUID}/versions/${NEW_UUID}/activate/`,
			body: { draft_updated_at: null },
		});
		// the restored plan's empires get their state stored
		expect(
			writes()
				.filter((r) => r.path.endsWith("/state/"))
				.map((r) => r.path)
				.sort()
		).toEqual(
			fixtures.plan.empires
				.map((e) => `/planning/empire/${e.uuid}/state/`)
				.sort()
		);
	});
});

describe("save_empire", () => {
	it("creates with the app's defaults", async () => {
		setup((method, path) =>
			path === "/planning/empire/"
				? { body: { ...fixtures.empires[0], uuid: EMPIRE_UUID } }
				: {}
		);
		await run("save_empire", { name: "New" });
		expect(writes()[0]).toMatchObject({
			method: "POST",
			path: "/planning/empire/",
			body: {
				empire_name: "New",
				empire_faction: "NONE",
				empire_permits_used: 1,
				empire_permits_total: 2,
			},
		});
	});

	it("changes, sets plans and moves the CX without touching other empires", async () => {
		setup((method, path) =>
			path.includes("junctions")
				? {
						body: path.includes("/cx/")
							? fixtures.cxs
							: fixtures.empires,
					}
				: { body: { ...fixtures.empires[0], modified_at: "x" } }
		);
		const data = await run("save_empire", {
			empire_uuid: EMPIRE_UUID,
			name: "Sky 2",
			plans: { set: [PLAN_UUID] },
			cx_preference_uuid: AI1_CX,
		});
		expect(data.changed).toEqual([
			"name, faction and permits",
			"plans",
			"CX preference",
		]);
		const [put, plans, cx] = writes();
		expect(put).toMatchObject({
			method: "PUT",
			path: `/planning/empire/${EMPIRE_UUID}/`,
			body: {
				empire_name: "Sky 2",
				empire_faction: "MORIA",
				base_modified_at: expect.any(String),
			},
		});
		expect(plans.body).toEqual([
			{
				empire_uuid: EMPIRE_UUID,
				baseplanners: [{ baseplanner_uuid: PLAN_UUID }],
			},
		]);
		const map = Object.fromEntries(
			(
				cx.body as {
					cx_uuid: string;
					empires: { empire_uuid: string }[];
				}[]
			).map((j) => [
				j.cx_uuid,
				j.empires.map((e) => e.empire_uuid).sort(),
			])
		);
		// this empire moved; the others kept theirs
		expect(map[AI1_CX]).toEqual(
			[EMPIRE_UUID, fixtures.cxs[3].empires[0].uuid].sort()
		);
		expect(map[PRUN_CX]).not.toContain(EMPIRE_UUID);
		// faction, permits and plans changed: its state is stored
		expect(writes().filter((r) => r.path.endsWith("/state/"))).toEqual([
			expect.objectContaining({
				path: `/planning/empire/${EMPIRE_UUID}/state/`,
			}),
		]);
		expect(map[PRUN_CX]).toHaveLength(2);
		expect(map["41c6f4dc-d1cd-4bde-b61a-c1595101d980"]).toHaveLength(2);
	});

	it("unknown plans and CX preferences are refused before any write", async () => {
		await expect(
			run("save_empire", {
				empire_uuid: EMPIRE_UUID,
				plans: { add: [NEW_UUID] },
			})
		).rejects.toThrow("Unknown plans");
		await expect(
			run("save_empire", {
				empire_uuid: EMPIRE_UUID,
				cx_preference_uuid: NEW_UUID,
			})
		).rejects.toThrow("Unknown CX preference");
		expect(writes()).toHaveLength(0);
	});
});

describe("save_cx_preference", () => {
	it("replaces only the given sections and sets exactly its empires", async () => {
		setup((method, path) => {
			if (path.includes("junctions")) return { body: fixtures.cxs };
			return { body: fixtures.cxs[0] };
		});
		await run("save_cx_preference", {
			cx_uuid: PRUN_CX,
			exchanges: [{ type: "BOTH", exchange: "AI1_30D" }],
			planet_exchanges: [
				{
					planet: "Etherwind",
					preferences: [{ type: "BUY", exchange: "AI1_ASK" }],
				},
			],
			empires: [EMPIRE_UUID],
		});
		const [put, junctions] = writes();
		const before = fixtures.cxs[0].cx_data;
		expect(put.path).toBe(`/planning/cx/${PRUN_CX}/`);
		expect(put.body).toMatchObject({
			cx_name: "PRUN CX REAL",
			base_modified_at: fixtures.cxs[0].modified_at,
			cx_data: {
				cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
				ticker_empire: before.ticker_empire,
				ticker_planets: before.ticker_planets,
			},
		});
		const planets = (put.body as any).cx_data.cx_planets;
		expect(planets.find((p: any) => p.planet === "KW-688c")).toEqual({
			planet: "KW-688c",
			preferences: [{ type: "BUY", exchange: "AI1_ASK" }],
		});
		const map = Object.fromEntries(
			(junctions.body as any[]).map((j) => [
				j.cx_uuid,
				j.empires.map((e: any) => e.empire_uuid),
			])
		);
		expect(map[PRUN_CX]).toEqual([EMPIRE_UUID]);
		expect(map[AI1_CX]).toHaveLength(1);
	});

	it("checks materials before saving", async () => {
		await expect(
			run("save_cx_preference", {
				name: "x",
				ticker_prices: [{ ticker: "ZZZ", type: "BUY", value: 1 }],
			})
		).rejects.toThrow("Unknown materials: ZZZ");
		expect(writes()).toHaveLength(0);
	});
});

describe("sharing", () => {
	it("share_plan: a link with the plan's summary, or the existing one", async () => {
		setup(() => ({
			body: { uuid: SHARE_UUID, view_count: 0, created_at: "2026-11-18" },
		}));
		const data = await run("share_plan", { plan_uuid: PLAN_UUID });
		expect(data.share.url).toBe(`${APP}/shared/${SHARE_UUID}`);
		expect(writes()[0]).toMatchObject({
			path: "/planning/shared/",
			body: {
				plan: PLAN_UUID,
				plan_summary: { v: 1, profit: expect.any(Number) },
			},
		});

		setup(undefined, [
			[
				/^\/planning\/shared\/$/,
				[
					{
						uuid: SHARE_UUID,
						plan: PLAN_UUID,
						view_count: 3,
						created_at: "2026-11-18",
					},
				],
			],
		]);
		const again = await run("share_plan", { plan_uuid: PLAN_UUID });
		expect(again.share.views).toBe(3);
		expect(writes()).toHaveLength(0);
	});

	it("copy_shared_plan: created like the app's Copy, auto-habs off", async () => {
		setup(
			(method, path) =>
				method === "POST" && path === "/planning/plan/"
					? { body: { uuid: NEW_UUID, modified_at: "x" } }
					: {},
			[
				[
					new RegExp(`^/planning/shared/${SHARE_UUID}/$`),
					{
						uuid: SHARE_UUID,
						created_at: "2026-11-18T00:00:00Z",
						view_count: 1,
						plan_details: fixtures.plan,
					},
				],
			]
		);
		const data = await run("copy_shared_plan", {
			share: `https://prunplanner.org/shared/${SHARE_UUID}`,
			empire_uuid: EMPIRE_UUID,
		});
		const there = await run("get_plan", {
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
		});
		expect(data.plan).toMatchObject({
			uuid: NEW_UUID,
			name: `${fixtures.plan.plan_name} (Copy)`,
			empire: { uuid: EMPIRE_UUID },
		});
		expect(data.per_day).toEqual(there.per_day);
		const [post, prefs] = writes();
		const body = PlanCreateDataSchema.parse(post.body);
		expect(body).toMatchObject({
			plan_name: `${fixtures.plan.plan_name} (Copy)`,
			empire_uuid: EMPIRE_UUID,
			plan_data: fixtures.plan.plan_data,
		});
		expect(body.plan_summary).toBeDefined();
		expect(prefs.body).toEqual({
			planOverrides: { [NEW_UUID]: { autoOptimizeHabs: false } },
		});
	});
});

describe("delete", () => {
	it("deletes nothing without confirm, then deletes", async () => {
		const preview = await run("delete", { kind: "plan", uuid: PLAN_UUID });
		expect(preview.deleted).toBe(false);
		expect(preview.would_delete).toContain(fixtures.plan.plan_name);
		expect(preview.would_delete).toContain("can't be undone");
		expect(writes()).toHaveLength(0);

		const done = await run("delete", {
			kind: "plan",
			uuid: PLAN_UUID,
			confirm: true,
		});
		expect(done.deleted).toBe(true);
		const [del, ...states] = writes();
		expect(del).toMatchObject({
			method: "DELETE",
			path: `/planning/plan/${PLAN_UUID}/`,
		});
		// its empires' stored state is refreshed, as the Empire page would
		expect(states.map((r) => r.path).sort()).toEqual(
			fixtures.plan.empires
				.map((e) => `/planning/empire/${e.uuid}/state/`)
				.sort()
		);
	});

	it("an empire keeps its plans; unknown uuids are refused", async () => {
		const preview = await run("delete", {
			kind: "empire",
			uuid: EMPIRE_UUID,
		});
		expect(preview.would_delete).toContain("18 plans stay");
		await expect(
			run("delete", {
				kind: "cx_preference",
				uuid: NEW_UUID,
				confirm: true,
			})
		).rejects.toThrow("Unknown CX preference");
		expect(writes()).toHaveLength(0);
	});
});

describe("set_preferences", () => {
	it("patches only what was given", async () => {
		setup(() => ({
			body: { ...preferenceDefaults, defaultEmpireUuid: EMPIRE_UUID },
		}));
		const data = await run("set_preferences", {
			default_empire_uuid: EMPIRE_UUID,
		});
		expect(writes()[0]).toMatchObject({
			method: "PATCH",
			path: "/user/preferences/",
			body: { defaultEmpireUuid: EMPIRE_UUID },
		});
		expect(Object.keys(writes()[0].body as object)).toEqual([
			"defaultEmpireUuid",
		]);
		expect(data.default_empire.name).toBe("Sky Productions");
	});

	it("refuses unknown uuids and an empty call", async () => {
		await expect(
			run("set_preferences", { default_empire_uuid: NEW_UUID })
		).rejects.toThrow("Unknown empire");
		await expect(run("set_preferences", {})).rejects.toThrow(
			"Nothing to set"
		);
		expect(writes()).toHaveLength(0);
	});
});
