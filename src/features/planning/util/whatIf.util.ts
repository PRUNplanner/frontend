// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { scaledPriceBook } from "@/features/cx/priceBook";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
import type {
	BreakEven,
	IPriceSensitivity,
	ISensitivityRow,
} from "@/features/planning/util/whatIf.types";

// beyond this price rise the break-even reads "> +500 %"
const BREAK_EVEN_MAX = 500;

/**
 * The plan calculated with one material's price multiplied
 * @author jplacht
 *
 * @param {IPlanInput} input Plan input
 * @param {IPlanContext} ctx Plan context
 * @param {string} ticker Material
 * @param {number} factor Price multiplier
 * @returns {IPlanCalculation} Calculation
 */
export function calculateScaled(
	input: IPlanInput,
	ctx: IPlanContext,
	ticker: string,
	factor: number
): IPlanCalculation {
	return calculatePlan(
		{ ...input, recipeOptions: false },
		{ ...ctx, prices: scaledPriceBook(ctx.prices, ticker, factor) }
	);
}

/**
 * Price change in % at which the plan's profit is 0. Profit is linear in
 * one price, so it is −profit / slope. "never" when the price would have
 * to fall below 0, "over" beyond +500 %.
 * @author jplacht
 *
 * @param {number} profit Daily profit
 * @param {number} slope Profit change per +100 % price
 * @returns {BreakEven} Break-even in %
 */
export function breakEven(profit: number, slope: number): BreakEven {
	if (slope === 0) return "never";
	const pct = (-profit / slope) * 100;
	if (pct < -100) return "never";
	if (pct > BREAK_EVEN_MAX) return "over";
	return pct;
}

/**
 * One row per material that moves profit, sorted by impact
 * @author jplacht
 *
 * @param {IMaterialIO[]} materialIO Priced material i/o
 * @param {Map<string, number>} slopes Profit change per +100 % price
 * @param {number} profit Daily profit
 * @returns {ISensitivityRow[]} Rows
 */
export function sensitivityRows(
	materialIO: IMaterialIO[],
	slopes: Map<string, number>,
	profit: number
): ISensitivityRow[] {
	const rows: ISensitivityRow[] = [];
	for (const m of materialIO) {
		const slope = slopes.get(m.ticker) ?? 0;
		if (m.delta === 0 || slope === 0) continue;
		rows.push({
			ticker: m.ticker,
			side: m.delta > 0 ? "sell" : "buy",
			slope,
			breakEven: breakEven(profit, slope),
		});
	}
	return rows.sort((a, b) => Math.abs(b.slope) - Math.abs(a.slope));
}

/**
 * Price sensitivity of a plan: one recalculation per material with its
 * price doubled gives how much profit moves per +100 % (profit is linear
 * in one price, through material i/o and degradation alike).
 * @author jplacht
 *
 * @param {IPlanInput} input Plan input
 * @param {IPlanContext} ctx Plan context
 * @returns {IPriceSensitivity} Base result and rows
 */
export function priceSensitivity(
	input: IPlanInput,
	ctx: IPlanContext
): IPriceSensitivity {
	const { result, overview } = calculatePlan(
		{ ...input, recipeOptions: false },
		ctx
	);

	const slopes = new Map<string, number>();
	for (const m of result.materialio)
		slopes.set(
			m.ticker,
			calculateScaled(input, ctx, m.ticker, 2).result.profit -
				result.profit
		);

	return {
		result,
		overview,
		rows: sensitivityRows(result.materialio, slopes, result.profit),
	};
}
