import { describe, it, expect } from "vitest";

import {
	calculateRepairCurve,
	findOptimalRepairDay,
	calculateAmountAtDay,
	dueInDays,
	dueTagType,
	goodRange,
	repairCostSplit,
	repairMaterialsAt,
	repairEfficiency,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import type { IPlanRepairAnalysisElement } from "@/features/planning/components/tools/planRepairAnalysis.types";

const MATERIALS = [
	{ ticker: "A", input: 180, output: 0 },
	{ ticker: "B", input: 90, output: 0 },
];
const PRICES = { A: 2, B: 10 };

describe("repairAnalysis.util", () => {
	it("repairEfficiency decays from 1 towards 0.33", () => {
		// 0.33 + 0.67 / (1 + e^(0.07156 * (0 - 100.87))) = 0.33 + 0.67 / 1.000733
		expect(repairEfficiency(0)).toBeCloseTo(0.9995, 4);
		// midpoint of the curve: e^0 = 1 -> 0.33 + 0.67 / 2
		expect(repairEfficiency(100.87)).toBeCloseTo(0.665, 10);
		// 0.33 + 0.67 / (1 + e^5.66254) = 0.33 + 0.67 / 288.88
		expect(repairEfficiency(180)).toBeCloseTo(0.3323, 4);
	});

	it("calculateRepairCurve has one element per day 0..180", () => {
		const curve = calculateRepairCurve(0, 0, MATERIALS, PRICES);

		expect(curve).toHaveLength(181);
		expect(curve.map((c) => c.day)).toEqual(
			Array.from({ length: 181 }, (_, i) => i)
		);
	});

	it("calculateRepairCurve sums and averages the repair cost", () => {
		const curve = calculateRepairCurve(0, 0, MATERIALS, PRICES);

		// day 0: nothing to repair
		expect(curve[0].materials).toEqual([
			{ ticker: "A", amount: 0 },
			{ ticker: "B", amount: 0 },
		]);
		expect(curve[0].dailyRepair).toBe(0);

		// day 1: A 180 - floor(180 * 179 / 180) = 1, B 90 - floor(89.5) = 1
		// 1 * 2 + 1 * 10 = 12, averaged over 2 days = 6
		expect(curve[1].dailyRepair).toBe(12);
		expect(curve[1].repair).toBe(6);
		expect(curve[1].profit).toBe(-6);

		// day 90: A 180 - 90 = 90, B 90 - 45 = 45 -> 90 * 2 + 45 * 10 = 630
		expect(curve[90].materials).toEqual([
			{ ticker: "A", amount: 90 },
			{ ticker: "B", amount: 45 },
		]);
		expect(curve[90].dailyRepair).toBe(630);
		expect(curve[90].repair).toBe(630 / 91);

		// day 180: full construction cost 180 * 2 + 90 * 10 = 1260
		expect(curve[180].dailyRepair).toBe(1260);
		expect(curve[180].profit).toBe(-1260 / 181);
	});

	it("calculateRepairCurve copies day 1's profit to day 0", () => {
		const curve = calculateRepairCurve(0, 0, MATERIALS, PRICES);

		// day 0 would be 0 by definition
		expect(curve[0].profit).toBe(-6);
	});

	it("calculateRepairCurve integrates and averages the revenue", () => {
		const curve = calculateRepairCurve(1000, 0, [], {});

		// efficiency 0.999509 on day 0, 0.999473 on day 1
		expect(curve[0].dailyRevenue).toBeCloseTo(999.509, 2);
		expect(curve[1].dailyRevenue).toBeCloseTo(999.473, 2);
		expect(curve[1].dailyRevenue_integral).toBeCloseTo(1998.982, 2);
		// (999.509 + 999.473) / 2 without any repair cost
		expect(curve[1].dailyRevenue_norm).toBeCloseTo(999.491, 2);
		expect(curve[1].profit).toBeCloseTo(999.491, 2);
		expect(curve[0].profit).toBe(curve[1].profit);

		// revenue keeps falling, so does its running average
		expect(curve[180].dailyRevenue_norm).toBeLessThan(
			curve[90].dailyRevenue_norm
		);
	});

	it("calculateRepairCurve charges workforce in full, wear or not", () => {
		const curve = calculateRepairCurve(1000, 300, [], {});
		const production = calculateRepairCurve(1000, 0, [], {});

		// workers eat the same at 100 % and 33 % efficiency
		curve.forEach((c, day) =>
			expect(c.profit).toBeCloseTo(production[day].profit - 300, 10)
		);
	});

	it("findOptimalRepairDay picks the first day of the highest profit", () => {
		const curve = [5, 5, 8, 8, 3].map(
			(profit) => ({ profit }) as IPlanRepairAnalysisElement
		);

		expect(findOptimalRepairDay(curve)).toEqual({ day: 2, profit: 8 });
	});

	it("findOptimalRepairDay handles negative profits and no data", () => {
		const curve = [-9, -4, -6].map(
			(profit) => ({ profit }) as IPlanRepairAnalysisElement
		);
		expect(findOptimalRepairDay(curve)).toEqual({ day: 1, profit: -4 });

		expect(findOptimalRepairDay([])).toEqual({
			day: -1,
			profit: -Infinity,
		});
	});

	it("goodRange spans the consecutive days within 1 % of the best", () => {
		const profits = Array.from({ length: 181 }, () => 0);
		for (let d = 45; d <= 55; d++) profits[d] = 99.5;
		profits[50] = 100;
		// 98 and 98.9 are below 100 - 1; day 60 is within but not connected
		profits[44] = 98;
		profits[56] = 98.9;
		profits[60] = 99.9;

		expect(goodRange(curveOf(profits), 50)).toEqual([45, 55]);
	});

	it("goodRange works for a building that loses money", () => {
		const profits = Array.from({ length: 181 }, () => -200);
		for (let d = 28; d <= 33; d++) profits[d] = -100.5;
		profits[30] = -100;
		// limit is -100 - |-100| * 1 % = -101
		profits[27] = -102;
		profits[34] = -101.5;

		expect(goodRange(curveOf(profits), 30)).toEqual([28, 33]);
	});

	it("goodRange stops at day 1 and day 180, and takes a tolerance", () => {
		const flat = curveOf(Array.from({ length: 181 }, () => 50));
		expect(goodRange(flat, 90)).toEqual([1, 180]);

		const profits = Array.from({ length: 181 }, (_, d) => 100 - Math.abs(d - 90));
		// 5 % of 100: 95 and up, days 85 to 95
		expect(goodRange(curveOf(profits), 90, 0.05)).toEqual([85, 95]);
	});

	it("repairCostSplit: profit = production - workforce - lost output - repair", () => {
		const production = 1000;
		const workforce = 300;
		const curve = calculateRepairCurve(
			production,
			workforce,
			MATERIALS,
			PRICES
		);
		const split = repairCostSplit(curve, production);

		expect(split).toHaveLength(181);
		for (let day = 1; day <= 180; day++)
			expect(
				production -
					workforce -
					split[day].lostOutput -
					split[day].repairPerDay
			).toBeCloseTo(curve[day].profit, 8);
		// output lost to wear grows, the averaged repair cost shrinks
		expect(split[180].lostOutput).toBeGreaterThan(split[30].lostOutput);
		expect(split[1].repairPerDay).toBe(6);
	});

	it("repairMaterialsAt scales one building's materials to the interval and amount", () => {
		expect(repairMaterialsAt(MATERIALS, 90, 3)).toEqual([
			{ ticker: "A", input: calculateAmountAtDay(90, 180) * 3, output: 0 },
			{ ticker: "B", input: calculateAmountAtDay(90, 90) * 3, output: 0 },
		]);
		// A 90 * 3, B 45 * 3
		expect(repairMaterialsAt(MATERIALS, 90, 3).map((m) => m.input)).toEqual(
			[270, 135]
		);
	});

	it("dueInDays is negative when overdue", () => {
		expect(dueInDays(60, 52)).toBe(8);
		expect(dueInDays(30, 30)).toBe(0);
		expect(dueInDays(30, 40)).toBe(-10);
	});

	it("dueTagType: error below 0, warning for 0-7, secondary above 7", () => {
		expect([-10, -1, 0, 1, 7, 8, 90].map(dueTagType)).toEqual([
			"error",
			"error",
			"warning",
			"warning",
			"warning",
			"secondary",
			"secondary",
		]);
	});
});

function curveOf(profits: number[]): IPlanRepairAnalysisElement[] {
	return profits.map((profit) => ({ profit }) as IPlanRepairAnalysisElement);
}
