// Util
import { compactNumber } from "@/ui/charts/charts.util";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	CompareFigure,
	ICompareRow,
	IMaterialChange,
} from "@/features/planning/util/whatIf.types";

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
