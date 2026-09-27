import { describe, it, expect } from "vitest";

import {
	calculateRepairCurve,
	findOptimalRepairDay,
	repairCostSeries,
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
		const curve = calculateRepairCurve(0, MATERIALS, PRICES);

		expect(curve).toHaveLength(181);
		expect(curve.map((c) => c.day)).toEqual(
			Array.from({ length: 181 }, (_, i) => i)
		);
	});

	it("calculateRepairCurve sums and averages the repair cost", () => {
		const curve = calculateRepairCurve(0, MATERIALS, PRICES);

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
		const curve = calculateRepairCurve(0, MATERIALS, PRICES);

		// day 0 would be 0 by definition
		expect(curve[0].profit).toBe(-6);
	});

	it("calculateRepairCurve integrates and averages the revenue", () => {
		const curve = calculateRepairCurve(1000, [], {});

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

	it("repairCostSeries splits the daily repair cost per material", () => {
		const curve = calculateRepairCurve(0, MATERIALS, PRICES);
		const series = repairCostSeries(curve, PRICES);

		expect(series.map((s) => s.name)).toEqual(["A", "B"]);
		expect(series[0].data).toHaveLength(181);
		// day 90: A 90 * 2, B 45 * 10
		expect(series[0].data[90]).toBe(180);
		expect(series[1].data[90]).toBe(450);
		// the series add up to the total cost of every day
		curve.forEach((c, day) =>
			expect(series[0].data[day] + series[1].data[day]).toBe(
				c.dailyRepair
			)
		);
	});

	it("repairCostSeries is empty without a curve", () => {
		expect(repairCostSeries([], PRICES)).toEqual([]);
	});
});
