// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import type {
	ExchangeMetric,
	IExchangeLines,
} from "@/features/market_exploration/marketExploration.types";

const MS_PER_DAY = 86400000;

/**
 * One value per exchange and day from the exchanges' CXPC rows: daily VWAP
 * (volume / traded), low, high or traded units. Days run continuously from
 * the first to the last row (UTC midnight); a day without trades is null.
 * The volume is the traded units of all exchanges.
 * @author jplacht
 *
 * @param {Record<string, Exploration[]>} data CXPC rows per exchange code
 * @param {ExchangeMetric} metric value per day
 * @param {number | null} rangeDays last n days, null for all
 * @returns {IExchangeLines} days, values per exchange and volume
 */
export function exchangeLines(
	data: Record<string, Exploration[]>,
	metric: ExchangeMetric,
	rangeDays: number | null
): IExchangeLines {
	const byDay = Object.fromEntries(
		Object.entries(data).map(([code, rows]) => [
			code,
			new Map(
				rows
					.filter((r) => r.traded > 0)
					.map((r) => [
						Math.floor(r.date_epoch / MS_PER_DAY) * MS_PER_DAY,
						r,
					])
			),
		])
	);
	const epochs = Object.values(byDay).flatMap((m) => [...m.keys()]);
	if (!epochs.length) return { days: [], values: {}, volume: [] };

	const last = Math.max(...epochs);
	const first =
		rangeDays === null
			? Math.min(...epochs)
			: last - (rangeDays - 1) * MS_PER_DAY;
	const days: number[] = [];
	for (let day = first; day <= last; day += MS_PER_DAY) days.push(day);

	const value = (r: Exploration) =>
		metric === "vwap"
			? r.volume / r.traded
			: metric === "low"
				? r.low_p
				: metric === "high"
					? r.high_p
					: r.traded;

	return {
		days,
		values: Object.fromEntries(
			Object.entries(byDay).map(([code, rows]) => [
				code,
				days.map((d) => {
					const row = rows.get(d);
					return row ? value(row) : null;
				}),
			])
		),
		volume: days.map((d) =>
			Object.values(byDay).reduce(
				(sum, rows) => sum + (rows.get(d)?.traded ?? 0),
				0
			)
		),
	};
}

/**
 * The exchange whose latest value is the lowest, e.g. the cheapest by its
 * last traded VWAP. An exchange without a value on the last day counts with
 * its last earlier one; one without any value is left out.
 * @author jplacht
 *
 * @param {Record<string, (number | null)[]>} values per exchange code, one per day
 * @returns {{ code: string; value: number } | null} cheapest, null without values
 */
export function cheapestExchange(
	values: Record<string, (number | null)[]>
): { code: string; value: number } | null {
	let cheapest: { code: string; value: number } | null = null;
	for (const [code, days] of Object.entries(values)) {
		const value = days.findLast((v) => v != null);
		if (value != null && (!cheapest || value < cheapest.value))
			cheapest = { code, value };
	}
	return cheapest;
}
