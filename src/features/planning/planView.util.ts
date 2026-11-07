import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
import { toCsv } from "@/util/download";

export type PlanTool =
	| "visitation-frequency"
	| "repair-analysis"
	| "popr"
	| "supply-cart"
	| "construction-cart"
	| "profit-breakdown"
	| "plan-check";

// the foldable sections of Base
export type BaseSection =
	"empire" | "planet" | "workforce" | "housing" | "experts";

// which materials Material I/O and the Supply Cart show, in this order
export const IO_SOURCES = ["all", "production", "workforce"] as const;
export type IOSource = (typeof IO_SOURCES)[number];

// the filter bar of Material I/O and the Supply Cart: on a touch screen
// each segment is a whole 44 px target
export const FILTER_BAR =
	"flex flex-wrap items-center gap-2 [&_[role=group]>button]:px-2 [&_[role=group]>button]:min-w-6 pointer-coarse:[&_[role=group]>button]:h-11 pointer-coarse:[&_[role=group]>button]:min-w-11";

// the tiles of the results bar, each opens where its figure comes from
export type ResultTile =
	"profit" | "payback" | "area" | "storage" | "workforce";

/**
 * Exported and imported value per day of Material I/O rows
 *
 * @author jplacht
 *
 * @param {IMaterialIO[]} rows Material I/O rows
 * @returns {{ exports: number; imports: number }} Imports as a negative sum
 */
export function materialIOTotals(rows: IMaterialIO[]): {
	exports: number;
	imports: number;
} {
	let exports: number = 0;
	let imports: number = 0;
	for (const r of rows) {
		if (r.delta > 0) exports += r.price;
		else if (r.delta < 0) imports += r.price;
	}
	return { exports, imports };
}

/**
 * Material I/O as CSV, one row per material, values per day
 *
 * @author jplacht
 *
 * @param {IMaterialIO[]} rows Material I/O rows
 * @returns {string} CSV with a header line
 */
export function materialIOCsv(rows: IMaterialIO[]): string {
	return toCsv([
		["ticker", "input", "output", "delta", "value", "weight", "volume"],
		...rows.map((r) => [
			r.ticker,
			r.input,
			r.output,
			r.delta,
			r.price,
			r.totalWeight,
			r.totalVolume,
		]),
	]);
}
