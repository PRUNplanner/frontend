import { describe, expect, it } from "vitest";

import {
	constructionTotals,
	plannedAmount,
	supplyAmount,
} from "@/features/planning/util/carts.util";

describe("carts.util", () => {
	it("supplyAmount: daily amount times days, rounded up", () => {
		expect(supplyAmount(-2.1, 10)).toBe(21);
		expect(supplyAmount(-2.11, 10)).toBe(22);
		expect(supplyAmount(0.5, 3)).toBe(2);
	});

	it("plannedAmount: CM once, else production, else infrastructure", () => {
		const production = [{ name: "EXT", amount: 4 }];
		const infrastructure = { HB1: 3 };
		expect(plannedAmount("CM", production, infrastructure)).toBe(1);
		expect(plannedAmount("EXT", production, infrastructure)).toBe(4);
		expect(plannedAmount("HB1", production, infrastructure)).toBe(3);
		expect(
			plannedAmount("FRM", production, infrastructure)
		).toBeUndefined();
	});

	it("constructionTotals: materials per building times amount, every material listed", () => {
		const construction = [
			{
				ticker: "EXT",
				amount: 2,
				materials: [
					{ ticker: "BSE", input: 10, output: 0 },
					{ ticker: "TRU", input: 4, output: 0 },
				],
			},
			{
				ticker: "HB1",
				amount: 1,
				materials: [{ ticker: "BSE", input: 4, output: 0 }],
			},
		] as Parameters<typeof constructionTotals>[0];
		const totals = constructionTotals(construction, { EXT: 2, HB1: 0 });
		expect(totals).toEqual({ BSE: 20, TRU: 8 });
		// listed alphabetically, as the cart's table and XIT package
		expect(
			Object.keys(constructionTotals(construction.toReversed(), {}))
		).toEqual(["BSE", "TRU"]);
	});
});
