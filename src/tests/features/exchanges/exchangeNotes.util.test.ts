import { describe, it, expect } from "vitest";

import { createPriceBook } from "@/features/cx/priceBook";
import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";
import {
	COGM_DRIFT_THRESHOLD,
	exchangeNotes,
} from "@/features/exchanges/exchangeNotes.util";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type {
	IExchangePlanBase,
	IMaterialCOGM,
} from "@/features/exchanges/useExchangePlanData.types";

const row = (v: Partial<Exchange>) =>
	({ vwap_7d: 1, vwap_30d: 1, ask: 1, bid: 1, ...v }) as Exchange;
const exchanges: Record<string, Exchange> = {
	"RAT.NC1": row({}),
	"RAT.UNIVERSE": row({}),
	"GAP.NC1": row({ ask: 0 }),
	"GAP.IC1": row({ bid: 0 }),
	"GAP.UNIVERSE": row({}),
	"NONE.UNIVERSE": row({ vwap_30d: 0 }),
};
const getExchange = (id: string) => {
	if (!exchanges[id]) throw new Error(`Exchange '${id}' not found.`);
	return exchanges[id];
};

const cx: CXData = {
	cx_empire: [{ type: "BUY", exchange: "NC1_ASK" }],
	cx_planets: [
		{ planet: "P2", preferences: [{ type: "BUY", exchange: "IC1_BID" }] },
		// same as all planets, and no plan uses P3
		{ planet: "P3", preferences: [{ type: "BUY", exchange: "NC1_ASK" }] },
	],
	ticker_empire: [
		{ type: "BOTH", ticker: "H2O", value: 0 },
		{ type: "BUY", ticker: "RAT", value: 75 },
		{ type: "SELL", ticker: "FE", value: 10 },
	],
	ticker_planets: [
		{ planet: "P1", preferences: [{ type: "SELL", ticker: "DW", value: 0 }] },
	],
};

const base = (
	planet: string,
	materials: IExchangePlanBase["materials"]
): IExchangePlanBase => ({
	planUuid: planet,
	planName: planet,
	planet,
	empireUuid: undefined,
	linked: true,
	materials,
	recipes: [],
});

const bases = [
	base("P1", [
		{ ticker: "GAP", delta: -1 },
		{ ticker: "NONE", delta: 2 },
		{ ticker: "ZZZ", delta: 1 },
		{ ticker: "RAT", delta: -3 },
	]),
	base("P2", [{ ticker: "GAP", delta: -1 }]),
	base("P4", [{ ticker: "GAP", delta: -5 }]),
];

const cogm = (ticker: string, value: number): IMaterialCOGM => ({
	ticker,
	value,
	entries: [{ planUuid: "P1", planName: "P1", planet: "P1", value }],
});

const notesFor = (
	cogms: IMaterialCOGM[] = [],
	linkedEmpires = 0,
	data: CXData = cx
) =>
	exchangeNotes({
		cxData: data,
		bases,
		bookFor: (planet) => createPriceBook(() => data, planet, getExchange),
		cogms: new Map(cogms.map((c) => [c.ticker, c])),
		linkedEmpires,
		plannedPlanets: new Set(["P1", "P2", "P4"]),
	});

const silent = <T>(fn: () => T): T => {
	const error = console.error;
	console.error = () => {};
	try {
		return fn();
	} finally {
		console.error = error;
	}
};

describe("exchange notes", () => {
	const notes = silent(() => notesFor([cogm("RAT", 64.43)]));
	const byCode = (code: string) => notes.filter((n) => n.code === code);

	it("1: an exchange rule without a price, per rule and scope", () => {
		expect(byCode("exchange_gap")).toEqual([
			expect.objectContaining({
				kind: "warning",
				scope: ALL_PLANETS,
				option: "NC1_ASK",
				type: "BUY",
				tickers: ["GAP"],
				planets: ["P1", "P4"],
			}),
			expect.objectContaining({
				scope: "P2",
				option: "IC1_BID",
				tickers: ["GAP"],
				planets: ["P2"],
			}),
		]);
	});

	it("2: a material without any price", () => {
		expect(byCode("no_price")).toEqual([
			expect.objectContaining({
				kind: "warning",
				tickers: ["NONE", "ZZZ"],
				planets: ["P1"],
			}),
		]);
	});

	it("3: a fixed price of 0, per scope", () => {
		expect(
			byCode("fixed_zero").map((n) => [n.scope, n.tickers, n.kind])
		).toEqual([
			[ALL_PLANETS, ["H2O"], "info"],
			["P1", ["DW"], "info"],
		]);
	});

	it("4: a fixed buy price off its COGM by more than the threshold", () => {
		expect(byCode("cogm_drift")).toEqual([
			expect.objectContaining({
				tickers: ["RAT"],
				value: 75,
				cogm: 64.43,
				planets: ["P1"],
			}),
		]);
		const near = 75 / (1 + COGM_DRIFT_THRESHOLD / 2);
		expect(
			silent(() => notesFor([cogm("RAT", near)])).some(
				(n) => n.code === "cogm_drift"
			)
		).toBe(false);
		// sell-only fixed prices are not compared
		expect(
			silent(() => notesFor([cogm("FE", 1)])).some(
				(n) => n.code === "cogm_drift"
			)
		).toBe(false);
	});

	it("5: a planet rule identical to the all-planets rule", () => {
		expect(byCode("planet_redundant").map((n) => n.scope)).toEqual(["P3"]);
	});

	it("6: an unused preference and rules of planets without a plan", () => {
		expect(byCode("unused_preference")).toHaveLength(1);
		expect(byCode("unplanned_planets")[0].planets).toEqual(["P3"]);
		expect(
			silent(() => notesFor([], 2)).some(
				(n) => n.code === "unused_preference"
			)
		).toBe(false);
	});

	it("lists warnings first and has no far-from-market note", () => {
		const kinds = notes.map((n) => n.kind);
		expect(kinds.indexOf("info")).toBeGreaterThan(
			kinds.lastIndexOf("warning")
		);
		expect(notes.every((n) => !/market/.test(n.code))).toBe(true);
	});

	it("follows the edited rules", () => {
		const fixed: CXData = {
			...cx,
			ticker_empire: [
				...cx.ticker_empire,
				{ type: "BUY", ticker: "GAP", value: 5 },
			],
		};
		const after = silent(() => notesFor([], 1, fixed));
		expect(
			after
				.filter((n) => n.code === "exchange_gap")
				.flatMap((n) => n.tickers)
		).toEqual([]);
	});
});
