import { z } from "zod";

// Util
import {
	getExchanges,
	getPlannedMaterials,
	PLANNED_NOTE,
	getSparks,
	historySummary,
} from "@/mcp/gameData";
import { amount, defineTool, money } from "@/mcp/tools/shared";

const EXCHANGES = ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"] as const;
const HOUR = 3_600_000;

export const getMaterialPrices = defineTool({
	name: "get_material_prices",
	title: "Material prices",
	description:
		"Market data per material and exchange (AI1, CI1, IC1, NC1, and UNIVERSE: the volume-weighted mix, without an order book, so its ask, bid, supply and demand are null): ask, bid, VWAP 7D/30D, supply and demand (units in all sell and buy orders), traded volume 7D/30D, the data's date and age. history_30d sums up the last 30 days' daily VWAPs: min, median, max, last (last_days_ago, 0 = today, maybe partial), trend of the last 7 trading days against the first 7 (null without trades; see history_note); ask_vs_30d_pct and bid_vs_30d_pct place today's quotes in that range (0 = the low, 100 = the high). history: false skips it; get_price_history goes further back. planned_by_players: what PRUNplanner players' empires plan to make and use per day, against the traded volume.",
	inputSchema: z.object({
		tickers: z.array(z.string()).min(1).max(50),
		exchanges: z.array(z.enum(EXCHANGES)).optional(),
		history: z
			.boolean()
			.optional()
			.describe("30-day history (default true)"),
	}),
	async run({ tickers, exchanges, history }, { backend }) {
		const list = await getExchanges(backend);
		const codesWanted = [...new Set<string>(exchanges ?? EXCHANGES)];
		const sparks = new Map(
			history === false
				? []
				: await Promise.all(
						codesWanted.map(
							async (c) =>
								[
									c,
									await getSparks(backend, c).catch(
										() => undefined
									),
								] as const
						)
					)
		);
		// where a price sits in the 30-day daily VWAP range, in %
		const place = (price: number, h: ReturnType<typeof historySummary>) =>
			h && h.max > h.min && price > 0
				? money(((price - h.min) / (h.max - h.min)) * 100)
				: null;
		const wanted = new Set(tickers.map((t) => t.toUpperCase()));
		const codes = new Set<string>(exchanges ?? EXCHANGES);
		const now = Date.now();
		const rows = list
			.filter((e) => wanted.has(e.ticker) && codes.has(e.exchange_code))
			.map((e) => {
				const h =
					history === false
						? null
						: historySummary(
								sparks.get(e.exchange_code)?.series[e.ticker]
							);
				return {
					ticker: e.ticker,
					exchange: e.exchange_code,
					ask: e.exchange_code === "UNIVERSE" ? null : money(e.ask),
					bid: e.exchange_code === "UNIVERSE" ? null : money(e.bid),
					vwap_7d: money(e.vwap_7d),
					vwap_30d: money(e.vwap_30d),
					supply_units_in_sell_orders:
						e.exchange_code === "UNIVERSE" ? null : e.supply,
					demand_units_in_buy_orders:
						e.exchange_code === "UNIVERSE" ? null : e.demand,
					traded_7d: amount(e.sum_traded_7d),
					traded_30d: amount(e.sum_traded_30d),
					avg_traded_per_day_30d: amount(e.sum_traded_30d / 30),
					status: e.exchange_status,
					data_date: e.calendar_date.toISOString(),
					data_age_hours: money(
						(now - e.calendar_date.getTime()) / HOUR
					),
					history_30d: history === false ? undefined : h,
					ask_vs_30d_pct:
						e.exchange_code === "UNIVERSE" || history === false
							? undefined
							: place(e.ask, h),
					bid_vs_30d_pct:
						e.exchange_code === "UNIVERSE" || history === false
							? undefined
							: place(e.bid, h),
				};
			});
		const missing = [...wanted].filter(
			(t) => !rows.some((r) => r.ticker === t)
		);
		// how much PRUNplanner players already plan, against what trades
		const planned = await getPlannedMaterials(backend).catch(
			() => undefined
		);
		const plannedByPlayers = planned
			? Object.fromEntries(
					[...wanted].map((t) => {
						const p = planned.get(t);
						const universe = list.find(
							(e) =>
								e.ticker === t && e.exchange_code === "UNIVERSE"
						);
						const daily = universe ? universe.sum_traded_7d / 7 : 0;
						return [
							t,
							{
								production_per_day: amount(p?.production ?? 0),
								consumption_per_day: amount(
									p?.consumption ?? 0
								),
								net_per_day: amount(p?.net ?? 0),
								production_vs_traded_pct:
									daily > 0
										? money(
												((p?.production ?? 0) / daily) *
													100
											)
										: null,
							},
						];
					})
				)
			: undefined;
		return {
			text: `${rows.length} price rows${missing.length ? `; no data for ${missing.join(", ")}` : ""}.`,
			data: {
				prices: rows,
				missing,
				planned_by_players: plannedByPlayers,
				planned_note: plannedByPlayers
					? `${PLANNED_NOTE} production_vs_traded_pct compares it with the Universe's average daily traded units over 7 days.`
					: undefined,
				history_note:
					history === false
						? undefined
						: codesWanted.filter((c) => !sparks.get(c)).length
							? `History couldn't be loaded for ${codesWanted.filter((c) => !sparks.get(c)).join(", ")}.`
							: undefined,
			},
		};
	},
});
