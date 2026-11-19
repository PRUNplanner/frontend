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

// The app's chart
import { candles } from "@/features/market_exploration/marketExploration.util";

// Types & Interfaces
import type { IToolEnv } from "@/mcp/tools/shared";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

const DAY = 86_400_000;
const LAST = Date.UTC(2026, 10, 17);

/** 400 days, the price rising 1 a day from 100 (VWAP = price), no trades on day 200 */
function series(ticker: string, exchange: string): Exploration[] {
	return Array.from({ length: 400 }, (_, i) => {
		const price = 100 + i;
		return {
			ticker,
			exchange_code: exchange,
			date_epoch: LAST - (399 - i) * DAY,
			open_p: price,
			close_p: price,
			high_p: price + 5,
			low_p: price - 5,
			volume: i === 200 ? 0 : price * 10,
			traded: i === 200 ? 0 : 10,
		};
	})
		.filter((r) => r.traded > 0)
		.reverse();
}

let backend: IFakeBackend;
let env: IToolEnv;
const setup = (routes: [RegExp, unknown][], status?: number) => {
	backend = fakeBackend(status, routes);
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
const run = (args: Record<string, unknown>): Promise<any> =>
	TOOLS.find((t) => t.name === "get_price_history")!
		.run(args, env)
		.then((r) => r.data);

describe("get_price_history", () => {
	beforeEach(() => setup([[/^\/data\/cxpc\/RAT\/$/, series("RAT", "NC1")]]));

	it("sums up the range and gives the chart's bars", async () => {
		const data = await run({ ticker: "rat", exchanges: ["NC1"], days: 90 });
		const nc1 = data.exchanges.NC1;
		expect(nc1.last_day).toBe("2026-11-17");
		expect(nc1.last_vwap).toBe(499);
		// 30 days ago the price was 469
		expect(nc1.change_pct.d30).toBeCloseTo((499 / 469 - 1) * 100, 2);
		expect(nc1.range).toMatchObject({
			days: 90,
			traded_days: 90,
			high: { price: 504, date: "2026-11-17" },
			low: { price: 405, date: "2026-08-20" },
		});
		expect(nc1.all_time.low).toEqual({ price: 95, date: "2025-10-14" });
		// 90 days: weekly bars, the same as Market Exploration's chart
		expect(nc1.interval).toBe("weekly");
		const app = candles(
			series("RAT", "NC1").filter((r) => r.date_epoch >= LAST - 89 * DAY),
			"weekly"
		);
		expect(nc1.bars).toHaveLength(app.length);
		expect(nc1.bars.at(-1)).toMatchObject({
			close: app.at(-1)![4],
			high: app.at(-1)![2],
		});
	});

	it("is fetched once per hour for everyone, with the user's key", async () => {
		await run({ ticker: "RAT", exchanges: ["NC1"], days: 30 });
		await run({
			ticker: "RAT",
			exchanges: ["NC1"],
			days: "all",
			bars: false,
		});
		const history = backend.requests.filter((r) =>
			r.path.startsWith("/data/cxpc/")
		);
		// the first test already loaded it: served from the shared cache
		expect(history.length).toBeLessThanOrEqual(1);
		for (const r of history)
			expect(r.headers.get("Authorization")).toBe(`Api-Key ${API_KEY}`);
	});

	it("daily up to 60 days, weekly up to 420, else monthly", async () => {
		const month = await run({
			ticker: "RAT",
			exchanges: ["NC1"],
			days: 30,
		});
		expect(month.exchanges.NC1.bars).toHaveLength(30);
		const all = await run({
			ticker: "RAT",
			exchanges: ["NC1"],
			days: "all",
		});
		// "all" is the series' 399 days
		expect(all.exchanges.NC1.interval).toBe("weekly");
		expect(all.exchanges.NC1.range.traded_days).toBe(399);
		const long = await run({
			ticker: "RAT",
			exchanges: ["NC1"],
			days: 500,
		});
		expect(long.exchanges.NC1.interval).toBe("monthly");
	});

	it("one request per material, whatever the exchanges", async () => {
		setup([
			[
				/^\/data\/cxpc\/C\/$/,
				[...series("C", "NC1"), ...series("C", "UNIVERSE")],
			],
		]);
		const data = await run({
			ticker: "C",
			exchanges: ["NC1", "UNIVERSE", "AI1"],
			bars: false,
		});
		expect(data.exchanges.NC1.last_vwap).toBe(499);
		expect(data.exchanges.UNIVERSE.last_vwap).toBe(499);
		expect(data.exchanges.AI1.traded_days).toBe(0);
		expect(
			backend.requests.filter((r) => r.path.startsWith("/data/cxpc/"))
		).toHaveLength(1);
	});

	it("unknown materials and a busy backend say so", async () => {
		await expect(run({ ticker: "ZZZ" })).rejects.toThrow(
			"Unknown material"
		);
		setup([], 429);
		await expect(
			run({ ticker: "DW", exchanges: ["AI1"] })
		).rejects.toMatchObject({ code: "rate_limited" });
	});
});
