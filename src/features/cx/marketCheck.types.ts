// Types & Interfaces
import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";

/** a reason a material can't be traded as planned, worst first */
export type MarketFlag =
	| "no_price"
	| "no_trades"
	| "no_offers"
	| "no_buyers"
	| "bigger"
	| "large_share"
	| "all_exchanges"
	| "stale";

export type MarketFlagLevel = "red" | "amber" | "muted";

export interface IMarketCheck {
	ticker: string;
	// + sold, − bought per day
	delta: number;
	// whose volume the plan is checked against
	exchange: EXCHANGES_TYPE;
	// |delta| as % of the average daily volume over 30 days, null without
	// any volume
	sharePct: number | null;
	traded30d: number;
	traded7d: number;
	bid: number;
	ask: number;
	// (ask − bid) ÷ ask in %, null without both
	spreadPct: number | null;
	flags: MarketFlag[];
	// the worst flag's level, null when fine
	level: MarketFlagLevel | null;
}

export type MarketLevelCounts = Record<MarketFlagLevel | "fine", number>;

/** a check that carries a flag */
export interface IFlaggedCheck extends IMarketCheck {
	level: MarketFlagLevel;
}

/** materials an ask/bid price book left at their plan price, and why */
export interface IKeptPrices {
	// no exchange preference for them
	fallback: Set<string>;
	// a UNIVERSE exchange preference: no ask or bid across exchanges
	universe: Set<string>;
	// their exchange has no ask (buying) or bid (selling) right now
	zero: Set<string>;
}
