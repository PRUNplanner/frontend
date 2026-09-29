// Types & Interfaces
import type { IPlanRepairAnalysisElement } from "@/features/planning/components/tools/planRepairAnalysis.types";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";

export const REPAIR_DAY_MAX: number = 180;

/**
 * Repair material amount needed after given days of building age
 * See: https://pct.fnar.net/building-degradation/index.html
 * @author jplacht
 *
 * @param {number} day Building age in days
 * @param {number} materialAmount Construction material amount
 * @returns {number} Repair material amount
 */
export function calculateAmountAtDay(
	day: number,
	materialAmount: number
): number {
	return (
		materialAmount -
		Math.floor(
			(materialAmount *
				(REPAIR_DAY_MAX - Math.min(REPAIR_DAY_MAX, day))) /
				REPAIR_DAY_MAX
		)
	);
}

/**
 * Building efficiency after given days without repair
 * @author jplacht
 *
 * @param {number} day Building age in days
 * @returns {number} Efficiency, 1 fresh down to 0.33
 */
export function repairEfficiency(day: number): number {
	return 0.33 + 0.67 / (1 + Math.exp((1789 / 25000) * (day - 100.87)));
}

/**
 * Per-day repair curve of a single building from day 0 to 180: efficiency,
 * averaged revenue, averaged repair cost and resulting daily profit when
 * repairing every n days. Only production slows down with wear, workforce
 * cost stays; the repair cost is the building's whole degradation cost.
 * @author jplacht
 *
 * @param {number} productionValue Daily production value at full efficiency
 * @param {number} workforceCost Daily workforce cost, positive
 * @param {IMaterialIOMinimal[]} materials Construction materials
 * @param {Record<string, number>} prices Unit price per material ticker
 * @returns {IPlanRepairAnalysisElement[]} One element per day
 */
export function calculateRepairCurve(
	productionValue: number,
	workforceCost: number,
	materials: IMaterialIOMinimal[],
	prices: Record<string, number>
): IPlanRepairAnalysisElement[] {
	const r: IPlanRepairAnalysisElement[] = [];
	let previous = 0;

	for (let i = 0; i <= REPAIR_DAY_MAX; i++) {
		const efficiency = repairEfficiency(i);
		const revenue = efficiency * productionValue;
		previous += revenue;
		const dailyRevenue_norm = previous / (i + 1);

		const mat = materials.map((m) => ({
			ticker: m.ticker,
			amount: calculateAmountAtDay(i, m.input),
		}));

		const rep = mat.reduce(
			(sum, element) => sum + element.amount * prices[element.ticker],
			0
		);

		const repSum = rep / (i + 1);
		const profit =
			i === 0 ? 0 : dailyRevenue_norm - workforceCost - repSum;

		r.push({
			day: i,
			efficiency,
			dailyRevenue: revenue,
			dailyRevenue_integral: previous,
			dailyRevenue_norm,
			materials: mat,
			repair: repSum,
			dailyRepair: rep,
			profit,
		});
	}

	// day 0 has no repair average, show day 1's profit instead
	r[0].profit = r[1].profit;

	return r;
}

/**
 * Day with the highest profit, first one on ties
 * @author jplacht
 *
 * @param {IPlanRepairAnalysisElement[]} curve Repair curve
 * @returns {{ day: number; profit: number }} Optimal day, -1 without data
 */
export function findOptimalRepairDay(curve: IPlanRepairAnalysisElement[]): {
	day: number;
	profit: number;
} {
	const profit = Math.max(...curve.map((o) => o.profit));
	return { day: curve.findIndex((e) => e.profit === profit), profit };
}

/**
 * Repair cost per material and day, for the cost breakdown chart
 * @author jplacht
 *
 * @param {IPlanRepairAnalysisElement[]} curve Repair curve
 * @param {Record<string, number>} prices Unit price per material ticker
 * @returns {{ name: string; data: number[] }[]} One series per material
 */
export function repairCostSeries(
	curve: IPlanRepairAnalysisElement[],
	prices: Record<string, number>
): { name: string; data: number[] }[] {
	if (!curve.length) return [];

	return curve[0].materials.map((m) => ({
		name: m.ticker,
		data: curve.map((r) => {
			const material = r.materials.find((e) => e.ticker === m.ticker)!;
			return material.amount * prices[material.ticker];
		}),
	}));
}
