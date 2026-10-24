import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

export type PlanTool =
	| "visitation-frequency"
	| "repair-analysis"
	| "popr"
	| "supply-cart"
	| "construction-cart"
	| "profit-breakdown"
	| "plan-check";

// tools wide enough to need Material I/O's room too
const WIDE_TOOLS: PlanTool[] = [
	"repair-analysis",
	"profit-breakdown",
	"plan-check",
];

/**
 * Which side panes fold while a tool replaces the production list
 *
 * @author jplacht
 *
 * @param {PlanTool | null} tool Open tool, null for the production list
 * @returns {{ base: boolean; io: boolean }} Folded panes
 */
export function foldedPanes(tool: PlanTool | null): {
	base: boolean;
	io: boolean;
} {
	return {
		base: tool !== null,
		io: tool !== null && WIDE_TOOLS.includes(tool),
	};
}

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
	const lines: string[] = [
		"ticker,input,output,delta,value,weight,volume",
		...rows.map((r) =>
			[
				r.ticker,
				r.input,
				r.output,
				r.delta,
				r.price,
				r.totalWeight,
				r.totalVolume,
			].join(",")
		),
	];
	return lines.join("\n");
}
