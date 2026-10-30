// Util
import {
	formatShare,
	MARKET_SHARE_AMBER,
	MARKET_SHARE_RED,
} from "@/features/cx/marketCheck.util";
import { compactNumber } from "@/ui/charts/charts.util";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
} from "@/database/services/useExchangeData.types";
import type {
	IMarketCheck,
	MarketFlag,
	MarketFlagLevel,
} from "@/features/cx/marketCheck.types";
import type {
	IMarketRow,
	IMarketSummary,
	IMarketTrend,
	IPlanLine,
	ITextRef,
	ShareVerdict,
} from "@/features/material_tile/materialMarket.types";

export const MARKET_EXCHANGES = ["AI1", "CI1", "IC1", "NC1"] as const;

// spread % above which it shows amber
const WIDE_SPREAD_PCT = 10;
// units per day below which a market counts as rarely traded
const RARE_PER_DAY = 1;
// price cohesion (coefficient of variation, %) bands
const COHESION_TOGETHER = 1.5;
const COHESION_APART = 5;
// order book balance (wanted per offered) bands
const BALANCE_BUYERS = 0.8;
const BALANCE_SELLERS = 1.25;

// Market check flags about the share: their words go with the share
const SHARE_FLAGS: MarketFlag[] = ["bigger", "large_share"];

const VERDICT_LEVEL: Record<ShareVerdict, MarketFlagLevel | "fine"> = {
	fine: "fine",
	watch: "amber",
	too_big: "red",
};

const K = "material_tile.card";

/**
 * Market check's verdict on a share of the daily volume: watch from 10 %,
 * too big from 50 %, too big without any volume
 * @author jplacht
 *
 * @param {number | null} pct Share in %, null without volume
 * @returns {ShareVerdict} Verdict
 */
export function shareVerdict(pct: number | null): ShareVerdict {
	if (pct === null || pct >= MARKET_SHARE_RED) return "too_big";
	if (pct >= MARKET_SHARE_AMBER) return "watch";
	return "fine";
}

/**
 * 7D against 30D VWAP, at the levels of calculateVWAPAnalysis
 * @author jplacht
 */
function trendOf(
	overview: IMaterialExchangeOverview,
	cx: EXCHANGES_TYPE
): IMarketTrend {
	const { significance, percentChange } = overview.vwap_analysis[cx];
	const change = Number.isFinite(percentChange) ? percentChange : 0;
	const level =
		significance === "HIGHLY-SIGNIFICANT"
			? 2
			: significance === "SIGNIFICANT"
				? 1
				: 0;
	const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "■";
	return {
		change,
		level,
		glyph: level === 2 && change !== 0 ? arrow + arrow : arrow,
	};
}

const pctOf = (part: number, whole: number) =>
	whole > 0 ? (part / whole) * 100 : null;

/**
 * One row per exchange in fixed order, then Universe (no ask, bid or
 * spread there)
 * @author jplacht
 *
 * @param {IMaterialExchangeOverview} overview Exchange overview
 * @param {number} [daily] Plan flow per day, + sold, − bought
 * @returns {IMarketRow[]} Rows
 */
export function marketRows(
	overview: IMaterialExchangeOverview,
	daily?: number
): IMarketRow[] {
	const amount = daily ? Math.abs(daily) : null;
	const universe7d = overview.vwap_7d.UNIVERSE;

	return [...MARKET_EXCHANGES, "UNIVERSE" as const].map((cx) => {
		const isUniverse = cx === "UNIVERSE";
		const ask = isUniverse ? 0 : overview.ask[cx];
		const bid = isUniverse ? 0 : overview.bid[cx];
		const spreadPct = ask > 0 && bid > 0 ? ((ask - bid) / ask) * 100 : null;
		const status = overview.exchange_status[cx];
		const traded7d = overview.sum_traded_7d[cx];
		const traded30d = overview.sum_traded_30d[cx];
		const perDay = traded30d / 30;
		const supply = overview.supply[cx];
		const demand = overview.demand[cx];
		const share = amount === null ? null : pctOf(amount, perDay);

		return {
			cx,
			status: status === "ACTIVE" ? null : status,
			ask,
			bid,
			spread: spreadPct === null ? null : ask - bid,
			spreadPct,
			spreadState: isUniverse
				? null
				: !bid
					? "no_bids"
					: !ask
						? "no_asks"
						: spreadPct! > WIDE_SPREAD_PCT
							? "wide"
							: "ok",
			vwap7d: overview.vwap_7d[cx],
			vwap30d: overview.vwap_30d[cx],
			trend: trendOf(overview, cx),
			vsUniverse: isUniverse
				? null
				: universe7d > 0 && overview.vwap_7d[cx] > 0
					? ((overview.vwap_7d[cx] - universe7d) / universe7d) * 100
					: null,
			traded7d,
			traded30d,
			perDay,
			supply,
			demand,
			wantedPerOffered: supply > 0 ? demand / supply : null,
			share,
			share7: amount === null ? null : pctOf(amount * 7, traded7d),
			verdict: amount === null ? null : shareVerdict(share),
		};
	});
}

/**
 * Fewer than one unit per day on all four exchanges together
 * @author jplacht
 */
export function isRare(overview: IMaterialExchangeOverview): boolean {
	return overview.sum_traded_30d.UNIVERSE / 30 < RARE_PER_DAY;
}

/**
 * The exchanges at the worst verdict, without Universe
 * @author jplacht
 */
function worstOf(rows: IMarketRow[]): {
	verdict: ShareVerdict;
	exchanges: string[];
} {
	const own = rows.filter((r) => r.cx !== "UNIVERSE" && r.verdict);
	for (const verdict of ["too_big", "watch"] as const) {
		const exchanges = own
			.filter((r) => r.verdict === verdict)
			.map((r) => r.cx);
		if (exchanges.length) return { verdict, exchanges };
	}
	return { verdict: "fine", exchanges: [] };
}

/**
 * The verdict across all four exchanges, for a tile without a check
 * @author jplacht
 */
function crossLine(rows: IMarketRow[]): Omit<IPlanLine, "checkExchange"> {
	const own = rows.filter((r) => r.cx !== "UNIVERSE");
	const { verdict, exchanges } = worstOf(rows);
	// no volume counts as the largest share
	const largest = own.reduce((a, b) =>
		b.share === null || (a.share !== null && b.share > a.share) ? b : a
	);
	return {
		level: VERDICT_LEVEL[verdict],
		chip:
			verdict === "fine"
				? { key: `${K}.cross.fine` }
				: {
						key: `${K}.cross.${verdict}`,
						params: { list: exchanges.join(", ") },
					},
		detail:
			largest.share === null
				? { key: `${K}.cross.largest_none`, params: { cx: largest.cx } }
				: {
						key: `${K}.cross.largest`,
						params: {
							share: formatShare(largest.share),
							cx: largest.cx,
						},
					},
	};
}

/**
 * The plan line under the header: with the row's Market check its own
 * verdict (as Plan check shows it) and the other exchanges, without one
 * the verdict across all four
 * @author jplacht
 *
 * @param {IMarketRow[]} rows Rows built with the plan's daily flow
 * @param {IMarketCheck} [check] The row's Market check
 * @returns {IPlanLine} Plan line
 */
export function planLine(rows: IMarketRow[], check?: IMarketCheck): IPlanLine {
	if (!check) return { checkExchange: null, ...crossLine(rows) };

	// as MarketFlagButton words it; "all exchanges" is said by the title
	const flag = check.flags[0];
	const share = { share: formatShare(check.sharePct), cx: check.exchange };
	const chip: ITextRef =
		!flag || flag === "all_exchanges"
			? {
					key: `${K}.chip.${shareVerdict(check.sharePct)}`,
					params: share,
				}
			: SHARE_FLAGS.includes(flag)
				? {
						key: `${K}.chip.flag_share`,
						params: share,
						paramKeys: { flag: `cx.market_flags.flags.${flag}` },
					}
				: { key: `cx.market_flags.flags.${flag}` };

	let detail: ITextRef;
	if (check.exchange === "UNIVERSE") detail = crossLine(rows).chip;
	else {
		const others = rows.filter(
			(r) => r.cx !== "UNIVERSE" && r.cx !== check.exchange
		);
		const on = (v: ShareVerdict) =>
			others
				.filter((r) => r.verdict === v)
				.map((r) => r.cx)
				.join(", ");
		const red = on("too_big");
		const amber = on("watch");
		detail =
			red && amber
				? { key: `${K}.others.mixed`, params: { red, amber } }
				: red
					? { key: `${K}.others.too_big`, params: { list: red } }
					: amber
						? { key: `${K}.others.watch`, params: { list: amber } }
						: { key: `${K}.others.fine` };
	}

	return {
		checkExchange: check.exchange,
		level: check.level ?? "fine",
		chip,
		detail,
	};
}

const signed = (fraction: number) =>
	`${formatNumber(fraction * 100, 1, false, true)} %`;

/**
 * The summary lines: breadth and weighted trend, order books, how far the
 * exchanges' prices are apart. The numbers come from systemic_health.
 * @author jplacht
 *
 * @param {IMaterialExchangeOverview} overview Exchange overview
 * @returns {IMarketSummary} Summary
 */
export function marketSummary(
	overview: IMaterialExchangeOverview
): IMarketSummary {
	const health = overview.systemic_health;
	const rising = Math.round((health.diffusionIndex / 100) * 4);
	const weightedTrend = Number.isFinite(health.weightedTrend)
		? health.weightedTrend
		: null;
	const offered = overview.supply.UNIVERSE;
	const wanted = overview.demand.UNIVERSE;
	const balance = offered > 0 ? wanted / offered : null;
	const cohesion = Number.isFinite(health.priceCohesion)
		? health.priceCohesion
		: 0;

	const priced = MARKET_EXCHANGES.filter((cx) => overview.vwap_7d[cx] > 0);
	const byPrice = [...priced].sort(
		(a, b) => overview.vwap_7d[a] - overview.vwap_7d[b]
	);
	const band =
		cohesion < COHESION_TOGETHER
			? "together"
			: cohesion > COHESION_APART
				? "apart"
				: "little";

	return {
		rising,
		weightedTrend,
		trend:
			weightedTrend === null
				? { key: `${K}.summary.trend_none`, params: { rising } }
				: {
						key: `${K}.summary.trend`,
						params: { rising, trend: signed(weightedTrend) },
					},
		offered,
		wanted,
		balance,
		balanceText: {
			key: `material_tile.health.balance.${
				balance === null || balance < BALANCE_BUYERS
					? "buyers"
					: balance > BALANCE_SELLERS
						? "sellers"
						: "even"
			}`,
		},
		cohesion,
		cohesionText: {
			key: `${K}.summary.cohesion.${band}`,
			params: {
				pct: `${formatNumber(cohesion, 1)} %`,
				cheapest: byPrice[0] ?? "—",
				dearest: byPrice.at(-1) ?? "—",
			},
		},
	};
}

/**
 * One y-range for several sparklines, so their heights compare; a flat
 * range is widened by 3 % each way
 * @author jplacht
 *
 * @param {(number | null)[][]} series Sparkline values
 * @returns {[number, number] | undefined} min and max, none without values
 */
export function sharedDomain(
	series: (number | null)[][]
): [number, number] | undefined {
	const values = series.flat().filter((v): v is number => v !== null);
	if (!values.length) return undefined;
	const lo = Math.min(...values);
	const hi = Math.max(...values);
	if (hi - lo >= hi * 0.002) return [lo, hi];
	const mid = (hi + lo) / 2;
	return [mid * 0.97, mid * 1.03];
}

/**
 * A quantity for the card: 1.6M, 36.2k, 360, 4.2, 0.05
 * @author jplacht
 *
 * @param {number} value Units
 * @returns {string} Short quantity
 */
export function formatQuantity(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1000) return compactNumber(value);
	if (abs === 0) return "0";
	return formatNumber(value, abs >= 10 ? 0 : abs >= 1 ? 1 : 2);
}

/**
 * A price for the card: — when there is none, 958k from 100,000 up, two
 * decimals only when it has some
 * @author jplacht
 *
 * @param {number} value Price
 * @returns {string} Price
 */
export function formatMarketPrice(value: number): string {
	if (!value || !Number.isFinite(value)) return "—";
	if (value >= 1e5) return compactNumber(value);
	return formatNumber(value, 2, true);
}

/**
 * Translates a text ref, "UNIVERSE" in its params as the word
 * @author jplacht
 *
 * @param {(key: string, named: Record<string, unknown>) => string} t i18n
 * @param {ITextRef} ref Text ref
 * @returns {string} Text
 */
export function translateRef(
	t: (key: string, named: Record<string, unknown>) => string,
	ref: ITextRef
): string {
	const params: Record<string, unknown> = Object.fromEntries(
		Object.entries(ref.params ?? {}).map(([k, v]) => [
			k,
			v === "UNIVERSE" ? t("exchanges.labels.universe", {}) : v,
		])
	);
	for (const [k, key] of Object.entries(ref.paramKeys ?? {}))
		params[k] = t(key, {});
	return t(ref.key, params);
}
