// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { reclaimed } from "@/mcp/builtBase";
import { marketFootprint } from "@/mcp/tools/shared";
import {
	API_KEY,
	EMPIRE_UUID,
	PLAN_UUID,
	fakeBackend,
	fixtures,
} from "@/tests/mcp/fakeBackend";

// Types & Interfaces
import type { IPriceBook, IPriceSource } from "@/features/cx/priceBook";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { IToolEnv } from "@/mcp/tools/shared";

/** the beta testers' gaps of 2026-11-20, part 2 (items 1, 3, 6, 7, 9) */

let env: IToolEnv;
const setEnv = (extraRoutes: [RegExp, unknown][] = []) => {
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: fakeBackend(undefined, extraRoutes).fetch,
		}),
	};
};
const run = (name: string, args: Record<string, unknown> = {}): Promise<any> =>
	TOOLS.find((t) => t.name === name)!.run(args, env);

const profile = (scope?: string | null) => ({
	id: 1,
	username: "u",
	email: "",
	is_email_verified: true,
	fio_apikey: null,
	prun_username: "",
	fio_status: "none",
	fio_last_refreshed_at: null,
	...(scope === undefined ? {} : { api_key_scope: scope }),
});

beforeEach(() => setEnv());

describe("MCP: tester feedback, part 2", () => {
	it("list_empires says whether the key can change data", async () => {
		setEnv([[/^\/user\/profile\/$/, profile("read")]]);
		const read = await run("list_empires");
		expect(read.data.api_key_access).toBe("read");
		expect(read.text).toContain("API key: read-only");

		setEnv([[/^\/user\/profile\/$/, profile("read_write")]]);
		expect((await run("list_empires")).text).toContain(
			"API key: read & write"
		);

		// a backend without the field, or no profile: unknown, no claim
		setEnv([[/^\/user\/profile\/$/, profile()]]);
		const old = await run("list_empires");
		expect(old.data.api_key_access).toBeNull();
		expect(old.text).not.toContain("API key");
		setEnv();
		expect((await run("list_empires")).data.api_key_access).toBeNull();
	});

	it("market footprint: shares of 1 % and up with what players plan", () => {
		const prices = {
			getPrice: () => 10,
			getPriceSource: (): IPriceSource => ({
				level: "empire_exchange",
				exchange: "CI1",
				key: "vwap_30d",
				zero: false,
				volume: "CI1",
			}),
		} as unknown as IPriceBook;
		// 30 traded a day: 6 is 20 %, 0.1 is under 1 %
		const exchange = {
			sum_traded_30d: 900,
			sum_traded_7d: 210,
			bid: 9,
			ask: 11,
			exchange_status: "ACTIVE",
		} as unknown as Exchange;
		const rows = marketFootprint(
			[
				{ ticker: "MED", delta: 6 },
				{ ticker: "PG", delta: -0.1 },
			] as IMaterialIO[],
			prices,
			() => exchange,
			new Map([["MED", { production: 40, consumption: 5, net: 35 }]])
		);
		expect(rows).toEqual([
			{
				ticker: "MED",
				side: "sell",
				amount_per_day: 6,
				exchange: "CI1",
				share_of_daily_volume_pct: 20,
				planned_by_players_per_day: { production: 40, consumption: 5 },
			},
		]);
	});

	it("check_make_or_buy lists your plans outside the empire making an input", async () => {
		// the empire's plan only extracts, so it buys its workers' food;
		// the full plan, in no empire here, makes DW and RAT
		const extractOnly = {
			...fixtures.plan,
			uuid: "00000000-0000-4000-8000-000000000001",
			plan_name: "Extract only",
			plan_data: {
				...fixtures.plan.plan_data,
				buildings: fixtures.plan.plan_data.buildings.filter(
					(b) => b.name === "EXT" || b.name === "RIG"
				),
			},
		};
		setEnv([
			[
				/^\/planning\/empire\/[^/]+\/plans\/$/,
				[{ ...extractOnly, empires: undefined }],
			],
			[/^\/planning\/plan\/$/, [extractOnly, fixtures.plan]],
		]);
		const { data, text } = await run("check_make_or_buy", {
			empire_uuid: EMPIRE_UUID,
		});
		const dw = data.inputs.find(
			(r: { ticker: string }) => r.ticker === "DW"
		);
		expect(dw.made_by_your_plans_outside_this_empire).toEqual([
			expect.objectContaining({
				plan_uuid: PLAN_UUID,
				net_output_per_day: expect.any(Number),
			}),
		]);
		expect(text).toContain("made by your plans outside this empire");
	});

	it("reclaim: FIO first, the rest by age, else nothing", () => {
		const perUnit = [{ ticker: "BSE", input: 10, output: 0 }];
		const site = {
			PlanetIdentifier: "KW-688c",
			InvestedPermits: 1,
			MaximumPermits: 3,
			Buildings: [
				{
					BuildingTicker: "FP",
					Condition: 0.9,
					RepairMaterials: [],
					ReclaimableMaterials: [
						{ MaterialTicker: "BSE", MaterialAmount: 7 },
					],
				},
			],
		};
		// one FP on the site, the second at 90 days: half intact
		const r = reclaimed("FP", 2, perUnit, site, 90);
		expect(r.source).toEqual(["fio", "age"]);
		expect(r.materials.get("BSE")).toBe(7 + 5);
		expect(
			reclaimed("FP", 1, perUnit, undefined, 200).materials.get("BSE")
		).toBe(0);
		expect(reclaimed("FP", 1, perUnit, undefined, undefined)).toEqual({
			materials: new Map(),
			source: ["none"],
		});
	});

	it("calculate_plan_variant on a built base: removed buildings only reclaim", async () => {
		const removeFp = {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "FP", amount: 18 }],
		};
		const planned = (await run("calculate_plan_variant", removeFp)).data;
		const built = (
			await run("calculate_plan_variant", {
				...removeFp,
				built: true,
				age_days: 90,
			})
		).data;
		// not built: the freed FP counts at its full value
		expect(planned.construction_change.net_cost).toBeLessThan(0);
		// built at 90 days: what is still intact comes back (rounded down per
		// material, as the repair curve), less than the full value
		expect(built.construction_change.reclaim_from).toEqual(["age"]);
		expect(built.construction_change.net_cost).toBeLessThan(0);
		expect(built.construction_change.net_cost).toBeGreaterThan(
			planned.construction_change.net_cost
		);
		expect(built.payback_of_difference.extra_construction_cost).toBe(
			built.construction_change.net_cost
		);

		// nothing known: nothing back
		const unknown = (
			await run("calculate_plan_variant", { ...removeFp, built: true })
		).data;
		expect(unknown.construction_change.net_cost).toBe(0);
		expect(unknown.construction_change.note).toContain("Pass age_days");
	});

	it('habs "add" keeps the habs there and adds for the missing workers', async () => {
		const { data } = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			buildings: [{ ticker: "FP", amount: 25 }],
			habs: "add",
		});
		const habs = (infra: Record<string, number>) =>
			Object.fromEntries(
				Object.entries(infra).filter(([t]) => t.startsWith("HB"))
			);
		const before = habs(
			Object.fromEntries(
				fixtures.plan.plan_data.infrastructure.map((i) => [
					i.building,
					i.amount,
				])
			)
		);
		const after = habs(data.infrastructure_after);
		for (const [t, n] of Object.entries(before))
			expect(after[t] ?? 0).toBeGreaterThanOrEqual(n);
		expect(
			data.workforce_after.every((w: { left: number }) => w.left >= 0)
		).toBe(true);
	});

	it("get_production_cost: several targets with whole buildings and orders", async () => {
		const { data } = await run("get_production_cost", {
			ticker: "RAT",
			per_day: 100,
			also: [{ ticker: "DW", per_day: 100 }],
		});
		const targets = data.chain.filter((r: { target: boolean }) => r.target);
		expect(targets.map((r: { ticker: string }) => r.ticker).sort()).toEqual(
			["DW", "RAT"]
		);
		const fp = data.orders.find(
			(o: { building: string }) => o.building === "FP"
		);
		expect(Number.isInteger(fp.buildings)).toBe(true);
		expect(fp.orders.length).toBeGreaterThanOrEqual(2);
		for (const o of fp.orders)
			expect(Number.isInteger(o.amount)).toBe(true);
		await expect(
			run("get_production_cost", {
				ticker: "RAT",
				also: [{ ticker: "NOPE", per_day: 1 }],
			})
		).rejects.toThrow("Unknown material NOPE.");
	});
});

describe("MCP: another tool's arguments", () => {
	it("check_plan_market still checks a variant with calculate_plan_variant's schema", () => {
		const tool = TOOLS.find((t) => t.name === "check_plan_market")!;
		const bad = tool.inputSchema.safeParse({
			plan_uuid: PLAN_UUID,
			variant: { buildings: [{ ticker: "FP", amount: -1 }] },
		});
		expect(bad.success).toBe(false);
		expect(bad.error!.issues[0].path).toEqual([
			"variant",
			"buildings",
			0,
			"amount",
		]);
		const empire = TOOLS.find(
			(t) => t.name === "calculate_empire_variant"
		)!;
		expect(
			empire.inputSchema.safeParse({
				empire_uuid: EMPIRE_UUID,
				new_plans: [{ planet_natural_id: "KW-688c" }],
			}).success
		).toBe(false);
	});
});
