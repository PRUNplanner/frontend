import { z } from "zod";

// Util
import { getExchanges, getMarketSummary } from "@/mcp/gameData";
import { amount, defineTool, money } from "@/mcp/tools/shared";
import {
	exchangeCards,
	exchangeGaps,
	GAP_MIN_PCT,
	indexChanges,
	marketBrief,
	marketKpis,
	marketMovers,
	MOVER_MIN_TURNOVER,
	MOVER_MIN_UNITS,
	sectorCards,
} from "@/features/market_report/marketReport.util";

// Types & Interfaces
import type { MarketMaterial } from "@/features/api/schemas/marketSummary.schemas";

const pct = (v: number | null | undefined): number | null =>
	v == null ? null : Math.round(v * 100) / 100;
const day = (epoch: number): string =>
	new Date(epoch).toISOString().slice(0, 10);

const mover = (m: MarketMaterial) => ({
	ticker: m.ticker,
	name: m.name,
	category: m.category,
	change_pct: pct(m.change_pct),
	vwap_7d: m.vwap_7d,
	vwap_30d: m.vwap_30d,
	turnover_7d: money(m.turnover_7d),
	units_7d: amount(m.units_7d),
});

export const getMarketReport = defineTool({
	name: "get_market_report",
	title: "Market report",
	description:
		"The whole market at a glance, as PRUNplanner's public market report: turnover over the last 7 days and against the 7 before, the market index (100 on its base day) overall, per exchange and per sector with its change over 7, 30 and 90 days, each exchange's turnover and share, the leading sector, what 100 pioneers cost a day, the week's biggest movers up and down (VWAP 7D against VWAP 30D, only materials with real volume, market-maker materials left out) and the biggest price gaps between exchanges (VWAP 7D). All money in the game's currency with the four currencies at par. For one material's prices use get_material_prices.",
	inputSchema: z.object({
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.optional()
			.describe("Movers per direction and gaps to return (default 10)"),
		category: z
			.string()
			.optional()
			.describe(
				'Only movers and gaps of this material category (e.g. "agricultural products")'
			),
	}),
	async run({ limit = 10, category }, { backend, appUrl }) {
		const [summary, books] = await Promise.all([
			getMarketSummary(backend),
			getExchanges(backend),
		]);
		const inCategory = (c: string) =>
			!category || c.toLowerCase() === category.toLowerCase();
		const materials = summary.materials.filter((m) =>
			inCategory(m.category)
		);
		const kpis = marketKpis(summary);
		const brief = marketBrief(summary);
		const index = indexChanges(summary.index.combined);
		const rising = marketMovers(materials, "rising");
		const falling = marketMovers(materials, "falling");
		const gaps = exchangeGaps(books, summary, "vwap").filter((g) =>
			inCategory(g.category)
		);

		const data = {
			as_of: day(summary.as_of),
			days: summary.days,
			kpis: {
				turnover_7d: money(kpis.turnover7d),
				turnover_7d_change_pct: pct(kpis.turnover7dChange),
				materials_traded_7d: kpis.traded7d,
				materials_traded_30d: kpis.traded30d,
				market_maker_share_pct: pct(kpis.flatShare),
			},
			index: {
				base_day: day(summary.index.base),
				value: pct(kpis.index),
				change_pct: {
					d7: pct(index.d7),
					d30: pct(index.d30),
					d90: pct(index.d90),
				},
				per_exchange: Object.fromEntries(
					Object.entries(summary.index.per_exchange).map(([k, v]) => [
						k,
						{
							value: pct(v.findLast((x) => x != null)),
							...Object.fromEntries(
								Object.entries(indexChanges(v)).map(
									([p, c]) => [`change_${p}_pct`, pct(c)]
								)
							),
						},
					])
				),
			},
			sectors: sectorCards(summary).map((s) => ({
				sector: s.key,
				change_pct: pct(s.change),
				change_30d_pct: pct(s.change30),
				turnover_share_pct: pct(s.share),
			})),
			exchanges: exchangeCards(summary).map((c) => ({
				exchange: c.code,
				turnover_7d: money(c.turnover7d),
				turnover_30d: money(c.turnover30d),
				turnover_share_pct: pct(c.share),
				materials_traded_7d: c.traded7d,
			})),
			pioneer_cost_per_100_per_day: {
				now:
					brief.pioneerCost == null ? null : money(brief.pioneerCost),
				change_pct: pct(brief.pioneerChange),
				since: day(brief.pioneerStart),
			},
			movers: {
				rule: `VWAP 7D against VWAP 30D; at least ${MOVER_MIN_TURNOVER.toLocaleString("en-US")} turnover and ${MOVER_MIN_UNITS} units in 7 days`,
				rising: rising.slice(0, limit).map(mover),
				falling: falling.slice(0, limit).map(mover),
			},
			gaps: {
				rule: `VWAP 7D on two exchanges at least ${GAP_MIN_PCT} % apart, each with real volume`,
				rows: gaps.slice(0, limit).map((g) => ({
					ticker: g.ticker,
					name: g.name,
					low: { exchange: g.low, price: g.lowPrice },
					high: { exchange: g.high, price: g.highPrice },
					gap_pct: pct(g.gap),
				})),
			},
			url: `${appUrl}/market`,
		};
		const up = rising[0];
		const down = falling[0];
		return {
			text: `Market on ${data.as_of}: turnover ${data.kpis.turnover_7d} in 7 days (${data.kpis.turnover_7d_change_pct ?? "–"} % against the week before), index ${data.index.value} (${data.index.change_pct.d30 ?? "–"} % in 30 days)${up ? `; top riser ${up.ticker} ${pct(up.change_pct)} %` : ""}${down ? `, top faller ${down.ticker} ${pct(down.change_pct)} %` : ""}.`,
			data,
		};
	},
});
