import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

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

/** Deliver a message, processing is deferred by a 0ms timeout */
async function deliver(source: FakeEventSource, data: unknown) {
	source.emit(data);
	await vi.advanceTimersByTimeAsync(0);
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

			expect(source.url).toContain("/data/stream/?channels=cx");

			sse.connect();
			expect(FakeEventSource.last).toBe(source);

			source.onopen?.();
			expect(sse.isConnected.value).toBe(true);
			expect(sse.connectionError.value).toBeNull();

			vi.spyOn(console, "error").mockImplementation(() => {});
			source.onerror?.(new Error("lost"));
			expect(sse.isConnected.value).toBe(false);
			expect(sse.connectionError.value).not.toBeNull();
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
});
