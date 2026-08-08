import { describe, expect, it } from "vitest";

// Calculations
import { resolveMarketPrice } from "@/features/raukk_sourcing/calculations/priceMode";

// Types & Interfaces
import { IRaukkExchangePrices } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

const exchange: IRaukkExchangePrices = {
	bid: 100,
	ask: 140,
	vwap_7d: 115,
	vwap_30d: 125,
};

describe("Raukk Sourcing: Price Mode", () => {
	describe("resolveMarketPrice", () => {
		it("resolves each price mode", () => {
			expect(resolveMarketPrice(exchange, "BID")).toBe(100);
			expect(resolveMarketPrice(exchange, "ASK")).toBe(140);
			expect(resolveMarketPrice(exchange, "MID")).toBe(120);
			expect(resolveMarketPrice(exchange, "AVG7D")).toBe(115);
			expect(resolveMarketPrice(exchange, "AVG30D")).toBe(125);
		});

		it("returns 0 without exchange data", () => {
			expect(resolveMarketPrice(undefined, "BID")).toBe(0);
			expect(resolveMarketPrice(undefined, "MID")).toBe(0);
		});

		it("sanitizes non finite values", () => {
			const broken = {
				bid: NaN,
				ask: 50,
				vwap_7d: undefined,
				vwap_30d: null,
			} as unknown as IRaukkExchangePrices;

			expect(resolveMarketPrice(broken, "BID")).toBe(0);
			expect(resolveMarketPrice(broken, "MID")).toBe(25);
			expect(resolveMarketPrice(broken, "AVG7D")).toBe(0);
			expect(resolveMarketPrice(broken, "AVG30D")).toBe(0);
		});

		it("falls back to 0 on an unknown mode", () => {
			expect(
				resolveMarketPrice(exchange, "FOO" as unknown as "BID")
			).toBe(0);
		});

		it("accepts real exchange api data shape", () => {
			const apiLike = {
				ticker: "ALO.IC1",
				exchange_code: "IC1",
				bid: 240,
				ask: 260,
				vwap_7d: 249,
				vwap_30d: 251,
				supply: 100,
				demand: 200,
			};

			expect(resolveMarketPrice(apiLike, "MID")).toBe(250);
		});
	});
});
