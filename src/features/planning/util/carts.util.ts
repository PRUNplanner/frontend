// Types & Interfaces
import type { IBuildingConstruction } from "@/features/planning/usePlanCalculation.types";

/**
 * What a supply covering `days` ships of a material used per day: the
 * daily amount times the days, rounded up (Supply Cart)
 * @author jplacht
 *
 * @param {number} perDay Daily amount (sign ignored)
 * @param {number} days Days to cover
 * @returns {number} Units
 */
export const supplyAmount = (perDay: number, days: number): number =>
	Math.ceil(Math.abs(perDay) * days);

/**
 * A building's planned amount in the Construction cart: the core module
 * once, else the production building's or infrastructure's amount
 * @author jplacht
 *
 * @returns {number | undefined} Amount, undefined for an unplanned ticker
 */
export function plannedAmount(
	ticker: string,
	production: { name: string; amount: number }[],
	infrastructure: Record<string, number>
): number | undefined {
	return ticker === "CM"
		? 1
		: (production.find((p) => p.name === ticker)?.amount ??
				infrastructure[ticker]);
}

/**
 * The construction materials for building amounts, summed per material;
 * every material of the plan's buildings is listed (alphabetically), 0
 * when none is built
 * @author jplacht
 *
 * @param {IBuildingConstruction[]} construction Materials per building
 * @param {Record<string, number>} amounts Buildings to build per ticker
 * @returns {Record<string, number>} Units per material
 */
export function constructionTotals(
	construction: IBuildingConstruction[],
	amounts: Record<string, number>
): Record<string, number> {
	const totals: Record<string, number> = {};
	// alphabetical, as the cart lists them
	const tickers = [
		...new Set(
			construction.flatMap((b) => b.materials.map((m) => m.ticker))
		),
	].sort();
	for (const t of tickers) totals[t] = 0;
	for (const b of construction)
		for (const m of b.materials)
			totals[m.ticker] += m.input * (amounts[b.ticker] ?? 0);
	return totals;
}
