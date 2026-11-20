// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// Engine
import { hqStepCost } from "@/features/base_roi/baseROIMetrics";
import { SHIP_SIZES, shipDays } from "@/features/planning/engine/visitation";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { PlanFieldChangesSchema } from "@/mcp/tools/planEdit";
import {
	FIXED_DRIFT_PCT,
	fixedPriceDrift,
	fixedPriceDriftWarning,
	permitCost,
} from "@/mcp/tools/shared";
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

/** the beta testers' gaps of 2026-11-20 (items 2, 4, 5, 8, 10, 11, 12) */

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

beforeEach(() => setEnv());

describe("MCP: tester feedback", () => {
	it("get_empire says in its text when material rows are cut", async () => {
		const { text, data } = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			limit: 1,
		});
		expect(data.material_rows.total).toBeGreaterThan(1);
		expect(text).toContain(
			`showing 1 of ${data.material_rows.total}, by largest money flow; pass limit for more`
		);
		const short = await run("get_empire", {
			empire_uuid: EMPIRE_UUID,
			include_material_io: false,
		});
		expect(short.text).not.toContain("Material rows");
	});

	it("experts: an invalid value names the two shapes that fit", () => {
		const parsed = PlanFieldChangesSchema.safeParse({ experts: '"auto"' });
		expect(parsed.success).toBe(false);
		expect(parsed.error!.issues[0].message).toContain(
			'the plain string "auto" or a list like [{"type":"Chemistry","amount":2}]'
		);
		expect(
			PlanFieldChangesSchema.safeParse({ experts: "auto" }).success
		).toBe(true);
	});

	it("get_plan: hours per run and profit per building-hour, in the summary too", async () => {
		const summary = (await run("get_plan", { plan_uuid: PLAN_UUID })).data;
		const full = (
			await run("get_plan", { plan_uuid: PLAN_UUID, detail: "full" })
		).data;
		const order = full.buildings[0].recipes[0];
		expect(order.hours_per_run).toBeGreaterThan(0);
		// one run's profit over its hours
		expect(order.profit_per_hour).toBeCloseTo(
			order.per_run.profit / order.hours_per_run,
			0
		);
		expect(summary.buildings[0].recipes[0]).toMatchObject({
			hours_per_run: order.hours_per_run,
			profit_per_hour: order.profit_per_hour,
		});
	});

	it("get_plan warns about experts over the game's limits", async () => {
		const experts = fixtures.plan.plan_data.experts.map((e) =>
			e.type === "Agriculture" ? { ...e, amount: 6 } : e
		);
		setEnv([
			[
				/^\/planning\/plan\/[^/]+\/$/,
				{
					...fixtures.plan,
					plan_data: { ...fixtures.plan.plan_data, experts },
				},
			],
		]);
		const { data } = await run("get_plan", { plan_uuid: PLAN_UUID });
		expect(
			data.warnings.find((w: string) => w.startsWith("Experts over"))
		).toContain("6 Agriculture");
		setEnv();
		const ok = (await run("get_plan", { plan_uuid: PLAN_UUID })).data;
		expect(
			ok.warnings.some((w: string) => w.startsWith("Experts over"))
		).toBe(false);
	});

	it("shipping: trips per week for the Visitation frequency ships", async () => {
		const { shipping } = (await run("get_plan", { plan_uuid: PLAN_UUID }))
			.data;
		expect(Object.keys(shipping.trips_per_week)).toHaveLength(
			SHIP_SIZES.length
		);
		// 3,000 t / 1,000 m³: the side that fills first sets the visits
		const d = shipDays(
			{ weight: 3000, volume: 1000 },
			{
				dailyWeightImport: shipping.import_weight_t,
				dailyWeightExport: shipping.export_weight_t,
				dailyVolumeImport: shipping.import_volume_m3,
				dailyVolumeExport: shipping.export_volume_m3,
			}
		);
		expect(shipping.trips_per_week["3000t_1000m3"]).toBeCloseTo(
			7 / Math.min(d.exportDays, d.importDays),
			1
		);
	});

	it("shipDays: days per direction and the side that fills first", () => {
		expect(
			shipDays(
				{ weight: 3000, volume: 1000 },
				{
					dailyWeightImport: 100,
					dailyVolumeImport: 100,
					dailyWeightExport: 500,
					dailyVolumeExport: 50,
				}
			)
		).toEqual({
			exportDays: 6,
			exportLimit: "t",
			importDays: 10,
			importLimit: "m³",
		});
	});

	it("fixed prices that flatter the plan are flagged with what they add", () => {
		const source = (level: IPriceSource["level"]): IPriceSource => ({
			level,
			exchange: null,
			key: null,
			zero: false,
			volume: "CI1",
		});
		const fixed: Record<string, number> = { PG: 47.9, MGS: 100, H2O: 30 };
		const prices = {
			getPrice: (t: string) => fixed[t],
			getPriceSource: (t: string) =>
				source(t === "H2O" ? "empire_exchange" : "empire_ticker"),
		} as unknown as IPriceBook;
		const io = [
			// bought 2,000 PG a day at 47.9 against an ask of 54.7: flagged
			{ ticker: "PG", delta: -2000 },
			// sold at 100 against a bid of 95: within 10 %
			{ ticker: "MGS", delta: 10 },
			// not a fixed price
			{ ticker: "H2O", delta: -50 },
		] as IMaterialIO[];
		const exchanges = new Map([
			["PG.CI1", { ask: 54.7, bid: 50 } as Exchange],
			["MGS.CI1", { ask: 110, bid: 95 } as Exchange],
			["H2O.CI1", { ask: 60, bid: 50 } as Exchange],
		]);
		const rows = fixedPriceDrift(io, prices, exchanges);
		expect(rows).toEqual([
			{
				ticker: "PG",
				side: "buy",
				fixed_price: 47.9,
				market: "CI1 ask",
				market_price: 54.7,
				profit_overstated_per_day: 13600,
			},
		]);
		expect(fixedPriceDriftWarning(rows)[0]).toContain(
			`more than ${FIXED_DRIFT_PCT} %`
		);
		expect(fixedPriceDriftWarning([])).toEqual([]);
	});

	it("permits: free ones first, then an HQ upgrade each", () => {
		const prices = { getPrice: () => 10 } as unknown as IPriceBook;
		const price = () => 10;
		expect(
			permitCost(
				{ empire_permits_used: 2, empire_permits_total: 4 },
				1,
				prices,
				1000,
				50_000
			)
		).toMatchObject({
			free_permits: 2,
			hq_upgrades: 0,
			hq_upgrade_cost: 0,
			payback_days_with_permits: 50,
		});
		const full = permitCost(
			{ empire_permits_used: 4, empire_permits_total: 4 },
			2,
			prices,
			1000,
			50_000
		)!;
		const upgrades = hqStepCost(5, price) + hqStepCost(6, price);
		expect(full).toMatchObject({ free_permits: 0, hq_upgrades: 2 });
		expect(full.hq_upgrade_cost).toBeCloseTo(upgrades, 2);
		expect(full.payback_days_with_permits).toBeCloseTo(
			(50_000 + upgrades) / 1000,
			2
		);
		expect(permitCost(undefined, 1, prices, 1, 1)).toBeNull();
		expect(
			permitCost(
				{ empire_permits_used: 1, empire_permits_total: 2 },
				0,
				prices,
				1,
				1
			)
		).toBeNull();
	});

	it("calculate_plan_variant: more permits show what they take", async () => {
		setEnv([
			[
				/^\/planning\/plan\/[^/]+\/$/,
				{ ...fixtures.plan, plan_permits_used: 1 },
			],
		]);
		const { data } = await run("calculate_plan_variant", {
			plan_uuid: PLAN_UUID,
			empire_uuid: EMPIRE_UUID,
			permits: 2,
		});
		// Sky Productions: 25 of 28 permits used, so one is free
		expect(data.payback_of_difference.permits).toMatchObject({
			permits_needed: 1,
			free_permits: 3,
			hq_upgrades: 0,
		});
	});

	it("calculate_new_plan: the new base's permits", async () => {
		const { data } = await run("calculate_new_plan", {
			planet_natural_id: "KW-688c",
			empire_uuid: EMPIRE_UUID,
			buildings: [{ ticker: "FRM", amount: 2 }],
		});
		expect(data.permits_cost).toMatchObject({
			permits_needed: 1,
			free_permits: 3,
		});
	});
});
