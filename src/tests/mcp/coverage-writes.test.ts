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

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

const APP = "https://app.test";
const NEW_UUID = "11111111-2222-4333-8444-555555555555";
const SHARE_UUID = "99999999-8888-4777-8666-555555555555";
const OTHER_PLAN = "77777777-6666-4555-8444-333333333333";
const PRUN_CX = "8eec58c8-7fcb-4bc6-bfc9-56879d297a18";
const SHARE_CX = "41c6f4dc-d1cd-4bde-b61a-c1595101d980";
const NORWICK_CX = "4907f10d-982e-4f6c-b068-221bd0fb8b86";
// an empire no CX preference uses
const RFAB = "2eac235a-9f8d-4994-8c71-933c31127423";
const STALE = "update when the empire is opened";
const plan = fixtures.plan;
const PLAN_PATH = new RegExp(`^/planning/plan/${PLAN_UUID}/$`);
const planNoEmpires = { ...plan, empires: undefined };

let backend: IFakeBackend;
let env: IToolEnv;

/** fails GETs of `missing` with `status` (404: like the backend for a plan of another user) */
function setup(
	onWrite?: (method: string, path: string, body: unknown) => WriteAnswer,
	routes: [RegExp, unknown][] = [],
	missing?: RegExp,
	status = 404
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
	const inner = backend.fetch;
	const fetch: typeof globalThis.fetch = async (input, init) =>
		missing &&
		(init?.method ?? "GET") === "GET" &&
		missing.test(new URL(String(input)).pathname)
			? new Response("{}", { status })
			: inner(input, init);
	env = {
		appUrl: APP,
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch,
		}),
	};
}
beforeEach(() => setup());

const call = (name: string, args: Record<string, unknown> = {}) =>
	TOOLS.find((t) => t.name === name)!.run(args, env) as Promise<{
		text: string;
		data: any;
	}>;
const writes = () => backend.requests.filter((r) => r.method !== "GET");
const statePaths = () =>
	writes()
		.filter((r) => r.path.endsWith("/state/"))
		.map((r) => r.path);
/** state stores fail, everything else answers `answer` */
const failingState =
	(answer: WriteAnswer = {}) =>
	(_m: string, path: string): WriteAnswer =>
		path.endsWith("/state/") ? { status: 500, body: {} } : answer;

describe("delete: every kind", () => {
	it("a plan in no empire: no empire named, no state stored", async () => {
		setup(undefined, [[PLAN_PATH, planNoEmpires]]);
		const preview = await call("delete", { kind: "plan", uuid: PLAN_UUID });
		expect(preview.data.would_delete).toBe(
			`the plan "${plan.plan_name}" on ${plan.planet_natural_id}, with its 0 saved versions and any share link. This can't be undone.`
		);
		expect(preview.text).toContain("confirm: true");

		const done = await call("delete", {
			kind: "plan",
			uuid: PLAN_UUID,
			confirm: true,
		});
		expect(done.data).toMatchObject({ deleted: true, kind: "plan" });
		expect(writes()).toEqual([
			expect.objectContaining({
				method: "DELETE",
				path: `/planning/plan/${PLAN_UUID}/`,
			}),
		]);
	});

	it("a plan whose empires can't be stored says so", async () => {
		setup(failingState());
		const done = await call("delete", {
			kind: "plan",
			uuid: PLAN_UUID,
			confirm: true,
		});
		expect(done.text).toContain(STALE);
		expect(done.text).toContain(
			`taken out of ${plan.empires[0].empire_name}`
		);
	});

	it("an empire: preview, delete, unknown", async () => {
		const done = await call("delete", {
			kind: "empire",
			uuid: RFAB,
			confirm: true,
		});
		expect(done.text).toBe(
			`Deleted the empire "RFab Plan". Its 1 plan stay, just no longer in this empire. This can't be undone.`
		);
		expect(writes()).toEqual([
			expect.objectContaining({
				method: "DELETE",
				path: `/planning/empire/${RFAB}/`,
				body: undefined,
			}),
		]);
		await expect(
			call("delete", { kind: "empire", uuid: NEW_UUID })
		).rejects.toThrow(`Unknown empire ${NEW_UUID}.`);
	});

	it("a CX preference names the empires falling back to Universe prices", async () => {
		const used = await call("delete", {
			kind: "cx_preference",
			uuid: PRUN_CX,
		});
		expect(used.data.would_delete).toBe(
			`the CX preference "PRUN CX REAL"; PRUN REAL, Sky Productions, CAAP 3 will be priced at Universe VWAP 30D until given another. This can't be undone.`
		);
		const unused = await call("delete", {
			kind: "cx_preference",
			uuid: NORWICK_CX,
			confirm: true,
		});
		expect(unused.data.what).toBe(
			`the CX preference "CX Norwick Scheme". This can't be undone.`
		);
		expect(writes()[0]).toMatchObject({
			method: "DELETE",
			path: `/planning/cx/${NORWICK_CX}/`,
		});
	});

	it("a share link: with its plan's name, or without when the plan is gone", async () => {
		const shares = [
			{
				uuid: SHARE_UUID,
				plan: PLAN_UUID,
				view_count: 3,
				created_at: "2026-11-18",
			},
			{
				uuid: NEW_UUID,
				plan: OTHER_PLAN,
				view_count: 1,
				created_at: "2026-11-18",
			},
		];
		setup(
			undefined,
			[[/^\/planning\/shared\/$/, shares]],
			new RegExp(`^/planning/plan/${OTHER_PLAN}/$`)
		);
		const done = await call("delete", {
			kind: "share",
			uuid: SHARE_UUID,
			confirm: true,
		});
		expect(done.data.what).toBe(
			`the share link ${APP}/shared/${SHARE_UUID} of "${plan.plan_name}" (3 views); it stops working, the plan stays. Sharing again makes a new link.`
		);
		expect(writes()).toEqual([
			expect.objectContaining({
				method: "DELETE",
				path: `/planning/shared/${SHARE_UUID}/`,
			}),
		]);

		const orphan = await call("delete", { kind: "share", uuid: NEW_UUID });
		expect(orphan.data).toMatchObject({ deleted: false, kind: "share" });
		expect(orphan.data.would_delete).toBe(
			`the share link ${APP}/shared/${NEW_UUID} (1 view); it stops working, the plan stays. Sharing again makes a new link.`
		);

		await expect(
			call("delete", { kind: "share", uuid: OTHER_PLAN, confirm: true })
		).rejects.toThrow(`Unknown share ${OTHER_PLAN}.`);
		expect(writes()).toHaveLength(1);
	});

	it("an invalid uuid is refused by the input schema", () => {
		const tool = TOOLS.find((t) => t.name === "delete")!;
		expect(
			tool.inputSchema.safeParse({ kind: "plan", uuid: "not-a-uuid" })
				.success
		).toBe(false);
		expect(
			tool.inputSchema.safeParse({ kind: "folder", uuid: PLAN_UUID })
				.success
		).toBe(false);
	});
});

describe("save_cx_preference: create and partial updates", () => {
	/** POST/PUT answer: the saved CX as sent, used by `empires` */
	const echo =
		(uuid: string, empires: unknown[] = []) =>
		(method: string, path: string, body: any): WriteAnswer =>
			path === "/planning/cx/junctions/"
				? { body: fixtures.cxs }
				: {
						body: {
							uuid,
							modified_at: "2026-11-19T00:00:00Z",
							cx_name: body.cx_name,
							cx_data: body.cx_data,
							empires,
						},
					};

	it("creates with upper-cased tickers and empty sections", async () => {
		setup(echo(NEW_UUID));
		const { text, data } = await call("save_cx_preference", {
			name: "Fixed",
			ticker_prices: [{ ticker: "h2o", type: "BUY", value: 30 }],
			planet_ticker_prices: [
				{
					planet: "Etherwind",
					preferences: [{ ticker: "dw", type: "SELL", value: 90 }],
				},
			],
		});
		const [post] = writes();
		expect(post).toMatchObject({
			method: "POST",
			path: "/planning/cx/",
			body: {
				cx_name: "Fixed",
				cx_data: {
					cx_empire: [],
					cx_planets: [],
					ticker_empire: [{ ticker: "H2O", type: "BUY", value: 30 }],
					ticker_planets: [
						{
							planet: "KW-688c",
							preferences: [
								{ ticker: "DW", type: "SELL", value: 90 },
							],
						},
					],
				},
			},
		});
		expect(post.body).not.toHaveProperty("base_modified_at");
		expect(text).toBe(
			'Created the CX preference "Fixed": no exchange set (Universe VWAP 30D); 1 fixed price; 1 planet with own prices. Used by no empire.'
		);
		expect(data.cx_preference).toMatchObject({
			uuid: NEW_UUID,
			name: "Fixed",
			empires: [],
		});
	});

	it("a new preference with empires: assigned next to the existing ones", async () => {
		const saved = (body: any) => ({
			uuid: NEW_UUID,
			modified_at: "x",
			cx_name: body.cx_name,
			cx_data: body.cx_data,
			empires: [],
		});
		setup((method, path, body: any) =>
			path === "/planning/cx/junctions/"
				? {
						// the backend's answer: the new one used by Sky Productions
						body: [
							...fixtures.cxs,
							{
								...saved({
									cx_name: "AI1",
									cx_data: {
										cx_empire: [],
										cx_planets: [],
										ticker_empire: [],
										ticker_planets: [],
									},
								}),
								empires: [fixtures.empires[3]],
							},
						],
					}
				: { body: saved(body) }
		);
		const { text } = await call("save_cx_preference", {
			name: "AI1",
			exchanges: [{ type: "BOTH", exchange: "AI1_30D" }],
			empires: [EMPIRE_UUID],
		});
		const junctions = writes()[1];
		expect(junctions.path).toBe("/planning/cx/junctions/");
		const map = Object.fromEntries(
			(junctions.body as any[]).map((j) => [
				j.cx_uuid,
				j.empires.map((e: any) => e.empire_uuid),
			])
		);
		// the new preference is in the list sent, with only the asked empire
		expect(map[NEW_UUID]).toEqual([EMPIRE_UUID]);
		expect(map[PRUN_CX]).not.toContain(EMPIRE_UUID);
		expect(text).toBe(
			'Created the CX preference "AI1": BOTH AI1_30D. Used by Sky Productions.'
		);
	});

	it("[] removes a planet's exchanges; a junction answer without it: no empire", async () => {
		const share = fixtures.cxs[1];
		setup((method, path, body) =>
			path === "/planning/cx/junctions/"
				? { body: fixtures.cxs.filter((c) => c.uuid !== SHARE_CX) }
				: echo(SHARE_CX, share.empires)(method, path, body)
		);
		const { text, data } = await call("save_cx_preference", {
			cx_uuid: SHARE_CX,
			planet_exchanges: [{ planet: "KI-446b", preferences: [] }],
			empires: [],
		});
		const [put, junctions] = writes();
		expect(put).toMatchObject({
			method: "PUT",
			path: `/planning/cx/${SHARE_CX}/`,
			body: {
				cx_name: "Share CX",
				base_modified_at: share.modified_at,
				cx_data: { ...share.cx_data, cx_planets: [] },
			},
		});
		// its two empires were not asked for: both lose it
		expect(
			(junctions.body as any[]).find((j) => j.cx_uuid === SHARE_CX)
				.empires
		).toEqual([]);
		expect(text).toBe(
			'Saved the CX preference "Share CX": BOTH UNIVERSE_30D. Used by no empire.'
		);
		expect(data.cx_preference.empires).toEqual([]);
	});

	it("a rename keeps every section; planet exchanges are counted", async () => {
		const share = fixtures.cxs[1];
		setup(echo(SHARE_CX, share.empires));
		const { text } = await call("save_cx_preference", {
			cx_uuid: SHARE_CX,
			name: "Renamed",
		});
		expect(writes()[0].body).toEqual({
			cx_name: "Renamed",
			cx_data: share.cx_data,
			base_modified_at: share.modified_at,
		});
		expect(text).toBe(
			'Saved the CX preference "Renamed": BOTH UNIVERSE_30D; 1 planet with own exchanges. Used by Share, meow.'
		);
	});

	it("refuses an unknown preference, a nameless new one and unknown empires", async () => {
		await expect(
			call("save_cx_preference", { cx_uuid: NEW_UUID, name: "x" })
		).rejects.toThrow(`Unknown CX preference ${NEW_UUID}.`);
		await expect(
			call("save_cx_preference", {
				exchanges: [{ type: "BOTH", exchange: "AI1_30D" }],
			})
		).rejects.toThrow("A new CX preference needs a name.");
		await expect(
			call("save_cx_preference", {
				name: "x",
				empires: [EMPIRE_UUID, NEW_UUID],
			})
		).rejects.toThrow(`Unknown empires: ${NEW_UUID}.`);
		expect(writes()).toHaveLength(0);
	});
});

describe("save_empire: create, partial updates, clears", () => {
	it("nothing given: no write, says nothing changed", async () => {
		const { text, data } = await call("save_empire", { empire_uuid: RFAB });
		expect(writes()).toHaveLength(0);
		expect(data.changed).toEqual([]);
		expect(data.empire).toMatchObject({
			uuid: RFAB,
			name: "RFab Plan",
			cx_preference: null,
		});
		expect(data).not.toHaveProperty("note");
		expect(text).toBe(
			`Saved "RFab Plan" (nothing changed): MORIA, permits 25/25, 1 plan, CX preference none. ${APP}/empire/${RFAB}`
		);
	});

	it("cx_preference_uuid null takes the empire out of every preference", async () => {
		setup(() => ({ body: fixtures.cxs }));
		const { data } = await call("save_empire", {
			empire_uuid: EMPIRE_UUID,
			cx_preference_uuid: null,
		});
		expect(data.changed).toEqual(["CX preference"]);
		const [junctions] = writes();
		expect(junctions.path).toBe("/planning/cx/junctions/");
		const all = (junctions.body as any[]).flatMap((j) =>
			j.empires.map((e: any) => e.empire_uuid)
		);
		expect(all).not.toContain(EMPIRE_UUID);
		// the others keep theirs
		expect(all).toContain("cfddf9ec-6f9b-4c74-affb-bd55fd1f8aa6");
		// nothing that changes production: no state stored
		expect(statePaths()).toEqual([]);
	});

	it("add and remove change the current plan list", async () => {
		setup(() => ({ body: fixtures.empires }));
		const current = fixtures.empires[3].plans.map((p) => p.uuid);
		const { data } = await call("save_empire", {
			empire_uuid: EMPIRE_UUID,
			plans: { remove: [current[0]] },
		});
		expect(data.changed).toEqual(["plans"]);
		const [junction] = writes();
		expect(junction.body).toEqual([
			{
				empire_uuid: EMPIRE_UUID,
				baseplanners: current
					.slice(1)
					.map((p) => ({ baseplanner_uuid: p })),
			},
		]);
		// plans changed: its state is stored
		expect(statePaths()).toEqual([
			`/planning/empire/${EMPIRE_UUID}/state/`,
		]);
	});

	it("a new empire with plans.add starts from no plans; a failed state store is a note", async () => {
		setup((method, path) =>
			path.endsWith("/state/")
				? { status: 500, body: {} }
				: path === "/planning/empire/"
					? { body: { ...fixtures.empires[3], uuid: EMPIRE_UUID } }
					: { body: fixtures.empires }
		);
		const { text, data } = await call("save_empire", {
			name: "Fresh",
			faction: "ANTARES",
			permits_used: 2,
			permits_total: 4,
			plans: { add: [PLAN_UUID] },
		});
		const [post, junction] = writes();
		expect(post.body).toEqual({
			empire_name: "Fresh",
			empire_faction: "ANTARES",
			empire_permits_used: 2,
			empire_permits_total: 4,
		});
		expect(junction.body).toEqual([
			{
				empire_uuid: EMPIRE_UUID,
				baseplanners: [{ baseplanner_uuid: PLAN_UUID }],
			},
		]);
		expect(data.changed).toEqual(["created", "plans"]);
		expect(data.note).toContain(STALE);
		expect(text).toMatch(/^Created the empire "Sky Productions": MORIA/);
	});

	it("refuses unknown, nameless and over-permitted empires before writing", async () => {
		await expect(
			call("save_empire", { empire_uuid: NEW_UUID, name: "x" })
		).rejects.toThrow(`Unknown empire ${NEW_UUID}.`);
		await expect(call("save_empire", { faction: "MORIA" })).rejects.toThrow(
			"A new empire needs a name."
		);
		await expect(
			call("save_empire", { name: "x", permits_used: 3 })
		).rejects.toThrow("Permits used (3) can't exceed permits total (2).");
		await expect(
			call("save_empire", { empire_uuid: RFAB, permits_total: 20 })
		).rejects.toThrow("Permits used (25) can't exceed permits total (20).");
		expect(writes()).toHaveLength(0);
	});

	it("an empire missing after the save is an error", async () => {
		setup(() => ({ body: { ...fixtures.empires[0], uuid: NEW_UUID } }));
		await expect(call("save_empire", { name: "Ghost" })).rejects.toThrow(
			`Empire ${NEW_UUID} not found after saving.`
		);
		expect(writes()[0].path).toBe("/planning/empire/");
	});
});

describe("set_preferences: CX default, clears, CX buying", () => {
	it("null clears the default empire, sets the CX preference and buying off", async () => {
		setup(() => ({
			body: {
				...preferenceDefaults,
				defaultEmpireUuid: null,
				defaultCXUuid: PRUN_CX,
				defaultBuyItemsFromCX: false,
			},
		}));
		const { text, data } = await call("set_preferences", {
			default_empire_uuid: null,
			default_cx_uuid: PRUN_CX,
			buy_items_from_cx: false,
		});
		expect(writes()).toEqual([
			expect.objectContaining({
				method: "PATCH",
				path: "/user/preferences/",
				body: {
					defaultEmpireUuid: null,
					defaultCXUuid: PRUN_CX,
					defaultBuyItemsFromCX: false,
				},
			}),
		]);
		expect(text).toBe(
			'Planning defaults: default empire none, default CX preference "PRUN CX REAL", buy items from CX off.'
		);
		expect(data).toMatchObject({
			default_empire: null,
			default_cx_preference: { uuid: PRUN_CX, name: "PRUN CX REAL" },
			buy_items_from_cx: false,
		});
	});

	it("clearing the CX default keeps the rest; an unknown CX is refused", async () => {
		setup(() => ({ body: preferenceDefaults }));
		const { text, data } = await call("set_preferences", {
			default_cx_uuid: null,
		});
		expect(writes()[0].body).toEqual({ defaultCXUuid: null });
		expect(data.default_cx_preference).toBeNull();
		expect(text).toContain("buy items from CX on");
		await expect(
			call("set_preferences", { default_cx_uuid: NEW_UUID })
		).rejects.toThrow(`Unknown CX preference ${NEW_UUID}.`);
		expect(writes()).toHaveLength(1);
	});
});

describe("save_plan: no empire, plans without empires, failed state", () => {
	const NEW_PLAN = {
		planet_natural_id: "KW-688c",
		buildings: [{ ticker: "RIG", amount: 4, recipe_id: "RIG#H2O" }],
		plan_name: "Water",
	};
	const created: WriteAnswer = { body: { uuid: NEW_UUID, modified_at: "x" } };

	it("a new plan without a pickable empire: in no empire, with the choices", async () => {
		setup((method, path) =>
			path === "/planning/plan/" ? created : { body: preferenceDefaults }
		);
		const { text, data } = await call("save_plan", NEW_PLAN);
		expect(text).toMatch(/^Created "Water" on KW-688c in no empire:/);
		expect(data.plan.empire).toBeNull();
		expect(data.empire_choices).toHaveLength(fixtures.empires.length);
		expect(writes()[0].body).not.toHaveProperty("empire_uuid");
		// no empire: no state to store
		expect(statePaths()).toEqual([]);
	});

	it("a new plan whose empire state can't be stored says so", async () => {
		setup(failingState(created));
		const { data } = await call("save_plan", {
			...NEW_PLAN,
			empire_uuid: EMPIRE_UUID,
		});
		expect(data.saved).toBe("created");
		expect(data.note).toContain(STALE);
	});

	it("a version of a plan in no empire stores no state", async () => {
		setup(() => ({ body: fixtures.plan }), [[PLAN_PATH, planNoEmpires]]);
		const { data } = await call("save_plan", {
			plan_uuid: PLAN_UUID,
			plan_name: "Renamed",
		});
		expect(data.saved).toBe("version");
		expect(writes().map((r) => r.method)).toEqual(["PUT"]);
		expect(writes()[0].body).toMatchObject({ plan_name: "Renamed" });
		// no version name given: none sent
		expect(writes()[0].body).not.toHaveProperty("version_name");
	});

	it("a copy for a user without empires: in no empire", async () => {
		setup(
			(method, path) =>
				path === "/planning/plan/"
					? created
					: { body: preferenceDefaults },
			[
				[PLAN_PATH, planNoEmpires],
				[/^\/planning\/empire\/$/, []],
			]
		);
		const { text, data } = await call("save_plan", {
			plan_uuid: PLAN_UUID,
			as_new_plan: true,
		});
		expect(text).toMatch(
			new RegExp(
				`^Saved as the new plan "${plan.plan_name} \\(copy\\)" on KW-688c in no empire:`
			)
		);
		expect(data.saved).toBe("copy");
		expect(data.plan.empire).toBeNull();
	});
});

describe("sharing: no empire, other users' plans, bad links", () => {
	const SHARED_PATH = new RegExp(`^/planning/shared/${SHARE_UUID}/$`);
	const shared = {
		uuid: SHARE_UUID,
		created_at: "2026-11-18T00:00:00Z",
		view_count: 4,
		plan_details: plan,
	};

	it("copy_shared_plan without a pickable empire: in no empire", async () => {
		setup(
			(method, path) =>
				path === "/planning/plan/"
					? { body: { uuid: NEW_UUID, modified_at: "x" } }
					: { body: preferenceDefaults },
			[[SHARED_PATH, shared]]
		);
		const { text, data } = await call("copy_shared_plan", {
			share: SHARE_UUID,
			plan_name: "Mine now",
		});
		expect(text).toMatch(/^Copied as "Mine now" on KW-688c in no empire:/);
		expect(data.plan).toMatchObject({ uuid: NEW_UUID, empire: null });
		expect(data.empire_choices).toHaveLength(fixtures.empires.length);
		expect(writes()[0].body).toMatchObject({ plan_name: "Mine now" });
	});

	it("copy_shared_plan into an empire with every write answered: no note", async () => {
		setup(
			(method, path) =>
				path === "/planning/plan/"
					? { body: { uuid: NEW_UUID, modified_at: "x" } }
					: { body: preferenceDefaults },
			[[SHARED_PATH, shared]]
		);
		const { data } = await call("copy_shared_plan", {
			share: `${APP}/shared/${SHARE_UUID}`,
			empire_uuid: EMPIRE_UUID,
		});
		expect(data.note).toBeNull();
		expect(data.plan.empire).toEqual({
			uuid: EMPIRE_UUID,
			name: "Sky Productions",
		});
	});

	it("a link without a uuid is refused before any request", async () => {
		await expect(
			call("copy_shared_plan", {
				share: "https://prunplanner.org/shared/",
			})
		).rejects.toThrow(
			'No share uuid in "https://prunplanner.org/shared/".'
		);
		await expect(call("get_shared_plan", { share: "abc" })).rejects.toThrow(
			'No share uuid in "abc".'
		);
		expect(backend.requests).toHaveLength(0);
	});

	it("get_shared_plan of another user's plan in a chosen empire: the share link", async () => {
		setup(undefined, [[SHARED_PATH, shared]], PLAN_PATH);
		const { data } = await call("get_shared_plan", {
			share: SHARE_UUID,
			empire_uuid: RFAB,
		});
		expect(data.plan).toMatchObject({
			uuid: null,
			url: `${APP}/shared/${SHARE_UUID}`,
		});
		expect(data.share).toEqual({
			uuid: SHARE_UUID,
			url: `${APP}/shared/${SHARE_UUID}`,
			views: 4,
			own_plan: false,
		});
		expect(data.empire).toMatchObject({ uuid: RFAB });
	});

	it("get_shared_plan: a failing plan lookup is not taken for another user's plan", async () => {
		setup(undefined, [[SHARED_PATH, shared]], PLAN_PATH, 503);
		await expect(
			call("get_shared_plan", { share: SHARE_UUID })
		).rejects.toMatchObject({
			code: "backend_error",
			message: `PRUNplanner's API answered 503 for /planning/plan/${PLAN_UUID}/.`,
		});
	});
});

describe("get_empire: edge rows", () => {
	const idle = {
		...plan,
		empires: undefined,
		plan_data: { ...plan.plan_data, buildings: [] },
	};

	it("a plan without production has no margin and no ROI; rows by ticker", async () => {
		setup(undefined, [
			[/^\/planning\/empire\/[^/]+\/plans\/$/, [idle, planNoEmpires]],
		]);
		const { data } = await call("get_empire", {
			empire_uuid: EMPIRE_UUID,
			sort: "ticker",
			limit: 500,
		});
		const [none, full] = data.plans;
		expect(none).toMatchObject({ margin_pct: null, roi_days: null });
		expect(full.margin_pct).toBeGreaterThan(0);
		const tickers = data.material_io.map(
			(m: { ticker: string }) => m.ticker
		);
		expect(tickers).toEqual(
			[...tickers].sort((a, b) => a.localeCompare(b))
		);
	});

	it("an unknown empire is refused", async () => {
		await expect(
			call("get_empire", { empire_uuid: NEW_UUID })
		).rejects.toThrow(`Unknown empire ${NEW_UUID}.`);
	});
});

describe("plan versions: empty, losses, single empire, restore", () => {
	const OLD = "33333333-3333-4333-8333-333333333333";
	const NOW = "44444444-4444-4444-8444-444444444444";
	const version = (uuid: string, name: string, fp: number) => ({
		uuid,
		kind: "save",
		name,
		created_at: "2026-11-01T10:00:00Z",
		source_version: null,
		is_active: false,
		data_bytes: 100,
		plan_name: plan.plan_name,
		planet_natural_id: plan.planet_natural_id,
		plan_corphq: plan.plan_corphq,
		plan_cogc: plan.plan_cogc,
		plan_permits_used: plan.plan_permits_used,
		plan_data: {
			...plan.plan_data,
			buildings: plan.plan_data.buildings.map((b) =>
				b.name === "FP" ? { ...b, amount: fp } : b
			),
		},
	});
	const versionRoutes: [RegExp, unknown][] = [
		[new RegExp(`/versions/${OLD}/$`), version(OLD, "", 15)],
		[new RegExp(`/versions/${NOW}/$`), version(NOW, "Now", 19)],
	];

	it("list_plan_versions: none saved", async () => {
		const { text, data } = await call("list_plan_versions", {
			plan_uuid: PLAN_UUID,
		});
		expect(text).toBe(`${plan.plan_name}: 0 saved versions.`);
		expect(data.versions).toEqual([]);
	});

	it("diff to an older version: a loss, in the plan's only empire, no note", async () => {
		setup(undefined, [
			...versionRoutes,
			[PLAN_PATH, { ...plan, empires: [plan.empires[0]] }],
		]);
		const { text, data } = await call("diff_plan_versions", {
			plan_uuid: PLAN_UUID,
			from_version: NOW,
			to_version: OLD,
		});
		expect(data.difference.profit).toBeLessThan(0);
		expect(text).toContain(`(${data.difference.profit}).`);
		expect(text).not.toContain("(+");
		expect(text).toContain(
			`"Now" → the version of ${version(OLD, "", 0).created_at}`
		);
		expect(data.note).toBeNull();
		expect(data.empire).toEqual({
			uuid: plan.empires[0].uuid,
			name: plan.empires[0].empire_name,
			faction: "MORIA",
		});
	});

	it("diff for a user without empires: no empire, Universe prices", async () => {
		setup(undefined, [
			...versionRoutes,
			[PLAN_PATH, planNoEmpires],
			[/^\/planning\/empire\/$/, []],
		]);
		const { text, data } = await call("diff_plan_versions", {
			plan_uuid: PLAN_UUID,
			from_version: OLD,
		});
		expect(data.empire).toBeNull();
		expect(data.note).toContain("you have none");
		expect(text).toContain(data.note);
		expect(data.difference.profit).toBeGreaterThan(0);
		expect(text).toContain("(+");
	});

	it("restore of a plan in no empire stores nothing; a failed store is a note", async () => {
		setup(() => ({ body: planNoEmpires }));
		const quiet = await call("restore_plan_version", {
			plan_uuid: PLAN_UUID,
			version_uuid: OLD,
		});
		expect(quiet.text).toBe(
			`Restored the version as the plan "${plan.plan_name}" (a new version on top). ${APP}/plan/KW-688c/${PLAN_UUID}`
		);
		expect(writes()).toHaveLength(1);

		setup(failingState({ body: plan }));
		const stale = await call("restore_plan_version", {
			plan_uuid: PLAN_UUID,
			version_uuid: OLD,
		});
		expect(stale.text).toContain(STALE);
		expect(stale.data.restored_version).toBe(OLD);
	});
});
