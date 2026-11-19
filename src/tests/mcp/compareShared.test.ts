// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { preferenceDefaults } from "@/features/preferences/userDefaults";
import { TOOLS } from "@/mcp/tools";
import { calculate, loadPlanSetup } from "@/mcp/context";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";

// The app's compare
import {
	compareRows,
	paybackOfDifference,
} from "@/features/planning/util/whatIf.util";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

const OTHER = "11111111-2222-4333-8444-555555555555";
const SHARE = "99999999-8888-4777-8666-555555555555";
const OWN_SHARE = "88888888-7777-4666-8555-444444444444";
// the same plan with one more EXT and two permits
const other = {
	...fixtures.plan,
	uuid: OTHER,
	plan_name: "Other",
	plan_permits_used: 2,
	plan_data: {
		...fixtures.plan.plan_data,
		buildings: fixtures.plan.plan_data.buildings.map((b) =>
			b.name === "EXT" ? { ...b, amount: b.amount + 1 } : b
		),
	},
};

const FOREIGN = "22222222-3333-4444-8555-666666666666";
/** the plan as the share endpoint sends it: never the owner's empires */
const sharedPayload = (uuid: string) => {
	const {
		empires: _e,
		modified_at: _m,
		...rest
	} = fixtures.plan as typeof fixtures.plan & { modified_at?: string };
	return { ...rest, uuid };
};
/** the fake backend, but someone else's plan is "not found", as the API */
const withForeign404 = (inner: typeof fetch): typeof fetch =>
	(async (input: RequestInfo | URL, init?: RequestInit) =>
		String(input).includes(`/planning/plan/${FOREIGN}/`)
			? new Response("{}", { status: 404 })
			: inner(input, init)) as typeof fetch;

let env: IToolEnv;
beforeEach(() => {
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: withForeign404(
				fakeBackend(undefined, [
					[new RegExp(`^/planning/plan/${OTHER}/$`), other],
					[
						new RegExp(`^/planning/shared/${SHARE}/$`),
						{
							uuid: SHARE,
							created_at: "2026-11-18T00:00:00Z",
							view_count: 4,
							// someone else's plan: not in the user's empires
							plan_details: sharedPayload(FOREIGN),
						},
					],
					[
						new RegExp(`^/planning/shared/${OWN_SHARE}/$`),
						{
							uuid: OWN_SHARE,
							created_at: "2026-11-18T00:00:00Z",
							view_count: 1,
							plan_details: sharedPayload(PLAN_UUID),
						},
					],
				]).fetch
			),
		}),
	};
});
const run = (name: string, args: Record<string, unknown>): Promise<any> =>
	TOOLS.find((t) => t.name === name)!
		.run(args, env)
		.then((r) => r.data);

describe("compare_plans", () => {
	it("the app's compare rows, payback of the difference and plan differences", async () => {
		const data = await run("compare_plans", {
			plan_a: PLAN_UUID,
			plan_b: OTHER,
		});
		const a = calculate(
			await loadPlanSetup(env.backend, PLAN_UUID, undefined)
		);
		const b = calculate(await loadPlanSetup(env.backend, OTHER, undefined));
		const rows = compareRows(a, b);
		expect(data.figures.map((r: { figure: string }) => r.figure)).toEqual(
			rows.map((r) => r.key)
		);
		const profit = data.figures.find(
			(r: { figure: string }) => r.figure === "profit"
		);
		expect(profit.b_minus_a).toBeCloseTo(
			b.overview.profit - a.overview.profit,
			1
		);
		expect(data.payback_of_difference.extra_construction_cost).toBeCloseTo(
			paybackOfDifference(a, b).cost,
			1
		);
		expect(data.plan_differences.join(" ")).toMatch(/EXT/);
		expect(data.plan_differences.join(" ")).toMatch(/ermit/);
		expect(data.a.name).toBe(fixtures.plan.plan_name);
	});

	it("one empire and price basis for both", async () => {
		const empire = fixtures.empires[0].uuid;
		const data = await run("compare_plans", {
			plan_a: PLAN_UUID,
			plan_b: OTHER,
			empire_uuid: empire,
			price_basis: "AI1_ASKBID",
		});
		expect(data.a.empire).toBe(data.b.empire);
		expect(data.a.price_basis.basis).toBe("AI1_ASKBID");
		expect(data.note ?? "").not.toContain("different empires");
	});
});

describe("get_shared_plan", () => {
	it("someone else's share: calculated like get_plan in the user's first empire (no default)", async () => {
		const data = await run("get_shared_plan", {
			share: `https://prunplanner.org/shared/${SHARE}`,
		});
		const first = fixtures.empires[0].uuid;
		const asPlan = await run("get_plan", {
			plan_uuid: PLAN_UUID,
			empire_uuid: first,
		});
		expect(data.per_day).toEqual(asPlan.per_day);
		expect(data.empire.uuid).toBe(first);
		expect(data.plan).toMatchObject({
			uuid: null,
			url: `https://app.test/shared/${SHARE}`,
		});
		expect(data.share).toMatchObject({ views: 4, own_plan: false });
	});

	it("someone else's share with a default empire: that one, as the shared page", async () => {
		const sky = "32aed118-c4ed-4a4e-9eb4-3cf6aa0068da";
		env = {
			...env,
			backend: createBackend({
				apiUrl: "http://backend",
				apiKey: API_KEY,
				userAgent: "test",
				fetch: withForeign404(
					fakeBackend(undefined, [
						[
							new RegExp(`^/planning/shared/${SHARE}/$`),
							{
								uuid: SHARE,
								created_at: "2026-11-18T00:00:00Z",
								view_count: 4,
								plan_details: sharedPayload(FOREIGN),
							},
						],
						[
							/^\/user\/preferences\/$/,
							{ ...preferenceDefaults, defaultEmpireUuid: sky },
						],
					]).fetch
				),
			}),
		};
		const data = await run("get_shared_plan", { share: SHARE });
		expect(data.empire.uuid).toBe(sky);
	});

	it("the user's own shared plan opens as its plan page", async () => {
		const data = await run("get_shared_plan", { share: OWN_SHARE });
		const asPlan = await run("get_plan", { plan_uuid: PLAN_UUID });
		expect(data.share.own_plan).toBe(true);
		// their own plan keeps its uuid and plan page
		expect(data.plan.uuid).toBe(PLAN_UUID);
		expect(data.plan.url).toBe(asPlan.plan.url);
		expect(data.empire.uuid).toBe(asPlan.empire.uuid);
		expect(data.per_day).toEqual(asPlan.per_day);
	});
});
