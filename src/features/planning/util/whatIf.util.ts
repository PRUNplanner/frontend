// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { scaledPriceBook } from "@/features/cx/priceBook";
import { askBidPriceBook } from "@/features/cx/marketCheck.util";

// Util
import { paybackDays } from "@/features/sharing/sharedPlan.util";
import { compactNumber } from "@/ui/charts/charts.util";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";
import type {
	BreakEven,
	CompareFigure,
	ICompareRow,
	IMaterialChange,
	IPaybackOfDifference,
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

// below this a difference reads 0
const EPSILON = 0.005;

// whether more is better for you; undefined: neutral
const MORE_IS_BETTER: Record<CompareFigure, boolean | undefined> = {
	profit: true,
	output: true,
	cost: false,
	degradation: false,
	planCost: false,
	roi: false,
	profitArea: true,
	area: undefined,
};

function figures(c: IPlanCalculation): Record<CompareFigure, number> {
	const area = c.result.area.areaUsed;
	return {
		profit: c.overview.profit,
		output: c.overview.dailyProfit,
		cost: c.overview.dailyCost,
		degradation: c.overview.dailyDegradationCost,
		planCost: c.overview.totalConstructionCost,
		roi: c.overview.roi,
		profitArea: area ? c.overview.profit / area : 0,
		area,
	};
}

/**
 * Key figures of this plan (a) and another (b): the difference is b − a,
 * better tells whether b is better for you. ROI compares payback days, a
 * payback that never happens is the worst.
 * @author jplacht
 *
 * @param {IPlanCalculation} a This plan
 * @param {IPlanCalculation} b Other plan
 * @returns {ICompareRow[]} One row per key figure
 */
export function compareRows(
	a: IPlanCalculation,
	b: IPlanCalculation
): ICompareRow[] {
	const fa = figures(a);
	const fb = figures(b);
	return (Object.keys(MORE_IS_BETTER) as CompareFigure[]).map((key) => {
		const va = key === "roi" ? paybackDays(fa.roi) : fa[key];
		const vb = key === "roi" ? paybackDays(fb.roi) : fb[key];
		let delta = va === vb ? 0 : vb - va;
		if (Math.abs(delta) < EPSILON) delta = 0;
		const more = MORE_IS_BETTER[key];
		return {
			key,
			a: fa[key],
			b: fb[key],
			delta,
			better:
				delta === 0 || more === undefined
					? undefined
					: delta > 0 === more,
		};
	});
}

/**
 * ȼ/day per material of the other plan minus this one's, sorted by size
 * @author jplacht
 *
 * @param {IPlanCalculation} a This plan
 * @param {IPlanCalculation} b Other plan
 * @returns {IMaterialChange[]} Changed materials
 */
export function materialChanges(
	a: IPlanCalculation,
	b: IPlanCalculation
): IMaterialChange[] {
	const values = new Map<string, IMaterialChange>();
	const get = (ticker: string) => {
		if (!values.has(ticker))
			values.set(ticker, { ticker, a: 0, b: 0, delta: 0 });
		return values.get(ticker)!;
	};
	for (const m of a.result.materialio) get(m.ticker).a += m.price;
	for (const m of b.result.materialio) get(m.ticker).b += m.price;

	return [...values.values()]
		.map((c) => ({ ...c, delta: c.b - c.a }))
		.filter((c) => Math.abs(c.delta) >= EPSILON)
		.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

/**
 * One paragraph on the comparison: profit and payback from this plan's
 * side, then the other plan's top material gain and its two top costs
 * @author jplacht
 *
 * @param {ICompareRow[]} rows Key figures
 * @param {IMaterialChange[]} changes Material changes
 * @param {string} otherName Other plan's name
 * @param t i18n translate
 * @returns {string} Verdict
 */
export function compareVerdict(
	rows: ICompareRow[],
	changes: IMaterialChange[],
	otherName: string,
	t: (key: string, params?: Record<string, string | number>) => string
): string {
	const key = (k: string) => `plan.tools.plan_check.compare.verdict.${k}`;
	if (!changes.length && rows.every((r) => r.delta === 0))
		return t(key("same"));

	const row = (k: CompareFigure) => rows.find((r) => r.key === k)!;
	const parts: string[] = [];

	const profit = row("profit").delta;
	parts.push(
		profit === 0
			? t(key("earns_same"))
			: t(key(profit < 0 ? "earns_more" : "earns_less"), {
					value: formatNumber(Math.abs(profit), 0),
				})
	);

	const roi = row("roi").delta;
	if (roi !== 0 && Number.isFinite(roi))
		parts.push(
			t(key(roi > 0 ? "sooner" : "later"), {
				days: formatNumber(Math.abs(roi), 1),
			})
		);

	const gain = changes.find((c) => c.delta > 0);
	const costs = changes.filter((c) => c.delta < 0).slice(0, 2);
	const cost = compactNumber(-costs.reduce((sum, c) => sum + c.delta, 0));
	const tickers =
		costs.length === 2
			? t(key("and"), { a: costs[0].ticker, b: costs[1].ticker })
			: costs[0]?.ticker;
	const gained = gain && {
		name: otherName,
		gain: compactNumber(gain.delta),
		ticker: gain.ticker,
	};
	if (gained && costs.length)
		parts.push(t(key("trade"), { ...gained, cost, tickers }));
	else if (gained) parts.push(t(key("gain"), gained));
	else if (costs.length)
		parts.push(t(key("cost"), { name: otherName, cost, tickers }));

	return parts.join(" ");
}

/**
 * Price multiplier of one material that moves profit to a target. Profit
 * is linear in one price, so it is 1 + (target − profit) / slope. Null
 * when the price can't do it: no slope, or a price of 0 or less.
 * @author jplacht
 *
 * @param {number} profit Daily profit
 * @param {number} slope Profit change per +100 % price
 * @param {number} target Daily profit wanted
 * @returns {number | null} Price multiplier
 */
export function targetFactor(
	profit: number,
	slope: number,
	target: number
): number | null {
	if (slope === 0) return null;
	const factor = 1 + (target - profit) / slope;
	return factor > 0 ? factor : null;
}

/**
 * Payback of the difference: the other plan's extra build cost divided by
 * its extra daily profit
 * @author jplacht
 *
 * @param {IPlanCalculation} a This plan
 * @param {IPlanCalculation} b Other plan
 * @returns {IPaybackOfDifference} Payback
 */
export function paybackOfDifference(
	a: IPlanCalculation,
	b: IPlanCalculation
): IPaybackOfDifference {
	const cost =
		b.overview.totalConstructionCost - a.overview.totalConstructionCost;
	const profit = b.overview.profit - a.overview.profit;
	let days: IPaybackOfDifference["days"] = null;
	if (cost >= EPSILON) days = profit >= EPSILON ? cost / profit : "never";
	return { cost, profit, days };
}

/**
 * The plan buying at ask and selling at bid on each material's volume
 * exchange (see askBidPriceBook), and the materials that kept their plan
 * price
 * @author jplacht
 *
 * @param {IPlanInput} input Plan input
 * @param {IPlanContext} ctx Plan context
 * @param {(tickerId: string) => Exchange} getExchange Exchange data by id
 * @returns Calculation and kept materials
 */
export function realisticPlan(
	input: IPlanInput,
	ctx: IPlanContext,
	getExchange: (tickerId: string) => Exchange
) {
	const { book, kept } = askBidPriceBook(ctx.prices, getExchange);
	return {
		calculation: calculatePlan(
			{ ...input, recipeOptions: false },
			{ ...ctx, prices: book }
		),
		kept,
	};
}
