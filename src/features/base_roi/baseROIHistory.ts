// Types & Interfaces
import type {
	IBaseROIHistory,
	IBaseROIMaterial,
	IBaseROIOutput,
	IBaseROISeries,
} from "@/features/base_roi/baseROI.types";
import type { ILineSeries } from "@/ui/charts/charts.types";

/**
 * One material's price per day: its exchange's daily VWAP, the last known
 * price on days without trades, today's price before its first trade in
 * the window and on every day when it has no price in the window. Fixed
 * ticker values and ASK/BID prices have no history: today's price.
 */
function dailyPrices(
	m: IBaseROIMaterial,
	series: IBaseROISeries,
	days: number
): number[] {
	const vwap = m.source.key === "vwap_7d" || m.source.key === "vwap_30d";
	const points =
		vwap && m.source.exchange
			? series[m.source.exchange]?.[m.ticker]?.slice(-days)
			: undefined;
	if (!points?.some((p) => p !== null)) return Array(days).fill(m.price);

	// the window may be shorter than days: pad the oldest days
	const padded: (number | null)[] = [
		...Array(days - points.length).fill(null),
		...points,
	];
	let last: number | null = null;
	return padded.map((p) => (last = p ?? last) ?? m.price);
}

/**
 * Revenue, running cost and daily profit of a fixed layout for each of the
 * last days: profit is linear in prices, so Σ sold × price − Σ bought ×
 * price − degradation, with degradation at today's value. No new engine
 * pass.
 *
 * @param {IBaseROIMaterial[]} materials Bought (< 0) and sold (> 0) per day
 * @param {number} degradation Degradation per day
 * @param {IBaseROISeries} series Daily VWAP per exchange
 * @param {number} [days] Days, oldest first
 * @returns {IBaseROIHistory} Per day, today last
 */
export function profitHistory(
	materials: IBaseROIMaterial[],
	degradation: number,
	series: IBaseROISeries,
	days: number = 30
): IBaseROIHistory {
	const revenue: number[] = Array(days).fill(0);
	const cost: number[] = Array(days).fill(degradation);
	for (const m of materials) {
		const prices = dailyPrices(m, series, days);
		const into = m.amount > 0 ? revenue : cost;
		for (let d = 0; d < days; d++)
			into[d] += Math.abs(m.amount) * prices[d];
	}
	return { revenue, cost, profit: revenue.map((r, d) => r - cost[d]) };
}

/** whether any material is priced from a VWAP with history in the series */
export function hasHistory(
	materials: IBaseROIMaterial[],
	series: IBaseROISeries
): boolean {
	return materials.some(
		(m) =>
			(m.source.key === "vwap_7d" || m.source.key === "vwap_30d") &&
			m.source.exchange !== null &&
			series[m.source.exchange]?.[m.ticker]?.some((p) => p !== null)
	);
}

/**
 * The last `range` days in points of `bucket` days, like the game's
 * chart aggregation: buckets end today, so the newest point is current
 * and the oldest may hold fewer days. A point is the mean of its days'
 * values, null when none has one; its x is the bucket's first day.
 *
 * @param {number[]} days UTC midnights, oldest first
 * @param {ILineSeries[]} series Lines, one value per day
 * @param {number} range Days shown
 * @param {number} bucket Days per point
 * @returns {{ days: number[]; series: ILineSeries[] }} Aggregated
 */
export function aggregateDays(
	days: number[],
	series: ILineSeries[],
	range: number,
	bucket: number
): { days: number[]; series: ILineSeries[] } {
	const start = Math.max(0, days.length - range);
	const out = {
		days: [] as number[],
		values: series.map(() => [] as (number | null)[]),
	};
	for (let end = days.length; end > start; end -= bucket) {
		const from = Math.max(start, end - bucket);
		out.days.unshift(days[from]);
		series.forEach((line, i) => {
			const known = line.values
				.slice(from, end)
				.filter((v): v is number => v !== null);
			out.values[i].unshift(
				known.length
					? known.reduce((s, v) => s + v, 0) / known.length
					: null
			);
		});
	}
	return {
		days: out.days,
		series: series.map((line, i) => ({ ...line, values: out.values[i] })),
	};
}

/**
 * UTC midnights of the last days, today last: the x axis of the history
 * charts
 *
 * @param {number} [days] Days
 * @returns {number[]} Epochs in ms, oldest first
 */
export function historyDays(days: number = 30): number[] {
	const today = new Date();
	const midnight = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate()
	);
	return Array.from(
		{ length: days },
		(_, i) => midnight - (days - 1 - i) * 86_400_000
	);
}

/**
 * Daily traded volume of every day, 0 on days without trades: one
 * ticker's CXPC rows on the chart's days
 *
 * @param {{ date_epoch: number; traded: number }[]} cxpc CXPC rows, any order
 * @param {number[]} days UTC midnights, oldest first
 * @returns {number[]} Traded per day
 */
export function tradedPerDay(
	cxpc: { date_epoch: number; traded: number }[],
	days: number[]
): number[] {
	const byDay = new Map<number, number>();
	for (const c of cxpc) {
		const day = Math.floor(c.date_epoch / 86_400_000) * 86_400_000;
		byDay.set(day, (byDay.get(day) ?? 0) + c.traded);
	}
	return days.map((d) => byDay.get(d) ?? 0);
}

/**
 * The market volume a base trades in, per day and in bases: on each side
 * the lowest traded ÷ amount per day of its materials, the bottleneck
 * (the market capacity column, day by day). Inputs null when the recipe
 * consumes nothing.
 *
 * @param {IBaseROIOutput[]} outputs Outputs with their volume exchange
 * @param {IBaseROIOutput[]} inputs Recipe inputs with their volume exchange
 * @param {Map<string, number[]>} traded Traded per day by "TICKER.EXCHANGE"
 * @param {number} days Days
 * @returns {{ outputs: number[]; inputs: number[] | null }} Bases per day
 */
export function capacityHistory(
	outputs: IBaseROIOutput[],
	inputs: IBaseROIOutput[],
	traded: Map<string, number[]>,
	days: number
): { outputs: number[]; inputs: number[] | null } {
	const side = (list: IBaseROIOutput[]) =>
		Array.from({ length: days }, (_, d) =>
			Math.min(
				...list
					.filter((m) => m.amount > 0)
					.map(
						(m) =>
							(traded.get(`${m.ticker}.${m.exchange}`)?.[d] ??
								0) / m.amount
					)
			)
		);
	return {
		outputs: side(outputs),
		inputs: inputs.some((m) => m.amount > 0) ? side(inputs) : null,
	};
}
