import { describe, it, expect } from "vitest";

import {
	askBidPriceBook,
	checkMaterial,
	countLevels,
	flaggedCheck,
	formatShare,
	marketCheck,
} from "@/features/cx/marketCheck.util";
import { createPriceBook } from "@/features/cx/priceBook";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { CXData } from "@/features/api/schemas/cxData.schemas";
import type { IPriceSource } from "@/features/cx/priceBook";

// 3,000 traded in 30 days: 100 a day
const ex = (over: Partial<Exchange> = {}) =>
	({
		sum_traded_30d: 3000,
		sum_traded_7d: 700,
		bid: 90,
		ask: 110,
		vwap_30d: 100,
		exchange_status: "ACTIVE",
		...over,
	}) as Exchange;

const source = (over: Partial<IPriceSource> = {}): IPriceSource => ({
	level: "empire_exchange",
	exchange: "AI1",
	key: "vwap_30d",
	zero: false,
	volume: "AI1",
	...over,
});

describe("checkMaterial", () => {
	it("flags red, amber or nothing by share of the daily volume", () => {
		const red = checkMaterial("FE", 50, source(), ex());
		const amber = checkMaterial("FE", 10, source(), ex());
		const fine = checkMaterial("FE", 5, source(), ex());

		expect(red.sharePct).toBe(50);
		expect([red.level, red.flags]).toEqual(["red", ["bigger"]]);
		expect([amber.level, amber.flags]).toEqual(["amber", ["large_share"]]);
		expect([fine.level, fine.flags]).toEqual([null, []]);
	});

	it("flags no trades in 7 days", () => {
		const c = checkMaterial("FE", 1, source(), ex({ sum_traded_7d: 0 }));
		expect(c.flags).toEqual(["no_trades"]);
		expect(c.level).toBe("red");
	});

	it("flags a buy without offers and a sale without buyers", () => {
		expect(
			checkMaterial("FE", -1, source(), ex({ ask: 0 })).flags
		).toEqual(["no_offers"]);
		expect(checkMaterial("FE", 1, source(), ex({ bid: 0 })).flags).toEqual(
			["no_buyers"]
		);
	});

	it("flags no price before everything else", () => {
		const c = checkMaterial(
			"FE",
			-50,
			source({ level: "unresolved", zero: true }),
			undefined
		);
		expect(c.flags[0]).toBe("no_price");
		expect(c.sharePct).toBeNull();
	});

	it("checks a fallback price against UNIVERSE and mutes it", () => {
		const book = createPriceBook(undefined, undefined, () => ex());
		const [c] = marketCheck([{ ticker: "FE", delta: 1 }], book, (id) => {
			expect(id).toBe("FE.UNIVERSE");
			return ex();
		});
		expect(c.exchange).toBe("UNIVERSE");
		expect([c.level, c.flags]).toEqual(["muted", ["all_exchanges"]]);
	});

	it("shows a 25 % spread without a flag", () => {
		const c = checkMaterial("FE", 1, source(), ex({ bid: 75, ask: 100 }));
		expect(c.spreadPct).toBe(25);
		expect(c.flags).toEqual([]);
	});

	it("mutes stale data", () => {
		const c = checkMaterial(
			"FE",
			1,
			source(),
			ex({ exchange_status: "STALE" })
		);
		expect([c.level, c.flags]).toEqual(["muted", ["stale"]]);
	});
});

describe("marketCheck", () => {
	it("skips unmoved materials, sorts red, amber, then share, and counts", () => {
		const book = createPriceBook(undefined, undefined, () => ex());
		const cx: CXData = {
			cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
			cx_planets: [],
			ticker_empire: [],
			ticker_planets: [],
		};
		const checks = marketCheck(
			[
				{ ticker: "A", delta: 2 },
				{ ticker: "B", delta: 20 },
				{ ticker: "C", delta: 0 },
				{ ticker: "D", delta: -60 },
				{ ticker: "E", delta: 3 },
			],
			createPriceBook(() => cx, undefined, () => ex()),
			() => ex()
		);
		expect(checks.map((c) => c.ticker)).toEqual(["D", "B", "E", "A"]);
		expect(countLevels(checks)).toEqual({
			red: 1,
			amber: 1,
			muted: 0,
			fine: 2,
		});
		expect(
			countLevels(marketCheck([{ ticker: "A", delta: 1 }], book, () => ex()))
		).toEqual({ red: 0, amber: 0, muted: 1, fine: 1 });
	});

	it("treats a material missing on the exchange as untraded", () => {
		const book = createPriceBook(undefined, undefined, () => ex());
		const [c] = marketCheck([{ ticker: "FE", delta: 1 }], book, () => {
			throw new Error("missing");
		});
		expect(c.flags).toContain("no_trades");
	});
});

describe("askBidPriceBook", () => {
	const cx: CXData = {
		cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	};
	const data: Record<string, Exchange> = {
		"FE.AI1": ex(),
		"C.AI1": ex({ ask: 0 }),
		"FE.UNIVERSE": ex(),
	};
	const get = (id: string) => data[id];

	it("buys at ask, sells at bid and keeps the plan price without one", () => {
		const { book, kept } = askBidPriceBook(
			createPriceBook(() => cx, undefined, get),
			get
		);
		expect(book.getPrice("FE", "BUY")).toBe(110);
		expect(book.getPrice("FE", "SELL")).toBe(90);
		expect(book.getPrice("C", "BUY")).toBe(100);
		expect([...kept.zero]).toEqual(["C"]);
	});

	it("keeps the plan price on the fallback", () => {
		const { book, kept } = askBidPriceBook(
			createPriceBook(undefined, undefined, get),
			get
		);
		expect(book.getPrice("FE", "BUY")).toBe(100);
		expect([...kept.fallback]).toEqual(["FE"]);
		expect(book.getPriceSource("FE", "BUY").level).toBe("fallback");
	});
});

describe("askBidPriceBook with a UNIVERSE preference", () => {
	it("keeps the plan price and names it apart from the fallback", () => {
		const universe: CXData = {
			cx_empire: [{ type: "BOTH", exchange: "UNIVERSE_30D" }],
			cx_planets: [],
			ticker_empire: [],
			ticker_planets: [],
		};
		const get = () => ex();
		const { book, kept } = askBidPriceBook(
			createPriceBook(() => universe, undefined, get),
			get
		);
		expect(book.getPrice("FE", "BUY")).toBe(100);
		expect([...kept.universe]).toEqual(["FE"]);
		expect(kept.fallback.size).toBe(0);
	});
});

describe("flaggedCheck", () => {
	const checks = new Map(
		[
			checkMaterial("A", 50, source(), ex()),
			checkMaterial("B", 1, source({ level: "fallback", volume: "UNIVERSE" }), ex()),
			checkMaterial("C", 1, source(), ex({ exchange_status: "STALE" })),
			checkMaterial("D", 1, source(), ex()),
		].map((c) => [c.ticker, c])
	);

	it("gives red, amber and stale an icon, not all exchanges", () => {
		expect(flaggedCheck(checks, "A")?.level).toBe("red");
		expect(flaggedCheck(checks, "B")).toBeUndefined();
		expect(flaggedCheck(checks, "C")?.level).toBe("muted");
		expect(flaggedCheck(checks, "D")).toBeUndefined();
		expect(flaggedCheck(undefined, "A")).toBeUndefined();
	});
});

describe("formatShare", () => {
	it("shows one decimal below 100 %, none from there", () => {
		expect(formatShare(6)).toBe("6.0 %");
		expect(formatShare(99.96)).toBe("100.0 %");
		expect(formatShare(189.4)).toBe("189 %");
		expect(formatShare(1234.5)).toBe("1,235 %");
		expect(formatShare(0)).toBe("0.0 %");
	});

	it("shows a dash without data, and keeps the unit for ∞ and NaN", () => {
		expect(formatShare(null)).toBe("—");
		expect(formatShare(Infinity)).toBe("— %");
		expect(formatShare(NaN)).toBe("— %");
	});
});
