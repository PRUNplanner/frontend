// Types & Interfaces
import type {
	IBaseROIHistory,
	IBaseROIMaterial,
	IBaseROISeries,
} from "@/features/base_roi/baseROI.types";

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
