// Types & Interfaces
import type {
	EmpireButterflyMetric,
	IEmpireButterflyRow,
	IEmpireCostOverview,
	IEmpireMaterialIO,
	IEmpirePlanListData,
	IEmpireRevenueSplitRows,
	IEmpireSplitParts,
	IEmpireSplitShares,
} from "@/features/empire/empire.types";

const PARTS = [
	"revenue",
	"inputs",
	"workforce",
	"degradation",
	"profit",
] as const;

/**
 * Sums the revenue split of several plans
 * @author jplacht
 *
 * @param {IEmpireSplitParts[]} plans plans
 * @returns {IEmpireSplitParts} sums, ¢ per day
 */
export function sumSplitParts(plans: IEmpireSplitParts[]): IEmpireSplitParts {
	const sum = Object.fromEntries(PARTS.map((k) => [k, 0])) as Record<
		(typeof PARTS)[number],
		number
	>;
	for (const p of plans) for (const k of PARTS) sum[k] += p[k];
	return sum;
}

/**
 * The parts as % of revenue, or, for a loss, as % of cost with the share
 * revenue does not cover. Either way they add up to 100.
 * @author jplacht
 *
 * @param {IEmpireSplitParts} parts ¢ per day
 * @returns {IEmpireSplitShares} shares in %
 */
export function splitShares(parts: IEmpireSplitParts): IEmpireSplitShares {
	const cost = parts.inputs + parts.workforce + parts.degradation;
	const loss = parts.profit < 0;
	const base = loss ? cost : parts.revenue;
	const pct = (v: number) => (base > 0 ? (v / base) * 100 : 0);
	return {
		inputs: pct(parts.inputs),
		workforce: pct(parts.workforce),
		degradation: pct(parts.degradation),
		profit: loss ? 0 : pct(parts.profit),
		uncovered: loss ? pct(cost - parts.revenue) : 0,
		margin: parts.revenue ? (parts.profit / parts.revenue) * 100 : NaN,
	};
}

/**
 * Rows of the revenue split: the most profitable plans, then every
 * loss-making plan (never folded away), the other plans summed.
 * @author jplacht
 *
 * @param {IEmpirePlanListData[]} plans empire plans
 * @param {number} [top=10] profitable plans shown before "Other"
 * @returns {IEmpireRevenueSplitRows} rows, each group by profit, highest first
 */
export function revenueSplitRows(
	plans: IEmpirePlanListData[],
	top: number = 10
): IEmpireRevenueSplitRows {
	const byProfit = [...plans].sort((a, b) => b.profit - a.profit);
	const gains = byProfit.filter((p) => p.profit >= 0);
	const rest = gains.slice(top);
	return {
		top: gains.slice(0, top),
		losses: byProfit.filter((p) => p.profit < 0),
		rest,
		other: rest.length ? sumSplitParts(rest) : undefined,
	};
}

/**
 * The empire's split, on the KPIs' own numbers (materials traded between
 * plans netted out). Degradation is the plans' sum, the rest of the cost is
 * materials, split into inputs and workforce as the plans split theirs.
 * @author jplacht
 *
 * @param {IEmpireCostOverview} overview empire KPIs
 * @param {IEmpirePlanListData[]} plans empire plans
 * @returns {IEmpireSplitParts} ¢ per day
 */
export function empireSplitParts(
	overview: IEmpireCostOverview,
	plans: IEmpirePlanListData[]
): IEmpireSplitParts {
	const sum = sumSplitParts(plans);
	const materials = Math.max(overview.totalCost - sum.degradation, 0);
	const planMaterials = sum.inputs + sum.workforce;
	const workforce = planMaterials
		? (materials * sum.workforce) / planMaterials
		: 0;
	return {
		revenue: overview.totalRevenue,
		inputs: materials - workforce,
		workforce,
		degradation: overview.totalCost - materials,
		profit: overview.totalProfit,
	};
}

/**
 * The materials moving the most ¢ per day, bought left (negative) and sold
 * right (positive), in ¢ or units per day.
 * @author jplacht
 *
 * @param {IEmpireMaterialIO[]} io empire material i/o
 * @param {EmpireButterflyMetric} metric ¢ or units per day
 * @param {number} [top=10] materials shown
 * @returns {IEmpireButterflyRow[]} by |¢ per day|, highest first
 */
export function materialButterfly(
	io: IEmpireMaterialIO[],
	metric: EmpireButterflyMetric,
	top: number = 10
): IEmpireButterflyRow[] {
	return io
		.filter((m) => m.deltaPrice !== 0)
		.sort((a, b) => Math.abs(b.deltaPrice) - Math.abs(a.deltaPrice))
		.slice(0, top)
		.map((m) => ({
			ticker: m.ticker,
			value: metric === "price" ? m.deltaPrice : m.delta,
		}));
}
