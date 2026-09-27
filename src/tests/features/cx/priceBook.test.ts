import { describe, it, expect, vi } from "vitest";

import { createPriceBook } from "@/features/cx/priceBook";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { CXData } from "@/features/api/schemas/cxData.schemas";

const exchange = (vwap_30d: number, vwap_7d: number = 0) =>
	({ vwap_30d, vwap_7d }) as Exchange;

const exchanges: Record<string, Exchange> = {
	"RAT.UNIVERSE": exchange(100),
	"RAT.NC1": exchange(0, 120),
	"DW.UNIVERSE": exchange(50),
};
const getExchange = vi.fn((id: string) => {
	if (!exchanges[id]) throw new Error(`Exchange '${id}' not found.`);
	return exchanges[id];
});

const cx: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_7D" }],
	cx_planets: [],
	ticker_empire: [{ type: "BUY", ticker: "DW", value: 42 }],
	ticker_planets: [
		{
			planet: "KW-688c",
			preferences: [{ type: "SELL", ticker: "DW", value: 7 }],
		},
	],
};

describe("createPriceBook", () => {
	it("uses the Universe VWAP 30d without CX", () => {
		const book = createPriceBook(undefined, "KW-688c", getExchange);
		expect(book.getPrice("RAT", "BUY")).toBe(100);
	});

	it("applies planet ticker, empire ticker and exchange preferences", () => {
		const book = createPriceBook(() => cx, "KW-688c", getExchange);
		expect(book.getPrice("DW", "SELL")).toBe(7);
		expect(book.getPrice("DW", "BUY")).toBe(42);
		expect(book.getPrice("RAT", "BUY")).toBe(120);
	});

	it("resolves each ticker and type once and reads the CX once", () => {
		getExchange.mockClear();
		const getCX = vi.fn(() => cx);
		const book = createPriceBook(getCX, undefined, getExchange);

		book.getPrice("RAT", "BUY");
		book.getPrice("RAT", "BUY");
		book.getPrice("RAT", "SELL");

		expect(getCX).toHaveBeenCalledTimes(1);
		expect(getExchange).toHaveBeenCalledTimes(2);
	});

	it("returns 0 and logs when a price can't be resolved", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const book = createPriceBook(undefined, undefined, getExchange);

		expect(book.getPrice("FOO", "BUY")).toBe(0);
		expect(error).toHaveBeenCalledOnce();
		error.mockRestore();
	});
});
