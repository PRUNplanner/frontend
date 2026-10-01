import { describe, it, expect } from "vitest";

import {
	segmentColor,
	starterExperts,
} from "@/features/plan_analytics/planInsights.util";

describe("planInsights.util", () => {
	it("segmentColor: brand colour first, the last one repeats", () => {
		expect(segmentColor(0)).toBe("bg-prunplanner");
		expect(segmentColor(6)).toBe("bg-white/10");
		expect(segmentColor(20)).toBe("bg-white/10");
	});

	describe("starterExperts", () => {
		it("adds types in at least half of the plans, rounded", () => {
			expect(
				starterExperts([
					{ type: "Metallurgy", plans_percentage: 49.9, median_amount: 2 },
					{ type: "Chemistry", plans_percentage: 50, median_amount: 1.5 },
					{ type: "Agriculture", plans_percentage: 90, median_amount: 0.4 },
				])
			).toStrictEqual([{ type: "Chemistry", amount: 2 }]);
		});

		it("skips types the plan doesn't know", () => {
			expect(
				starterExperts([
					{ type: "Resource Extraction", plans_percentage: 90, median_amount: 1 },
					{ type: "Resource_Extraction", plans_percentage: 80, median_amount: 1 },
				])
			).toStrictEqual([{ type: "Resource_Extraction", amount: 1 }]);
		});

		it("keeps 5 per type and 6 in total, most planned first", () => {
			expect(
				starterExperts([
					{ type: "Chemistry", plans_percentage: 60, median_amount: 3 },
					{ type: "Metallurgy", plans_percentage: 95, median_amount: 7 },
					{ type: "Agriculture", plans_percentage: 55, median_amount: 2 },
				])
			).toStrictEqual([
				{ type: "Metallurgy", amount: 5 },
				{ type: "Chemistry", amount: 1 },
			]);
		});
	});
});
