// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import type {
	CandleInterval,
	CandleTuple,
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

/**
 * One exchange's CXPC rows as candles [epoch, open, high, low, close,
 * traded units]: days without trades filled with the last close, then
 * grouped by week (from Monday) or month, as Market Exploration's chart
 * @author jplacht
 *
 * @param {Exploration[]} data CXPC rows of one exchange
 * @param {CandleInterval} interval daily, weekly or monthly
 * @returns {CandleTuple[]} Candles, oldest first
 */
export function candles(
	data: Exploration[],
	interval: CandleInterval
): CandleTuple[] {
	if (!data.length) return [];

	const sortedRaw = [...data]
		.map((d) => ({
			...d,
			// Force normalization to midnight UTC
			normalized_epoch:
				Math.floor(d.date_epoch / MS_PER_DAY) * MS_PER_DAY,
		}))
		.sort((a, b) => a.normalized_epoch - b.normalized_epoch);

	// Fill Daily Gaps
	const dailyMap = new Map(sortedRaw.map((d) => [d.normalized_epoch, d]));
	const firstDay = sortedRaw[0].normalized_epoch;
	const lastDay = sortedRaw[sortedRaw.length - 1].normalized_epoch;

	const dailyFilled: CandleTuple[] = [];
	let lastClose = sortedRaw[0].close_p;

	for (let curr = firstDay; curr <= lastDay; curr += MS_PER_DAY) {
		const entry = dailyMap.get(curr);
		if (entry) {
			lastClose = entry.close_p;
			dailyFilled.push([
				curr,
				entry.open_p,
				entry.high_p,
				entry.low_p,
				entry.close_p,
				entry.traded,
			]);
		} else {
			dailyFilled.push([
				curr,
				lastClose,
				lastClose,
				lastClose,
				lastClose,
				0,
			]);
		}
	}

	if (interval === "daily") return dailyFilled;

	// Aggregate Weekly/Monthly
	const periodMap = new Map<number, CandleTuple>();

	for (const [epoch, open, high, low, close, volume] of dailyFilled) {
		const date = new Date(epoch);
		let periodKey: number;

		if (interval === "weekly") {
			// Monday
			const day = date.getUTCDay();
			// If Sunday (0), go back 6 days. Else day-1.
			const offset = day === 0 ? 6 : day - 1;
			date.setUTCDate(date.getUTCDate() - offset);
			periodKey = date.getTime();
		} else {
			// Monthly: 1st of the month
			date.setUTCDate(1);
			periodKey = date.getTime();
		}

		const existing = periodMap.get(periodKey);
		if (!existing) {
			// start of period
			periodMap.set(periodKey, [
				periodKey,
				open,
				high,
				low,
				close,
				volume,
			]);
		} else {
			// Ongoing period -> Metric update
			existing[2] = Math.max(existing[2], high); // Max High
			existing[3] = Math.min(existing[3], low); // Min Low
			existing[4] = close; // Final Close
			existing[5] += volume; // Sum Volume
		}
	}

	return Array.from(periodMap.values());
}
