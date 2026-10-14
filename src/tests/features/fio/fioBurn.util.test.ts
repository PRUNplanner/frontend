import { describe, it, expect } from "vitest";

import { burnAxisMax, burnSummary } from "@/features/fio/fioBurn.util";

const material = (ticker: string, exhaustion: number) => ({
	ticker,
	input: 1,
	output: 0,
	delta: -1,
	stock: 0,
	exhaustion,
});

describe("burnAxisMax", () => {
	it("is 3 × the yellow threshold", () => {
		expect(burnAxisMax(10)).toBe(30);
		expect(burnAxisMax(5)).toBe(15);
	});
});

describe("burnSummary", () => {
	it("counts zones, consumed and produced materials and finds the first", () => {
		const s = burnSummary(
			[
				material("DW", 7.99),
				material("C", 3.04),
				material("FE", Infinity),
				material("RAT", 5.99),
				material("PT", 26.67),
			],
			5,
			10
		);

		expect(s).toMatchObject({
			red: 1,
			yellow: 2,
			consumed: 4,
			produced: 1,
			moreUnderYellow: 2,
		});
		expect(s.first?.ticker).toBe("C");
	});

	it("has no first material when everything is produced", () => {
		const s = burnSummary([material("FE", Infinity)], 5, 10);

		expect(s.first).toBeUndefined();
		expect(s.moreUnderYellow).toBe(0);
	});
});
