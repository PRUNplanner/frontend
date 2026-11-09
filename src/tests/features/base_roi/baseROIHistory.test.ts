import { describe, expect, it } from "vitest";

// Unit
import {
	hasHistory,
	profitHistory,
	aggregateDays,
	capacityHistory,
	tradedPerDay,
} from "@/features/base_roi/baseROIHistory";

// Types & Interfaces
import type { IPriceSource } from "@/features/cx/priceBook";
import type { IBaseROIMaterial } from "@/features/base_roi/baseROI.types";

const source = (key: IPriceSource["key"]): IPriceSource => ({
	level: "empire_exchange",
	exchange: "AI1",
	key,
	zero: false,
	volume: "AI1",
});

const material = (
	ticker: string,
	amount: number,
	price: number,
	key: IPriceSource["key"] = "vwap_7d"
): IBaseROIMaterial => ({
	ticker,
	amount,
	price,
	source: source(key),
	bid: 0,
	ask: 0,
});

describe("baseROIHistory (criterion 22)", () => {
	// sells 10 IND, buys 20 CU, degradation 100 per day
	const materials = [material("IND", 10, 7000), material("CU", -20, 1500)];
	const row = { materials, degradation: 100, fees: 0 };
	const series = {
		AI1: {
			IND: [6800, null, 7100, 7200],
			CU: [null, 1400, 1450, 1500],
		},
	};

	it("today's point is the profit at today's daily VWAP", () => {
		const history = profitHistory(row, series, 4).profit;
		expect(history[3]).toBeCloseTo(10 * 7200 - 20 * 1500 - 100);
	});

	it("matches a hand-computed row for three past days, gaps carry", () => {
		const history = profitHistory(row, series, 4).profit;
		// day 0: CU before its first trade = today's price 1500
		expect(history[0]).toBeCloseTo(10 * 6800 - 20 * 1500 - 100);
		// day 1: IND has no trade, carries 6800
		expect(history[1]).toBeCloseTo(10 * 6800 - 20 * 1400 - 100);
		expect(history[2]).toBeCloseTo(10 * 7100 - 20 * 1450 - 100);
	});

	it("no history: today's price on every day", () => {
		const flat = profitHistory(
			{
				materials: [
					material("IND", 10, 7000, "ask"),
					material("XX", -1, 50),
				],
				degradation: 0,
				fees: 0,
			},
			series,
			3
		).profit;
		expect(flat).toEqual([69_950, 69_950, 69_950]);
		expect(hasHistory([material("IND", 10, 7000, "ask")], series)).toBe(
			false
		);
		expect(hasHistory(materials, series)).toBe(true);
	});

	it("splits revenue and running cost", () => {
		const { revenue, cost } = profitHistory(row, series, 4);
		expect(revenue[3]).toBe(72_000);
		expect(cost[3]).toBe(30_100);
	});

	it("production fees are a running cost every day, like degradation", () => {
		const { cost, profit } = profitHistory({ ...row, fees: 40 }, series, 4);
		const free = profitHistory(row, series, 4);
		expect(cost[3]).toBe(30_140);
		for (let d = 0; d < 4; d++)
			expect(profit[d]).toBeCloseTo(free.profit[d] - 40);
	});

	it("pads a short window with the oldest known price's fallback", () => {
		const history = profitHistory(
			{ materials: [material("IND", 1, 7000)], degradation: 0, fees: 0 },
			series,
			6
		).profit;
		expect(history).toEqual([7000, 7000, 6800, 6800, 7100, 7200]);
	});
});

describe("aggregateDays", () => {
	const days = [1, 2, 3, 4, 5, 6, 7];
	const line = (values: (number | null)[]) => ({
		key: "a",
		label: "A",
		color: "#fff",
		values,
	});

	it("keeps the last days, buckets end today, the oldest may be short", () => {
		const out = aggregateDays(days, [line([9, 1, 2, 3, 4, 5, 6])], 6, 4);
		expect(out.days).toEqual([2, 4]);
		expect(out.series[0].values).toEqual([1.5, 4.5]);
	});

	it("a bucket's mean skips days without a value, null when none", () => {
		const out = aggregateDays(
			[1, 2, 3, 4],
			[line([null, null, 2, null])],
			4,
			2
		);
		expect(out.series[0].values).toEqual([null, 2]);
	});

	it("bucket 1 over the whole range changes nothing", () => {
		const values = [1, 2, 3, 4, 5, 6, 7];
		const out = aggregateDays(days, [line(values)], 90, 1);
		expect(out.days).toEqual(days);
		expect(out.series[0].values).toEqual(values);
	});
});

describe("tradedPerDay", () => {
	it("sums each day's rows, 0 on days without", () => {
		const day = 86_400_000;
		expect(
			tradedPerDay(
				[
					{ date_epoch: 2 * day, traded: 5 },
					{ date_epoch: 2 * day + 3_600_000, traded: 1 },
					{ date_epoch: 9 * day, traded: 7 },
				],
				[day, 2 * day]
			)
		).toEqual([0, 6]);
	});
});

describe("capacityHistory", () => {
	const m = (ticker: string, amount: number) => ({
		ticker,
		amount,
		traded: 0,
		exchange: "AI1",
	});
	const traded = new Map([
		["A.AI1", [100, 10]],
		["B.AI1", [40, 40]],
		["C.AI1", [30, 60]],
	]);

	it("each side: the scarcest material's traded ÷ amount, per day", () => {
		expect(
			capacityHistory([m("A", 10)], [m("B", 20), m("C", 10)], traded, 2)
		).toEqual({ outputs: [10, 1], inputs: [2, 2] });
	});

	it("no recipe inputs: inputs null; unknown volume counts 0", () => {
		expect(capacityHistory([m("Z", 1)], [m("X", 0)], traded, 2)).toEqual({
			outputs: [0, 0],
			inputs: null,
		});
	});
});
