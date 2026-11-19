// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import {
	API_KEY,
	fakeBackend,
	fixtures,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// Test data
import summaryData from "@/tests/test_data/api_data_market_summary.json";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

// game data is cached per module: this file's backend serves a quiet
// market and a planet index with Etherwind only, from the first request on
const PIONEER_GOODS = new Set(["RAT", "DW", "OVE", "PWO", "COF"]);
const quiet = {
	...summaryData,
	// no turnover at all: no change against the week before
	turnover_daily: Object.fromEntries(
		Object.entries(summaryData.turnover_daily).map(([ex, days]) => [
			ex,
			days.map(() => 0),
		])
	),
	index: {
		...summaryData.index,
		combined: summaryData.index.combined.map(() => null),
	},
	// without the pioneers' goods there's no pioneer cost
	materials: summaryData.materials.filter(
		(m) => !PIONEER_GOODS.has(m.ticker)
	),
};
const etherwindOnly = fixtures.searchIndex.filter(
	(p) => p.planet_natural_id === "KW-688c"
);
// "RFab Plan": an empire without a CX preference (Universe VWAP 30D)
const NO_CX_EMPIRE = "2eac235a-9f8d-4994-8c71-933c31127423";
// HCP neither priced nor traded anywhere
const exchanges = fixtures.exchanges.map((e) =>
	e.ticker === "HCP"
		? {
				...e,
				ask: 0,
				bid: 0,
				vwap_7d: 0,
				vwap_30d: 0,
				sum_traded_7d: 0,
				sum_traded_30d: 0,
			}
		: e
);
// the empire's plans: 10 INC burning HCP
const incPlan = {
	...fixtures.plan,
	empires: undefined,
	plan_data: {
		...fixtures.plan.plan_data,
		buildings: [
			{
				name: "INC",
				amount: 10,
				active_recipes: [{ amount: 1, recipeid: "INC#4xHCP=>4xC" }],
			},
		],
	},
};

let backend: IFakeBackend;
let env: IToolEnv;

beforeEach(() => {
	backend = fakeBackend(undefined, [
		[/^\/data\/market\/summary\/$/, quiet],
		[/^\/data\/planets\/search-index\/$/, etherwindOnly],
		[/^\/data\/exchanges\/$/, exchanges],
		[/^\/planning\/empire\/[^/]+\/plans\/$/, [incPlan]],
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
});

const call = (name: string, args: Record<string, unknown> = {}) => {
	const tool = TOOLS.find((t) => t.name === name)!;
	return tool.run(tool.inputSchema.parse(args) as never, env) as Promise<{
		text: string;
		data: any;
	}>;
};

describe("get_market_report on a quiet market", () => {
	it("missing changes and costs are null, no movers in an empty category", async () => {
		const { text, data } = await call("get_market_report", {
			category: "no such category",
		});
		expect(data.kpis.turnover_7d).toBe(0);
		expect(data.kpis.turnover_7d_change_pct).toBeNull();
		expect(data.index.value).toBeNull();
		expect(data.index.change_pct).toEqual({
			d7: null,
			d30: null,
			d90: null,
		});
		expect(data.pioneer_cost_per_100_per_day.now).toBeNull();
		expect(data.movers.rising).toEqual([]);
		expect(data.movers.falling).toEqual([]);
		expect(data.gaps.rows).toEqual([]);
		expect(text).toBe(
			`Market on ${data.as_of}: turnover 0 in 7 days (– % against the week before), index null (– % in 30 days).`
		);
	});
});

describe("get_production_cost without a planet that has it", () => {
	it("a material no indexed planet has can't be costed", async () => {
		const { data } = await call("get_production_cost", {
			ticker: "FEO",
			raw_source: "extract",
		});
		expect(data.note).toBe(
			"FEO is extracted, but no planet in the planet index has it: no cost."
		);
	});
});

describe("a material without price or trades", () => {
	it("check_make_or_buy: no buy price, no share of the traded volume", async () => {
		const { data } = await call("check_make_or_buy", {
			empire_uuid: NO_CX_EMPIRE,
		});
		const hcp = data.inputs.find(
			(r: { ticker: string }) => r.ticker === "HCP"
		);
		expect(hcp).toMatchObject({
			buy_price: 0,
			buying_per_day: 0,
			rough_margin_pct: null,
			traded_per_day_universe_30d: 0,
			need_share_of_traded_pct: null,
			verdict: "cheaper to buy (rough)",
		});
	});

	it("check_plan_market: no volume share; a free input moves no profit", async () => {
		const data = (
			await call("check_plan_market", {
				empire_uuid: NO_CX_EMPIRE,
				new_plan: {
					planet_natural_id: "KW-688c",
					buildings: [
						{
							ticker: "INC",
							amount: 2,
							recipe_id: "INC#4xHCP=>4xC",
						},
					],
				},
			})
		).data;
		expect(data.target).toBeNull();
		const hcp = data.materials.find(
			(m: { ticker: string }) => m.ticker === "HCP"
		);
		expect(hcp.share_of_daily_volume_pct).toBeNull();
		expect(hcp.traded_30d).toBe(0);
		expect(
			data.profit_range.materials.some(
				(m: { ticker: string }) => m.ticker === "HCP"
			)
		).toBe(false);
		await expect(
			call("check_plan_market", {
				empire_uuid: NO_CX_EMPIRE,
				new_plan: {
					planet_natural_id: "KW-688c",
					buildings: [
						{
							ticker: "INC",
							amount: 2,
							recipe_id: "INC#4xHCP=>4xC",
						},
					],
				},
				target: { ticker: "HCP", daily_profit: 1000 },
			})
		).rejects.toThrow("HCP doesn't move this plan's profit");
	});
});
