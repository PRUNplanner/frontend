// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import { calculate, loadPlanSetup } from "@/mcp/context";
import {
	API_KEY,
	PLAN_UUID,
	fakeBackend,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// The app's builders
import { transferAction } from "@/features/xit/xitAction.util";
import {
	constructionTotals,
	plannedAmount,
	supplyAmount,
} from "@/features/planning/util/carts.util";
import { preferenceDefaults } from "@/features/preferences/userDefaults";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

let backend: IFakeBackend;
let env: IToolEnv;
const setup = (preferences: Record<string, unknown> = {}) => {
	backend = fakeBackend(undefined, [
		[/^\/user\/preferences\/$/, { ...preferenceDefaults, ...preferences }],
	]);
	env = {
		appUrl: "https://app.test",
		backend: createBackend({
			apiUrl: "http://backend",
			apiKey: API_KEY,
			userAgent: "test",
			fetch: backend.fetch,
		}),
	};
};
beforeEach(() => setup());

const run = (args: Record<string, unknown>): Promise<any> =>
	TOOLS.find((t) => t.name === "get_xit_action")!
		.run(args, env)
		.then((r) => r.data);
const result = async () =>
	calculate(await loadPlanSetup(env.backend, PLAN_UUID, undefined)).result;

describe("get_xit_action", () => {
	it("supply: the Supply cart's package for the user's days", async () => {
		setup({ supplyCartDays: 7 });
		const data = await run({ kind: "supply", plan_uuid: PLAN_UUID });
		const expected = (await result()).materialio
			.filter((m) => m.delta < 0)
			.map((m) => ({ ticker: m.ticker, value: supplyAmount(m.delta, 7) }))
			.filter((e) => e.value > 0);
		expect(data.json).toBe(
			JSON.stringify(
				transferAction(expected, {
					name: "Supply Cart",
					origin: "Configure on Execution",
					buy: true,
				})
			)
		);
		expect(data.buy_first).toBe(false);
		expect(data.note).toContain("7 days");
		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
	});

	it("construction: planned minus built, buying at the saved origin", async () => {
		setup({
			burnOrigin: "Moria Station Warehouse",
			defaultBuyItemsFromCX: true,
		});
		const data = await run({
			kind: "construction",
			plan_uuid: PLAN_UUID,
			built: [{ ticker: "EXT", amount: 1 }],
		});
		const r = await result();
		const amounts = Object.fromEntries(
			r.constructionMaterials.map((b) => [
				b.ticker,
				Math.max(
					(plannedAmount(
						b.ticker,
						r.production.buildings,
						r.infrastructure
					) ?? 0) - (b.ticker === "EXT" ? 1 : 0),
					0
				),
			])
		);
		const totals = constructionTotals(r.constructionMaterials, amounts);
		expect(data.package.groups[0].materials).toEqual(
			Object.fromEntries(Object.entries(totals).filter(([, v]) => v > 0))
		);
		expect(data.package.actions[0]).toMatchObject({
			type: "CX Buy",
			exchange: "NC1",
		});
		expect(data.package.global.name).toBe("PRUNplanner Construct");
		expect(data.totals.cost).toBeGreaterThan(0);
	});

	it("materials: your list, rounded up, unknown tickers refused", async () => {
		const data = await run({
			kind: "materials",
			materials: [
				{ ticker: "rat", amount: 10.2 },
				{ ticker: "DW", amount: 5 },
			],
			name: "Feed & water!",
			origin: "Benten Station Warehouse",
			buy: false,
		});
		expect(data.package).toEqual(
			transferAction(
				[
					{ ticker: "RAT", value: 11 },
					{ ticker: "DW", value: 5 },
				],
				{
					name: "Feed & water!",
					origin: "Benten Station Warehouse",
					buy: false,
				}
			)
		);
		expect(data.package.global.name).toBe("PRUNplanner Feed water");
		await expect(
			run({
				kind: "materials",
				materials: [{ ticker: "ZZZ", amount: 1 }],
			})
		).rejects.toThrow("Unknown materials: ZZZ");
		await expect(run({ kind: "supply" })).rejects.toThrow(
			"needs plan_uuid"
		);
	});
});
