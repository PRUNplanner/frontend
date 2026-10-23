// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";
import type { MarketFlagLevel } from "@/features/cx/marketCheck.types";

/** a plan's share of an exchange's daily volume, as Market check judges it */
export type ShareVerdict = "fine" | "watch" | "too_big";

/** where a tile's daily amount comes from, for the plan line's wording */
export type DailyContext = "plan" | "empire" | "setup";

/** text for the UI: an i18n key and its params */
export interface ITextRef {
	key: string;
	params?: Record<string, string | number>;
	// params that are i18n keys themselves, translated first
	paramKeys?: Record<string, string>;
}

export interface IMarketTrend {
	// 7D VWAP against 30D VWAP, a fraction (0.05 = 5 %)
	change: number;
	// 0 stable (≤ 2 %), 1 significant, 2 highly significant (> 5 %)
	level: 0 | 1 | 2;
	// ▲, ▼, doubled at level 2; ■ without a change
	glyph: string;
}

export interface IMarketRow {
	cx: EXCHANGES_TYPE;
	// INACTIVE or STALE, null when active
	status: Exclude<Exchange["exchange_status"], "ACTIVE"> | null;
	// 0 when there is none; the Universe row has none
	ask: number;
	bid: number;
	// ask − bid, null without both
	spread: number | null;
	// (ask − bid) / ask in %, null without both
	spreadPct: number | null;
	// why there is no spread, or a wide one (amber above 10 %)
	spreadState: "ok" | "wide" | "no_bids" | "no_asks" | null;
	vwap7d: number;
	vwap30d: number;
	trend: IMarketTrend;
	// VWAP 7D against Universe VWAP 7D in %, null for Universe
	vsUniverse: number | null;
	traded7d: number;
	traded30d: number;
	// traded30d / 30
	perDay: number;
	supply: number;
	demand: number;
	// demand / supply, null without supply
	wantedPerOffered: number | null;
	// |daily| against the daily volume in %, null without daily or volume
	share: number | null;
	// |daily| × 7 against traded7d in %
	share7: number | null;
	// null without daily
	verdict: ShareVerdict | null;
}

export interface IPlanLine {
	// with a Market check: the exchange it is checked against
	checkExchange: EXCHANGES_TYPE | null;
	// the chip's colour, the check's level or the worst verdict
	level: MarketFlagLevel | "fine";
	chip: ITextRef;
	detail: ITextRef;
}

export interface IMarketSummary {
	rising: number;
	// volume-weighted trend, a fraction; null without trades in 7 days
	weightedTrend: number | null;
	trend: ITextRef;
	offered: number;
	wanted: number;
	// demand / supply over all four, null without supply
	balance: number | null;
	balanceText: ITextRef;
	// coefficient of variation of the four VWAP 7D, in %
	cohesion: number;
	cohesionText: ITextRef;
}
