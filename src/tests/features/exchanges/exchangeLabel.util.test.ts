import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";

import {
	exchangeOptionLabel,
	isNoPrice,
	priceSourceLabel,
} from "@/features/exchanges/exchangeLabel.util";

// Types & Interfaces
import type { IPriceSource } from "@/features/cx/priceBook";

import exchanges from "@/locales/en_US/exchanges.json";

const { t } = createI18n({
	legacy: false,
	locale: "en_US",
	messages: { en_US: { exchanges } },
}).global;

const source = (s: Partial<IPriceSource>): IPriceSource => ({
	level: "empire_exchange",
	exchange: "NC1",
	key: "vwap_30d",
	zero: false,
	volume: "NC1",
	...s,
});

describe("exchange labels", () => {
	it("labels stored options without raw codes", () => {
		expect(exchangeOptionLabel("AI1_30D", t)).toBe("AI1 · VWAP 30D");
		expect(exchangeOptionLabel("NC1_ASK", t)).toBe("NC1 · Ask");
		expect(exchangeOptionLabel("IC1_BID", t)).toBe("IC1 · Bid");
		expect(exchangeOptionLabel("UNIVERSE_7D", t)).toBe(
			"Universe · VWAP 7D"
		);
	});

	it("labels every price source", () => {
		expect(priceSourceLabel(source({}), t)).toBe("NC1 · VWAP 30D");
		expect(
			priceSourceLabel(
				source({ level: "planet_exchange", key: "bid" }),
				t
			)
		).toBe("NC1 · Bid · planet");
		expect(priceSourceLabel(source({ key: "ask", zero: true }), t)).toBe(
			"NC1 · Ask · no price"
		);
		expect(
			priceSourceLabel(
				source({ level: "fallback", exchange: "UNIVERSE" }),
				t
			)
		).toBe("Universe · VWAP 30D");
		expect(
			priceSourceLabel(source({ level: "empire_ticker", zero: true }), t)
		).toBe("Fixed · all planets");
		expect(priceSourceLabel(source({ level: "planet_ticker" }), t)).toBe(
			"Fixed · this planet"
		);
		expect(priceSourceLabel(source({ level: "unresolved" }), t)).toBe(
			"No price data"
		);
	});

	it("tells a missing price from a fixed 0", () => {
		expect(isNoPrice(source({ zero: true }))).toBe(true);
		expect(isNoPrice(source({ level: "fallback", zero: true }))).toBe(true);
		expect(isNoPrice(source({ level: "unresolved", zero: true }))).toBe(
			true
		);
		expect(isNoPrice(source({ level: "empire_ticker", zero: true }))).toBe(
			false
		);
		expect(isNoPrice(source({}))).toBe(false);
	});
});
