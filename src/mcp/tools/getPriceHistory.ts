import { z } from "zod";

// Util
import { getHistory, getMaterials } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { amount, defineTool, money } from "@/mcp/tools/shared";
import {
	candles,
	exchangeLines,
} from "@/features/market_exploration/marketExploration.util";

// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import type { CandleInterval } from "@/features/market_exploration/marketExploration.types";

const EXCHANGES = ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"] as const;
const DAY = 86_400_000;
const day = (epoch: number): string =>
	new Date(epoch).toISOString().slice(0, 10);
const pct = (v: number | null): number | null =>
	v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;

/** bars per exchange stay readable: daily up to 60 days, weekly up to 420 */
const autoInterval = (days: number): CandleInterval =>
	days <= 60 ? "daily" : days <= 420 ? "weekly" : "monthly";

/** the daily VWAP (Market Exploration's line) N days before the last one */
function changeOver(vwap: (number | null)[], days: number): number | null {
	const last = vwap.findLastIndex((v) => v != null);
	if (last < 0 || last - days < 0) return null;
	const then = vwap.slice(0, last - days + 1).findLast((v) => v != null);
	return then ? (vwap[last]! / then - 1) * 100 : null;
}

/** one exchange's history summed up over the range, and its bars */
function exchangeHistory(
	rows: Exploration[],
	days: number | "all",
	interval: CandleInterval,
	withBars: boolean
) {
	const traded = rows.filter((r) => r.traded > 0);
	if (!traded.length) return { traded_days: 0, note: "No trades recorded." };
	const { values } = exchangeLines({ x: rows }, "vwap", null);
	const vwap = values.x ?? [];
	const lastEpoch = Math.max(...traded.map((r) => r.date_epoch));
	const from = days === "all" ? -Infinity : lastEpoch - (days - 1) * DAY;
	const inRange = traded.filter((r) => r.date_epoch >= from);
	const rangeVwap =
		days === "all" ? vwap : vwap.slice(Math.max(0, vwap.length - days));

	const extreme = (list: Exploration[], key: "high_p" | "low_p") => {
		const pick = list.reduce((a, b) =>
			key === "high_p"
				? b.high_p > a.high_p
					? b
					: a
				: b.low_p < a.low_p
					? b
					: a
		);
		return { price: pick[key], date: day(pick.date_epoch) };
	};
	// spread of the day-to-day VWAP moves, in %
	const moves = rangeVwap
		.map((v, i) => {
			const prev = rangeVwap.slice(0, i).findLast((p) => p != null);
			return v != null && prev ? Math.log(v / prev) : null;
		})
		.filter((m): m is number => m != null);
	const mean = moves.reduce((s, m) => s + m, 0) / (moves.length || 1);
	const volatility =
		moves.length > 1
			? Math.sqrt(
					moves.reduce((s, m) => s + (m - mean) ** 2, 0) /
						(moves.length - 1)
				) * 100
			: null;
	const last = traded.reduce((a, b) => (b.date_epoch > a.date_epoch ? b : a));
	const units = inRange.reduce((s, r) => s + r.traded, 0);
	const turnover = inRange.reduce((s, r) => s + r.volume, 0);

	return {
		first_day: day(Math.min(...traded.map((r) => r.date_epoch))),
		last_day: day(last.date_epoch),
		last_vwap: money(last.volume / last.traded),
		last_close: last.close_p,
		change_pct: {
			d7: pct(changeOver(vwap, 7)),
			d30: pct(changeOver(vwap, 30)),
			d90: pct(changeOver(vwap, 90)),
			d365: pct(changeOver(vwap, 365)),
		},
		range: {
			days: days === "all" ? "all" : days,
			traded_days: inRange.length,
			high: inRange.length ? extreme(inRange, "high_p") : null,
			low: inRange.length ? extreme(inRange, "low_p") : null,
			vwap: units ? money(turnover / units) : null,
			units: amount(units),
			turnover: money(turnover),
			avg_units_per_traded_day: inRange.length
				? amount(units / inRange.length)
				: null,
			daily_volatility_pct: pct(volatility),
		},
		all_time: {
			high: extreme(traded, "high_p"),
			low: extreme(traded, "low_p"),
		},
		...(withBars && {
			interval,
			bars: candles(
				rows.filter((r) => r.date_epoch >= from),
				interval
			).map(([epoch, open, high, low, close, units]) => ({
				start: day(epoch),
				open,
				high,
				low,
				close,
				units: amount(units),
			})),
		}),
	};
}

export const getPriceHistory = defineTool({
	name: "get_price_history",
	title: "Price history of a material",
	description:
		"A material's daily market history on the exchanges since PRUNplanner records it (mid-2023), as Market Exploration shows it, summed up for an assistant: per exchange the last daily VWAP and close, the VWAP change over 7, 30, 90 and 365 days, the range's high and low with their days, VWAP, units, turnover, average units per trading day and day-to-day volatility, the all-time high and low, and price bars (open, high, low, close, units; days without trades carry the last close). days sets the range (default 90, or \"all\"); interval the bars (default: daily up to 60 days, weekly up to 420, else monthly); bars: false for the summary only. History describes the past; it is no forecast. For today's quotes and order depth use get_material_prices.",
	inputSchema: z.object({
		ticker: z.string().describe("Material ticker, e.g. RAT"),
		exchanges: z
			.array(z.enum(EXCHANGES))
			.min(1)
			.optional()
			.describe("Default: the four exchanges and UNIVERSE"),
		days: z
			.union([z.number().int().min(7).max(5000), z.literal("all")])
			.optional(),
		interval: z.enum(["daily", "weekly", "monthly"]).optional(),
		bars: z.boolean().optional().describe("Price bars (default true)"),
	}),
	async run(
		{ ticker, exchanges, days = 90, interval, bars },
		{ backend, appUrl }
	) {
		const code = ticker.toUpperCase();
		const materials = await getMaterials(backend);
		if (!materials.some((m) => m.ticker === code))
			throw new ToolError(`Unknown material ${ticker}.`);
		const wanted = [...new Set(exchanges ?? EXCHANGES)];
		const histories = await Promise.all(
			wanted.map(
				async (ex) => [ex, await getHistory(backend, code, ex)] as const
			)
		);
		const span =
			days === "all"
				? Math.max(
						1,
						...histories.flatMap(([, rows]) =>
							rows.length
								? [
										(Math.max(
											...rows.map((r) => r.date_epoch)
										) -
											Math.min(
												...rows.map((r) => r.date_epoch)
											)) /
											DAY,
									]
								: []
						)
					)
				: days;
		const chosen = interval ?? autoInterval(span);
		const data = {
			ticker: code,
			exchanges: Object.fromEntries(
				histories.map(([ex, rows]) => [
					ex,
					exchangeHistory(rows, days, chosen, bars !== false),
				])
			),
			url: `${appUrl}/market-exploration`,
		};
		const lines = histories
			.map(([ex]) => {
				const h = data.exchanges[ex] as {
					last_vwap?: number;
					change_pct?: { d30: number | null };
				};
				return h.last_vwap == null
					? `${ex} no trades`
					: `${ex} ${h.last_vwap} (${h.change_pct?.d30 ?? "–"} % in 30 days)`;
			})
			.join(", ");
		return {
			text: `${code} price history (${days === "all" ? "all days" : `${days} days`}, ${chosen} bars): ${lines}.`,
			data,
		};
	},
});
