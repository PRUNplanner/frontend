import { describe, expect, it } from "vitest";

import { MarketSummarySchema } from "@/features/api/schemas/marketSummary.schemas";

import summary from "@/tests/test_data/api_data_market_summary.json";

describe("MarketSummarySchema", () => {
	it("parses the real response", () => {
		const parsed = MarketSummarySchema.parse(summary);
		expect(parsed.days).toBe(90);
		expect(parsed.index.combined).toHaveLength(90);
		expect(parsed.materials.length).toBeGreaterThan(100);
	});

	it("rejects a renamed field", () => {
		const { as_of: _asOf, ...rest } = summary;
		expect(
			MarketSummarySchema.safeParse({ ...rest, asOf: 1 }).success
		).toBe(false);
	});

	it("rejects a string price", () => {
		const materials = [{ ...summary.materials[0], vwap_7d: "141" }];
		expect(
			MarketSummarySchema.safeParse({ ...summary, materials }).success
		).toBe(false);
	});
});
