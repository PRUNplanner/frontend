import { describe, it, expect } from "vitest";

import {
	fromRows,
	setBuyPrice,
	toRows,
	withoutFixedPrice,
} from "@/features/exchanges/fixedPrices.util";

// Types & Interfaces
import type {
	CXData,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";

const stored: CXDataTickerOption[] = [
	{ type: "BOTH", ticker: "H2O", value: 9 },
	{ type: "BUY", ticker: "RAT", value: 75 },
	{ type: "SELL", ticker: "RAT", value: 75 },
	{ type: "BUY", ticker: "RCO", value: 1750 },
];

describe("fixed price rows", () => {
	it("round-trips the stored shape", () => {
		expect(fromRows(toRows(stored))).toEqual(stored);
	});

	it("reads one row per material", () => {
		expect(toRows(stored)).toEqual([
			{ ticker: "H2O", buy: 9, sell: 9, stored: "both" },
			{ ticker: "RAT", buy: 75, sell: 75, stored: "pair" },
			{ ticker: "RCO", buy: 1750, sell: null, stored: "pair" },
		]);
	});

	it("keeps BOTH until a side differs", () => {
		const rows = toRows(stored);
		rows[0].sell = 12;
		expect(fromRows(rows).filter((o) => o.ticker === "H2O")).toEqual([
			{ type: "BUY", ticker: "H2O", value: 9 },
			{ type: "SELL", ticker: "H2O", value: 12 },
		]);
		rows[0].sell = null;
		expect(fromRows(rows).filter((o) => o.ticker === "H2O")).toEqual([
			{ type: "BUY", ticker: "H2O", value: 9 },
		]);
	});

	it("keeps an equal pair a pair and saves a new equal row as BOTH", () => {
		const rows = [
			...toRows(stored),
			{ ticker: "DW", buy: 5, sell: 5, stored: "new" as const },
			{ ticker: "OVE", buy: null, sell: 3, stored: "new" as const },
			{ ticker: "FE", buy: null, sell: null, stored: "new" as const },
		];
		const options = fromRows(rows);
		expect(options.filter((o) => o.ticker === "RAT")).toHaveLength(2);
		expect(options.filter((o) => o.ticker === "DW")).toEqual([
			{ type: "BOTH", ticker: "DW", value: 5 },
		]);
		expect(options.filter((o) => o.ticker === "OVE")).toEqual([
			{ type: "SELL", ticker: "OVE", value: 3 },
		]);
		// empty stores nothing
		expect(options.some((o) => o.ticker === "FE")).toBe(false);
	});

	it("sets a buy price, keeping the sell side", () => {
		expect(
			setBuyPrice(stored, "H2O", 8).filter((o) => o.ticker === "H2O")
		).toEqual([
			{ type: "BUY", ticker: "H2O", value: 8 },
			{ type: "SELL", ticker: "H2O", value: 9 },
		]);
		expect(setBuyPrice(stored, "GRN", 88.13).at(-1)).toEqual({
			type: "BUY",
			ticker: "GRN",
			value: 88.13,
		});
	});

	it("removes a material's fixed prices everywhere for its market price", () => {
		const cx: CXData = {
			cx_empire: [],
			cx_planets: [],
			ticker_empire: stored,
			ticker_planets: [
				{
					planet: "KW-688c",
					preferences: [{ type: "BOTH", ticker: "RAT", value: 1 }],
				},
			],
		};
		const without = withoutFixedPrice(cx, "RAT");
		expect(without.ticker_empire.some((o) => o.ticker === "RAT")).toBe(
			false
		);
		expect(without.ticker_planets[0].preferences).toEqual([]);
		expect(cx.ticker_empire).toHaveLength(4);
	});
});
