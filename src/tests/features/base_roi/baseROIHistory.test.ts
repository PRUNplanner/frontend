import { describe, expect, it } from "vitest";

// Unit
import { hasHistory, profitHistory } from "@/features/base_roi/baseROIHistory";

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
	const series = {
		AI1: {
			IND: [6800, null, 7100, 7200],
			CU: [null, 1400, 1450, 1500],
		},
	};

	it("today's point is the profit at today's daily VWAP", () => {
		const history = profitHistory(materials, 100, series, 4).profit;
		expect(history[3]).toBeCloseTo(10 * 7200 - 20 * 1500 - 100);
	});

	it("matches a hand-computed row for three past days, gaps carry", () => {
		const history = profitHistory(materials, 100, series, 4).profit;
		// day 0: CU before its first trade = today's price 1500
		expect(history[0]).toBeCloseTo(10 * 6800 - 20 * 1500 - 100);
		// day 1: IND has no trade, carries 6800
		expect(history[1]).toBeCloseTo(10 * 6800 - 20 * 1400 - 100);
		expect(history[2]).toBeCloseTo(10 * 7100 - 20 * 1450 - 100);
	});

	it("no history: today's price on every day", () => {
		const flat = profitHistory(
			[material("IND", 10, 7000, "ask"), material("XX", -1, 50)],
			0,
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
		const { revenue, cost } = profitHistory(materials, 100, series, 4);
		expect(revenue[3]).toBe(72_000);
		expect(cost[3]).toBe(30_100);
	});

	it("pads a short window with the oldest known price's fallback", () => {
		const history = profitHistory(
			[material("IND", 1, 7000)],
			0,
			series,
			6
		).profit;
		expect(history).toEqual([7000, 7000, 6800, 6800, 7100, 7200]);
	});
});
