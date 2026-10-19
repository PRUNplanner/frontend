import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, watch } from "vue";
import config from "@/lib/config";

const processUserDetectors = vi.fn(() => [] as unknown[]);
vi.mock("@/features/market_live/cxDetectors", () => ({
	processUserDetectors: (...args: unknown[]) =>
		processUserDetectors(...(args as [])),
}));

/** Minimal EventSource the composable can drive */
class FakeEventSource {
	static last: FakeEventSource;
	onopen?: () => void;
	onerror?: (err: unknown) => void;
	onmessage?: (event: { data: string }) => void;
	close = vi.fn();

	constructor(public url: string) {
		FakeEventSource.last = this;
	}

	emit(data: unknown) {
		this.onmessage?.({ data: JSON.stringify(data) });
	}
}

function message(overrides: Record<string, unknown> = {}) {
	return {
		material_ticker: "DW",
		exchange_code: "NC1",
		timestamp: "2026-09-26T10:00:00Z",
		demand: 100,
		supply: 200,
		traded: 50,
		price: 100,
		bid: 120,
		ask: 130,
		buy_orders: [
			{
				company_name: "A",
				company_code: "A",
				item_count: 10,
				item_cost: 100,
			},
			{
				company_name: "B",
				company_code: "B",
				item_count: 30,
				item_cost: 120,
			},
		],
		sell_orders: [
			{
				company_name: "C",
				company_code: "C",
				item_count: 5,
				item_cost: 130,
			},
			{
				company_name: "D",
				company_code: "D",
				item_count: 15,
				item_cost: 150,
			},
		],
		...overrides,
	};
}

// module level state (point map, event log) is shared, so every test
// imports a fresh copy
async function setup() {
	vi.resetModules();
	setActivePinia(createPinia());
	const { useExchangeSSE } =
		await import("@/features/market_live/useExchangeSSE");
	const sse = useExchangeSSE();
	sse.connect();
	return { sse, source: FakeEventSource.last };
}

/** Deliver a message, it is processed with its frame, 16 ms later */
async function deliver(source: FakeEventSource, data: unknown) {
	source.emit(data);
	vi.advanceTimersByTime(16);
	await nextTick();
}

describe("useExchangeSSE", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("EventSource", FakeEventSource);
		processUserDetectors.mockReset().mockReturnValue([]);
	});

	describe("connection", () => {
		it("connects once and tracks the connection state", async () => {
			const { sse, source } = await setup();

			expect(source.url).toBe(
				`${config.API_BASE_URL}/data/stream/?channels=cx`
			);

			sse.connect();
			expect(FakeEventSource.last).toBe(source);

			source.onopen?.();
			expect(sse.isConnected.value).toBe(true);
			expect(sse.connectionError.value).toBeNull();

			vi.spyOn(console, "error").mockImplementation(() => {});
			source.onerror?.(new Error("lost"));
			expect(sse.isConnected.value).toBe(false);
			expect(sse.connectionError.value).toBe(
				"Connection lost. Reconnecting..."
			);
		});

		it("closes the stream on disconnect", async () => {
			const { sse, source } = await setup();
			source.onopen?.();

			sse.disconnect();

			expect(source.close).toHaveBeenCalledOnce();
			expect(sse.isConnected.value).toBe(false);
		});
	});

	describe("processing", () => {
		it("derives order book stats and spread", async () => {
			const { sse, source } = await setup();

			await deliver(source, message());

			const point = sse.cxPointMap["DW.NC1"];
			expect(point).toMatchObject({
				ticker: "DW.NC1",
				price: 100,
				buy_volume_total: 40,
				// (10 * 100 + 30 * 120) / 40
				buy_vwap: 115,
				highest_buy_cost: 120,
				sell_volume_total: 20,
				// (5 * 130 + 15 * 150) / 20
				sell_vwap: 145,
				lowest_sell_cost: 130,
				spread: 10,
			});
			expect(point.spread_pct).toBeCloseTo((10 / 130) * 100, 10);
		});

		it("falls back to the order book when bid and ask are missing", async () => {
			const { sse, source } = await setup();

			await deliver(source, message({ bid: undefined, ask: undefined }));

			// lowest sell 130 - highest buy 120
			expect(sse.cxPointMap["DW.NC1"].spread).toBe(10);
		});

		it("tracks changes against the previous update", async () => {
			const { sse, source } = await setup();

			await deliver(source, message());
			await deliver(
				source,
				message({
					price: 110,
					bid: undefined,
					buy_orders: [
						{
							company_name: "A",
							company_code: "A",
							item_count: 25,
							item_cost: 100,
						},
					],
				})
			);

			const point = sse.cxPointMap["DW.NC1"];
			expect(point.price_change).toBe(10);
			expect(point.price_change_pct).toBe(10);
			expect(point.buy_volume_change).toBe(15);
			// a missing value keeps the previous one
			expect(point.bid).toBe(120);
		});

		it("ignores messages failing validation", async () => {
			const { sse, source } = await setup();
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await deliver(source, message({ exchange_code: "XX1" }));

			expect(sse.cxPointMap).toStrictEqual({});
			expect(error).toHaveBeenCalled();
		});

		it("lists only the main exchanges, sorted by ticker", async () => {
			const { sse, source } = await setup();

			await deliver(source, message({ material_ticker: "RAT" }));
			await deliver(source, message({ material_ticker: "DW" }));
			await deliver(source, message({ exchange_code: "CI2" }));

			expect(
				sse.cxPointTableData.value.map((p) => p.ticker)
			).toStrictEqual(["DW.NC1", "RAT.NC1"]);
		});

		it("groups received tickers per minute", async () => {
			const { sse, source } = await setup();
			vi.setSystemTime(new Date("2026-09-26T10:00:10Z"));

			await deliver(source, message());
			await deliver(source, message());
			await deliver(source, message({ material_ticker: "RAT" }));

			expect(sse.messageHistory.value).toStrictEqual([
				{
					timestamp: new Date("2026-09-26T10:00:00Z").getTime(),
					tickers: ["DW.NC1", "RAT.NC1"],
				},
			]);
		});

		it("is processing until 300ms after the last message", async () => {
			const { sse, source } = await setup();

			source.emit(message());
			expect(sse.isProcessing.value).toBe(true);

			// processed in the next frame, the cooldown starts there
			vi.advanceTimersByTime(16);
			await vi.advanceTimersByTimeAsync(299);
			expect(sse.isProcessing.value).toBe(true);

			await vi.advanceTimersByTimeAsync(1);
			expect(sse.isProcessing.value).toBe(false);
		});
	});

	describe("detectors", () => {
		it("logs detector events newest first", async () => {
			const { sse, source } = await setup();
			processUserDetectors
				.mockReturnValueOnce([{ id: "first" }])
				.mockReturnValueOnce([{ id: "second" }]);

			await deliver(source, message());
			await deliver(source, message());

			expect(sse.eventLog.map((e) => e.id)).toStrictEqual([
				"second",
				"first",
			]);

			sse.clearEventLog();
			expect(sse.eventLog).toHaveLength(0);
		});

		it("passes previous and new point to the detectors", async () => {
			const { sse, source } = await setup();

			await deliver(source, message());
			await deliver(source, message({ price: 110 }));

			const [, previous, next] = processUserDetectors.mock
				.calls[1] as unknown[];
			expect((previous as { price: number }).price).toBe(100);
			expect((next as { price: number }).price).toBe(110);
			expect(sse.cxPointMap["DW.NC1"].price).toBe(110);
		});

		it("skips detectors while inactive", async () => {
			const { sse, source } = await setup();
			sse.detectorsActive.value = false;

			await deliver(source, message());

			expect(processUserDetectors).not.toHaveBeenCalled();
		});

		it("caps the event log at 500 entries", async () => {
			const { sse, source } = await setup();
			processUserDetectors.mockReturnValue(
				Array.from({ length: 300 }, (_, i) => ({ id: String(i) }))
			);

			await deliver(source, message());
			await deliver(source, message());

			expect(sse.eventLog).toHaveLength(500);
		});
	});

	describe("frames", () => {
		const burst = [
			message(),
			message({ material_ticker: "RAT", price: 50 }),
			message({ price: 110 }),
			message({ exchange_code: "CI2", price: 90 }),
			message({ material_ticker: "RAT", price: 55, bid: undefined }),
			message({ price: 120 }),
		];

		// what the page shows, last_updated is the processing time
		function shown(sse: Awaited<ReturnType<typeof setup>>["sse"]) {
			return {
				points: Object.values(sse.cxPointMap).map(
					({ last_updated: _, ...point }) => point
				),
				history: sse.messageHistory.value,
				events: [...sse.eventLog],
			};
		}

		beforeEach(() => {
			vi.setSystemTime(new Date("2026-09-26T10:00:00Z"));
			processUserDetectors.mockImplementation(((
				_: unknown,
				__: unknown,
				next: { ticker: string; price: number }
			) => [{ id: `${next.ticker}@${next.price}` }]) as never);
		});

		it("a burst in one frame ends like the messages one by one", async () => {
			const one = await setup();
			for (const m of burst) await deliver(one.source, m);
			const oneByOne = shown(one.sse);

			const all = await setup();
			burst.forEach((m) => all.source.emit(m));
			vi.advanceTimersByTime(16);

			expect(shown(all.sse)).toStrictEqual(oneByOne);
			expect(oneByOne.events.map((e) => e.id)).toStrictEqual([
				"DW.NC1@120",
				"RAT.NC1@55",
				"DW.CI2@90",
				"DW.NC1@110",
				"RAT.NC1@50",
				"DW.NC1@100",
			]);
		});

		it("recomputes the table data once per frame", async () => {
			const { sse, source } = await setup();
			let runs = 0;
			watch(sse.cxPointTableData, () => runs++);

			burst.forEach((m) => source.emit(m));
			// async: the page renders between timers
			await vi.advanceTimersByTimeAsync(32);

			expect(runs).toBe(1);
			expect(sse.cxPointTableData.value).toHaveLength(2);
		});

		it("drops a pending frame on disconnect", async () => {
			const { sse, source } = await setup();

			source.emit(message());
			sse.disconnect();
			vi.advanceTimersByTime(16);

			expect(sse.cxPointMap).toStrictEqual({});
		});

		it("a broken message never drops the rest of its frame", async () => {
			const { sse, source } = await setup();
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			source.onmessage?.({ data: "{not json" });
			source.emit(message());
			vi.advanceTimersByTime(16);

			expect(error).toHaveBeenCalled();
			expect(Object.keys(sse.cxPointMap)).toStrictEqual(["DW.NC1"]);
		});
	});

	describe("order book edge cases", () => {
		const order = (item_cost: number, item_count?: number | null) => ({
			company_name: "X",
			company_code: "X",
			item_cost,
			item_count,
		});

		it("has no stats and no spread without orders, bid or ask", async () => {
			const { sse, source } = await setup();

			await deliver(
				source,
				message({
					bid: undefined,
					ask: undefined,
					buy_orders: [],
					sell_orders: [],
				})
			);

			const point = sse.cxPointMap["DW.NC1"];
			expect(point).toMatchObject({
				buy_volume_total: 0,
				sell_volume_total: 0,
				volume: 0,
			});
			expect(point.buy_vwap).toBeUndefined();
			expect(point.highest_buy_cost).toBeUndefined();
			expect(point.lowest_sell_cost).toBeUndefined();
			expect(point.spread).toBeUndefined();
			expect(point.spread_pct).toBeUndefined();
		});

		it("orders without a count add no volume and no stats", async () => {
			const { sse, source } = await setup();

			await deliver(
				source,
				message({
					bid: undefined,
					ask: undefined,
					buy_orders: [order(100, null), order(110)],
					sell_orders: [order(120, null)],
				})
			);

			const point = sse.cxPointMap["DW.NC1"];
			expect(point.buy_volume_total).toBe(0);
			expect(point.buy_vwap).toBeUndefined();
			expect(point.highest_buy_cost).toBeUndefined();
			expect(point.sell_vwap).toBeUndefined();
			expect(point.spread).toBeUndefined();
		});

		it("picks the best price whatever the order of the book", async () => {
			const { sse, source } = await setup();

			await deliver(
				source,
				message({
					bid: undefined,
					ask: undefined,
					buy_orders: [order(120, 1), order(100, 1)],
					sell_orders: [order(140, 1), order(130, 1)],
				})
			);

			const point = sse.cxPointMap["DW.NC1"];
			expect(point.highest_buy_cost).toBe(120);
			expect(point.lowest_sell_cost).toBe(130);
			expect(point.spread).toBe(10);
		});

		it("derives no price change without a price on either side", async () => {
			const { sse, source } = await setup();

			await deliver(source, message({ price: undefined }));
			await deliver(source, message({ price: 100 }));
			expect(sse.cxPointMap["DW.NC1"].price_change).toBeUndefined();

			const zero = await setup();
			await deliver(zero.source, message({ price: 0 }));
			await deliver(zero.source, message({ price: 10 }));
			const point = zero.sse.cxPointMap["DW.NC1"];
			// from 0: a change, but no percentage of nothing
			expect(point.price_change).toBe(10);
			expect(point.price_change_pct).toBeUndefined();
		});
	});

	describe("message history", () => {
		it("keeps the latest 25 minutes", async () => {
			const { sse, source } = await setup();
			vi.setSystemTime(new Date("2026-09-26T10:00:10Z"));

			for (let minute = 0; minute < 27; minute++) {
				await deliver(source, message());
				vi.setSystemTime(Date.now() + 60_000);
			}

			expect(sse.messageHistory.value).toHaveLength(25);
			// newest first
			expect(sse.messageHistory.value[0].timestamp).toBeGreaterThan(
				sse.messageHistory.value[24].timestamp
			);
		});
	});

	it("disconnects safely without a stream", async () => {
		vi.resetModules();
		setActivePinia(createPinia());
		const { useExchangeSSE } =
			await import("@/features/market_live/useExchangeSSE");
		const sse = useExchangeSSE();

		expect(() => sse.disconnect()).not.toThrow();
		expect(sse.isConnected.value).toBe(false);
	});
});
