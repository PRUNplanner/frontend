import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/engine/workforce.constants";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type {
	MarketMaterial,
	MarketSummary,
} from "@/features/api/schemas/marketSummary.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type {
	IMarketBookStats,
	IMarketBrief,
	IMarketIndexChanges,
	IMarketLead,
	IMarketSectorCard,
	IMarketExchangeCard,
	IMarketKpis,
	IPriceSeries,
	ITreemapNode,
	ITreemapRect,
	IWorkforceDriver,
	MarketExchangeCode,
	MarketMoversDirection,
} from "@/features/market_report/marketReport.types";

export const MARKET_EXCHANGES: MarketExchangeCode[] = [
	"AI1",
	"CI1",
	"IC1",
	"NC1",
];

/** movers need real volume: ȼ and units over the last 7 days */
export const MOVER_MIN_TURNOVER = 5_000_000;
export const MOVER_MIN_UNITS = 50;
/** the treemap's colour scale ends at ± this change, in % */
export const CHANGE_SCALE_PCT = 12;

const sum = (values: (number | null)[]): number =>
	values.reduce<number>((total, v) => total + (v ?? 0), 0);

/**
 * Change from the first to the last value of a series, in %
 *
 * @param {(number | null)[]} values Series, oldest first
 * @returns {number | null} Change, null without two values
 */
export function seriesChange(values: (number | null)[]): number | null {
	const first = values.find((v) => v != null);
	const last = values.findLast((v) => v != null);
	if (first == null || last == null || !first) return null;
	return (last / first - 1) * 100;
}

/**
 * The page's headline numbers from the summary
 *
 * @param {MarketSummary} summary Market summary
 * @returns {IMarketKpis} KPIs
 */
export function marketKpis(summary: MarketSummary): IMarketKpis {
	const daily = Array.from({ length: summary.days }, (_, i) =>
		sum(MARKET_EXCHANGES.map((ex) => summary.turnover_daily[ex]?.[i] ?? 0))
	);
	const last7 = sum(daily.slice(-7));
	const prev7 = sum(daily.slice(-14, -7));
	const total30 = sum(summary.materials.map((m) => m.turnover_30d));
	const flat = summary.materials.filter((m) => m.is_flat);
	return {
		turnover7d: last7,
		turnover7dChange: prev7 ? (last7 / prev7 - 1) * 100 : null,
		traded7d: summary.materials.filter((m) => m.turnover_7d > 0).length,
		traded30d: summary.materials.length,
		index: summary.index.combined.findLast((v) => v != null) ?? null,
		indexChange: seriesChange(summary.index.combined),
		flatShare: total30
			? (sum(flat.map((m) => m.turnover_30d)) / total30) * 100
			: 0,
		flatCount: flat.length,
	};
}

/**
 * Cost of what 100 workers of a tier consume a day, luxuries included
 *
 * @param {(ticker: string) => number | null | undefined} price Price of a ticker
 * @param {WorkforceType} tier Workforce tier
 * @returns {number | null} ȼ per 100 workers a day, null if a price is missing
 */
export function workforceCost(
	price: (ticker: string) => number | null | undefined,
	tier: WorkforceType
): number | null {
	let cost = 0;
	for (const { ticker, need } of WORKFORCE_CONSUMPTION_MAP[tier]) {
		const p = price(ticker);
		if (p == null) return null;
		cost += need * 100 * p;
	}
	return cost;
}

/**
 * Workforce cost of a tier per day, from daily prices per ticker
 *
 * @param {IPriceSeries} series Prices per ticker, oldest first
 * @param {WorkforceType} tier Workforce tier
 * @param {number} days Number of days
 * @returns {(number | null)[]} Cost per day
 */
export function workforceSeries(
	series: IPriceSeries,
	tier: WorkforceType,
	days: number
): (number | null)[] {
	return Array.from({ length: days }, (_, i) =>
		workforceCost((ticker) => series[ticker]?.[i], tier)
	);
}

/**
 * The materials that moved a tier's cost most, from its first to its last
 * day with a full basket
 *
 * @param {IPriceSeries} series Prices per ticker, oldest first
 * @param {WorkforceType} tier Workforce tier
 * @param {number} days Number of days
 * @param {number} [count=2] Drivers to return
 * @returns {IWorkforceDriver[]} Largest change first
 */
export function workforceDrivers(
	series: IPriceSeries,
	tier: WorkforceType,
	days: number,
	count: number = 2
): IWorkforceDriver[] {
	const costs = workforceSeries(series, tier, days);
	const start = costs.findIndex((c) => c != null);
	const end = costs.findLastIndex((c) => c != null);
	if (start < 0 || start === end) return [];
	return WORKFORCE_CONSUMPTION_MAP[tier]
		.map(({ ticker, need }) => {
			const from = series[ticker][start]!;
			const to = series[ticker][end]!;
			return {
				ticker,
				delta: need * 100 * (to - from),
				pct: (to / from - 1) * 100,
			};
		})
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
		.slice(0, count);
}

/**
 * This week's movers: VWAP 7D against VWAP 30D, with real volume and
 * without flat (market maker) materials
 *
 * @param {MarketMaterial[]} materials Summary materials
 * @param {MarketMoversDirection} direction Rising or falling
 * @param {number} [count=8] Rows
 * @returns {MarketMaterial[]} Largest change first
 */
export function marketMovers(
	materials: MarketMaterial[],
	direction: MarketMoversDirection,
	count: number = 8
): MarketMaterial[] {
	const sign = direction === "rising" ? 1 : -1;
	return materials
		.filter(
			(m) =>
				!m.is_flat &&
				m.change_pct != null &&
				m.change_pct * sign > 0 &&
				m.turnover_7d >= MOVER_MIN_TURNOVER &&
				m.units_7d >= MOVER_MIN_UNITS
		)
		.sort((a, b) => (b.change_pct! - a.change_pct!) * sign)
		.slice(0, count);
}

/**
 * The three "In short" facts: index, leading sector, pioneer cost
 *
 * @param {MarketSummary} summary Market summary
 * @returns {IMarketBrief} Brief
 */
export function marketBrief(summary: MarketSummary): IMarketBrief {
	const sectors = Object.entries(summary.index.per_sector)
		.map(([key, values]) => ({ key, change: seriesChange(values) }))
		.filter((s) => s.change != null)
		.sort((a, b) => b.change! - a.change!);

	const byTicker = new Map(summary.materials.map((m) => [m.ticker, m]));
	const pioneerCost = workforceCost(
		(t) => byTicker.get(t)?.vwap_7d,
		"pioneer"
	);
	const pioneerThen = workforceCost(
		(t) => byTicker.get(t)?.spark.find((v) => v != null),
		"pioneer"
	);

	return {
		index: summary.index.combined.findLast((v) => v != null) ?? null,
		indexChange: seriesChange(summary.index.combined),
		sector: sectors[0]?.key ?? null,
		sectorChange: sectors[0]?.change ?? null,
		pioneerCost,
		pioneerChange:
			pioneerCost != null && pioneerThen
				? (pioneerCost / pioneerThen - 1) * 100
				: null,
	};
}

/**
 * Turnover and activity per exchange from the summary
 *
 * @param {MarketSummary} summary Market summary
 * @returns {IMarketExchangeCard[]} One card per exchange
 */
export function exchangeCards(summary: MarketSummary): IMarketExchangeCard[] {
	const cards = MARKET_EXCHANGES.map((code) => {
		const daily = (summary.turnover_daily[code] ?? []).map((v) => v ?? 0);
		return {
			code,
			daily,
			turnover30d: sum(daily.slice(-30)),
			turnover7d: sum(daily.slice(-7)),
			share: 0,
			traded7d: summary.materials.filter(
				(m) => (m.turnover_7d_by_exchange[code] ?? 0) > 0
			).length,
		};
	});
	const total = sum(cards.map((c) => c.turnover30d));
	cards.forEach((c) => (c.share = total ? (c.turnover30d / total) * 100 : 0));
	return cards;
}

/**
 * Order book stats of one exchange
 *
 * @param {Exchange[]} books Every book of /data/exchanges/
 * @param {MarketExchangeCode} code Exchange
 * @returns {IMarketBookStats} Median spread, books without bid or ask
 */
export function bookStats(
	books: Exchange[],
	code: MarketExchangeCode
): IMarketBookStats {
	const own = books.filter((b) => b.exchange_code === code);
	const spreads = own
		.filter((b) => b.bid > 0 && b.ask > 0)
		.map((b) => ((b.ask - b.bid) / ((b.ask + b.bid) / 2)) * 100)
		.sort((a, b) => a - b);
	const mid = Math.floor(spreads.length / 2);
	return {
		spreadMedian: !spreads.length
			? null
			: spreads.length % 2
				? spreads[mid]
				: (spreads[mid - 1] + spreads[mid]) / 2,
		noBid: own.filter((b) => b.bid <= 0).length,
		noAsk: own.filter((b) => b.ask <= 0).length,
	};
}

/**
 * Squarified treemap (Bruls et al.): rows of near-square boxes, areas in
 * proportion to the values. Nodes should come largest first.
 *
 * @param {ITreemapNode<T>[]} nodes Values, largest first
 * @param {number} x Left
 * @param {number} y Top
 * @param {number} w Width
 * @param {number} h Height
 * @returns {ITreemapRect<T>[]} One box per node with a value
 */
export function squarify<T>(
	nodes: ITreemapNode<T>[],
	x: number,
	y: number,
	w: number,
	h: number
): ITreemapRect<T>[] {
	const out: ITreemapRect<T>[] = [];
	const total = sum(nodes.map((n) => n.value));
	if (total <= 0 || w <= 0 || h <= 0) return out;

	const scale = (w * h) / total;
	let items = nodes
		.filter((n) => n.value > 0)
		.map((n) => ({ item: n.item, area: n.value * scale }));

	// the worst aspect ratio of a row laid along a side
	const worst = (row: typeof items, side: number) => {
		const s = sum(row.map((r) => r.area));
		const max = Math.max(...row.map((r) => r.area));
		const min = Math.min(...row.map((r) => r.area));
		return Math.max(
			(side * side * max) / (s * s),
			(s * s) / (side * side * min)
		);
	};

	while (items.length) {
		const side = Math.min(w, h);
		let n = 1;
		while (
			n < items.length &&
			worst(items.slice(0, n + 1), side) <= worst(items.slice(0, n), side)
		)
			n++;
		const row = items.slice(0, n);
		const s = sum(row.map((r) => r.area));

		if (w >= h) {
			// a column at the left
			const cw = s / h;
			let cy = y;
			row.forEach((r) => {
				out.push({ item: r.item, x, y: cy, w: cw, h: r.area / cw });
				cy += r.area / cw;
			});
			x += cw;
			w -= cw;
		} else {
			// a row at the top
			const rh = s / w;
			let cx = x;
			row.forEach((r) => {
				out.push({ item: r.item, x: cx, y, w: r.area / rh, h: rh });
				cx += r.area / rh;
			});
			y += rh;
			h -= rh;
		}
		items = items.slice(n);
	}
	return out;
}

/**
 * Treemap fill for a price change: from neutral to the positive or
 * negative token, saturating at ±12 %. Follows the colour-blind palette.
 *
 * @param {number | null} pct Change in %
 * @returns {string} CSS colour
 */
export function changeColor(pct: number | null): string {
	const t = Math.max(-1, Math.min(1, (pct ?? 0) / CHANGE_SCALE_PCT));
	const mix = Math.round(Math.abs(t) ** 0.75 * 92);
	const token = t >= 0 ? "--color-positive" : "--color-negative";
	return `color-mix(in srgb, var(${token}) ${mix}%, var(--color-selected))`;
}

/**
 * ȼ with a short unit: "412 ȼ", "1.8 k ȼ", "37 M ȼ", "8.97 B ȼ"
 *
 * @param {number} value ȼ
 * @returns {string} Formatted amount
 */
export function formatMoney(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e9)
		return `${formatNumber(value / 1e9, abs >= 1e10 ? 1 : 2)} B ȼ`;
	if (abs >= 1e6)
		return `${formatNumber(value / 1e6, abs >= 1e8 ? 0 : 1)} M ȼ`;
	if (abs >= 1e4) return `${formatNumber(value / 1e3, 1)} k ȼ`;
	return `${formatNumber(value, 0)} ȼ`;
}

/**
 * Sign of a change in %, rounded the way it is shown
 *
 * @param {number | null} pct Change in %
 * @param {number} [decimals=1] Decimals shown
 * @returns {-1 | 0 | 1} Direction
 */
export function changeSign(
	pct: number | null,
	decimals: number = 1
): -1 | 0 | 1 {
	const rounded = Math.round((pct ?? 0) * 10 ** decimals);
	return rounded > 0 ? 1 : rounded < 0 ? -1 : 0;
}

/**
 * A change with arrow and sign, so it never relies on colour: "▲ +7.9 %"
 *
 * @param {number | null} pct Change in %
 * @param {number} [decimals=1] Decimals
 * @returns {string} Formatted change, "–" without one
 */
export function formatChange(pct: number | null, decimals: number = 1): string {
	if (pct == null) return "–";
	const sign = changeSign(pct, decimals);
	const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "■";
	const text = formatNumber(Math.abs(pct), decimals);
	return `${arrow} ${sign > 0 ? "+" : sign < 0 ? "−" : ""}${text} %`;
}

/**
 * Text colour class of a change
 *
 * @param {number | null} pct Change in %
 * @param {number} [decimals=1] Decimals shown
 * @returns {string} Tailwind class
 */
export function changeClass(pct: number | null, decimals: number = 1): string {
	const sign = changeSign(pct, decimals);
	return sign > 0
		? "text-positive"
		: sign < 0
			? "text-negative"
			: "text-muted";
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
	timeZone: "UTC",
	month: "short",
	day: "numeric",
});

/**
 * A UTC day as "Jul 22", like the chart axes
 *
 * @param {number} epoch Epoch ms
 * @returns {string} Day
 */
export function formatDay(epoch: number): string {
	return dayFormat.format(epoch);
}

/**
 * The summary's days as epochs, oldest first
 *
 * @param {MarketSummary} summary Market summary
 * @returns {number[]} UTC midnights
 */
export function summaryDays(summary: MarketSummary): number[] {
	return Array.from(
		{ length: summary.days },
		(_, i) => summary.start + i * 86_400_000
	);
}

/**
 * Line colours of the eight sectors: the exchange hues first, then four
 * more far enough from them; every line also has its direct label
 */
export const SECTOR_COLORS: string[] = [
	"var(--color-cx-ai1)",
	"var(--color-cx-ci1)",
	"var(--color-cx-ic1)",
	"var(--color-cx-nc1)",
	"#fbbf24",
	"#94a3b8",
	"#22d3ee",
	"#f472b6",
];

/** every ticker some workforce consumes, for one spark request */
export const WORKFORCE_TICKERS: string[] = [
	...new Set(
		Object.values(WORKFORCE_CONSUMPTION_MAP).flatMap((needs) =>
			needs.map((n) => n.ticker)
		)
	),
].sort();

/**
 * Change of a daily series over the last 7, 30 and 90 days (the whole
 * series)
 *
 * @param {(number | null)[]} values Series, oldest first
 * @returns {IMarketIndexChanges} Changes in %
 */
export function indexChanges(values: (number | null)[]): IMarketIndexChanges {
	return {
		d7: seriesChange(values.slice(-8)),
		d30: seriesChange(values.slice(-31)),
		d90: seriesChange(values),
	};
}

/**
 * One card per sector: its index, the change over the series and the last
 * 30 days, and its share of the 30-day turnover. Largest change first.
 *
 * @param {MarketSummary} summary Market summary
 * @returns {IMarketSectorCard[]} Cards
 */
export function sectorCards(summary: MarketSummary): IMarketSectorCard[] {
	const total = sum(summary.materials.map((m) => m.turnover_30d));
	return summary.sectors
		.map(({ key }) => {
			const values = summary.index.per_sector[key] ?? [];
			const turnover = sum(
				summary.materials
					.filter((m) => m.sector === key)
					.map((m) => m.turnover_30d)
			);
			return {
				key,
				values,
				change: seriesChange(values),
				change30: seriesChange(values.slice(-31)),
				share: total ? (turnover / total) * 100 : 0,
			};
		})
		.sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity));
}

/**
 * The landing page's lead: the index, the leading sector and the pioneer
 * cost over the same days as the market report's workforce chart
 *
 * @param {MarketSummary} summary Market summary
 * @param {IPriceSeries | null} prices All-exchange VWAP 7D of the
 * workforce tickers over the summary's days, ending on its as_of; null
 * leaves out the pioneer cost
 * @returns {IMarketLead} Lead
 */
export function marketLead(
	summary: MarketSummary,
	prices: IPriceSeries | null
): IMarketLead {
	const brief = marketBrief(summary);
	// the sparks are requested for 90 days, the summary's length; both end
	// on the last complete day
	const costs = prices
		? workforceSeries(prices, "pioneer", summary.days)
		: [];
	const first = costs.findIndex((c) => c != null);
	return {
		change: seriesChange(summary.index.combined),
		change30: seriesChange(summary.index.combined.slice(-31)),
		start: summary.index.base,
		sector: brief.sector,
		sectorChange: brief.sectorChange,
		pioneerCost: costs.findLast((c) => c != null) ?? null,
		pioneerChange: seriesChange(costs),
		pioneerStart:
			first < 0
				? null
				: summary.as_of - (summary.days - 1 - first) * 86_400_000,
	};
}
