// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

// MCP
import { createBackend } from "@/mcp/backend";
import { TOOLS } from "@/mcp/tools";
import {
	API_KEY,
	fakeBackend,
	type IFakeBackend,
} from "@/tests/mcp/fakeBackend";

// The app's report
import {
	marketKpis,
	marketMovers,
} from "@/features/market_report/marketReport.util";
import { MarketSummarySchema } from "@/features/api/schemas/marketSummary.schemas";

// Test data
import summaryData from "@/tests/test_data/api_data_market_summary.json";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";

const summary = MarketSummarySchema.parse(summaryData);
let backend: IFakeBackend;
let env: IToolEnv;

beforeEach(() => {
	backend = fakeBackend(undefined, [
		[/^\/data\/market\/summary\/$/, summaryData],
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

const run = (args: Record<string, unknown> = {}): Promise<any> =>
	TOOLS.find((t) => t.name === "get_market_report")!
		.run(args, env)
		.then((r) => r.data);

describe("get_market_report", () => {
	it("the market report's numbers and movers", async () => {
		const data = await run({ limit: 5 });
		const kpis = marketKpis(summary);
		expect(data.kpis.turnover_7d).toBeCloseTo(kpis.turnover7d, 0);
		expect(data.kpis.materials_traded_30d).toBe(kpis.traded30d);
		expect(
			data.movers.rising.map((m: { ticker: string }) => m.ticker)
		).toEqual(
			marketMovers(summary.materials, "rising")
				.slice(0, 5)
				.map((m) => m.ticker)
		);
		expect(data.movers.falling.length).toBeLessThanOrEqual(5);
		expect(
			data.exchanges.map((e: { exchange: string }) => e.exchange)
		).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		expect(data.url).toBe("https://app.test/market");
		// public data: no key, GET only
		expect(backend.requests.every((r) => r.method === "GET")).toBe(true);
		expect(
			backend.requests.some((r) => r.headers.has("Authorization"))
		).toBe(false);
	});

	it("filters movers and gaps by category", async () => {
		const category = summary.materials[0].category;
		const data = await run({ category: category.toUpperCase(), limit: 50 });
		const cats = new Set(
			summary.materials
				.map((m) => [m.ticker, m.category])
				.filter(([, c]) => c === category)
				.map(([t]) => t)
		);
		for (const m of [...data.movers.rising, ...data.movers.falling])
			expect(m.category).toBe(category);
		for (const g of data.gaps.rows) expect(cats.has(g.ticker)).toBe(true);
	});
});
