// Util
import { formatPercent } from "@/util/numbers";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type {
	IPriceBook,
	IPriceSource,
	PriceType,
} from "@/features/cx/priceBook";
import type {
	IFlaggedCheck,
	IKeptPrices,
	IMarketCheck,
	MarketFlag,
	MarketFlagLevel,
	MarketLevelCounts,
} from "@/features/cx/marketCheck.types";

// share of the average daily volume, in %
export const MARKET_SHARE_AMBER = 10;
export const MARKET_SHARE_RED = 50;

export const MARKET_FLAG_LEVEL: Record<MarketFlag, MarketFlagLevel> = {
	no_price: "red",
	no_trades: "red",
	no_offers: "red",
	no_buyers: "red",
	bigger: "red",
	large_share: "amber",
	all_exchanges: "muted",
	stale: "muted",
};

const LEVEL_RANK: Record<MarketFlagLevel, number> = {
	red: 0,
	amber: 1,
	muted: 2,
};

/**
 * Checks one material's daily flow against its exchange's traded volume,
 * offers and price source
 * @author jplacht
 *
 * @param {string} ticker Material
 * @param {number} delta Daily flow, + sold, − bought
 * @param {IPriceSource} source Where the plan's price came from
 * @param {Exchange | undefined} exchange Volume exchange data, undefined
 * when the material isn't listed there
 * @returns {IMarketCheck} Check
 */
export function checkMaterial(
	ticker: string,
	delta: number,
	source: IPriceSource,
	exchange: Exchange | undefined
): IMarketCheck {
	const traded30d = exchange?.sum_traded_30d ?? 0;
	const traded7d = exchange?.sum_traded_7d ?? 0;
	const bid = exchange?.bid ?? 0;
	const ask = exchange?.ask ?? 0;
	// the sum, not avg_traded_30d, which may average trading days only
	const sharePct =
		traded30d > 0 ? (Math.abs(delta) / (traded30d / 30)) * 100 : null;

	const flags: MarketFlag[] = [];
	if (source.level === "unresolved" || source.zero) flags.push("no_price");
	if (traded7d === 0) flags.push("no_trades");
	if (source.volume !== "UNIVERSE") {
		if (delta < 0 && ask === 0) flags.push("no_offers");
		if (delta > 0 && bid === 0) flags.push("no_buyers");
	}
	if (sharePct !== null && sharePct >= MARKET_SHARE_RED) flags.push("bigger");
	else if (sharePct !== null && sharePct >= MARKET_SHARE_AMBER)
		flags.push("large_share");
	if (source.level === "fallback") flags.push("all_exchanges");
	if (exchange?.exchange_status === "STALE") flags.push("stale");

	return {
		ticker,
		delta,
		exchange: source.volume,
		sharePct,
		traded30d,
		traded7d,
		bid,
		ask,
		spreadPct: bid > 0 && ask > 0 ? ((ask - bid) / ask) * 100 : null,
		flags,
		level: flags.length ? MARKET_FLAG_LEVEL[flags[0]] : null,
	};
}

/**
 * Exchange data by id, undefined when it's missing
 * @author jplacht
 */
function tryExchange(
	getExchange: (tickerId: string) => Exchange,
	tickerId: string
): Exchange | undefined {
	try {
		return getExchange(tickerId);
	} catch {
		return undefined;
	}
}

const priceType = (delta: number): PriceType => (delta > 0 ? "SELL" : "BUY");

/**
 * Market check of every material a plan (or an empire) trades, red first,
 * then amber, then by share
 * @author jplacht
 *
 * @param {{ ticker: string; delta: number }[]} flows Daily flows
 * @param {IPriceBook} book Price book the flows are priced with
 * @param {(tickerId: string) => Exchange} getExchange Exchange data by id
 * @returns {IMarketCheck[]} Checks
 */
export function marketCheck(
	flows: { ticker: string; delta: number }[],
	book: IPriceBook,
	getExchange: (tickerId: string) => Exchange
): IMarketCheck[] {
	const rank = (c: IMarketCheck) => (c.level ? LEVEL_RANK[c.level] : 3);
	return flows
		.filter((f) => f.delta !== 0)
		.map((f) => {
			const source = book.getPriceSource(f.ticker, priceType(f.delta));
			return checkMaterial(
				f.ticker,
				f.delta,
				source,
				tryExchange(getExchange, `${f.ticker}.${source.volume}`)
			);
		})
		.sort(
			(a, b) => rank(a) - rank(b) || (b.sharePct ?? 0) - (a.sharePct ?? 0)
		);
}

/**
 * Counts checks per level; muted and unflagged ones count as fine
 * @author jplacht
 *
 * @param {IMarketCheck[]} checks Checks
 * @returns {MarketLevelCounts} Counts
 */
export function countLevels(checks: IMarketCheck[]): MarketLevelCounts {
	const counts: MarketLevelCounts = { red: 0, amber: 0, muted: 0, fine: 0 };
	for (const c of checks) {
		if (c.level === "red" || c.level === "amber") counts[c.level]++;
		else counts.fine++;
		if (c.level === "muted") counts.muted++;
	}
	return counts;
}

/**
 * A price book that buys at ask and sells at bid on each material's
 * volume exchange. A material keeps its plan price, and is listed, when
 * that exchange is UNIVERSE: no exchange set (fallback) or a UNIVERSE
 * preference (no ask/bid across exchanges); or when it has no ask/bid.
 * @author jplacht
 *
 * @param {IPriceBook} book Plan price book
 * @param {(tickerId: string) => Exchange} getExchange Exchange data by id
 * @returns {{ book: IPriceBook; kept: IKeptPrices }}
 */
export function askBidPriceBook(
	book: IPriceBook,
	getExchange: (tickerId: string) => Exchange
): { book: IPriceBook; kept: IKeptPrices } {
	const kept: IKeptPrices = {
		fallback: new Set(),
		universe: new Set(),
		zero: new Set(),
	};
	return {
		kept,
		book: {
			getPrice(ticker, type) {
				const source = book.getPriceSource(ticker, type);
				if (source.volume === "UNIVERSE") {
					kept[
						source.exchange === "UNIVERSE" &&
						source.level !== "fallback"
							? "universe"
							: "fallback"
					].add(ticker);
					return book.getPrice(ticker, type);
				}
				const { volume } = source;
				const data = tryExchange(getExchange, `${ticker}.${volume}`);
				const price = type === "BUY" ? data?.ask : data?.bid;
				if (!price) {
					kept.zero.add(ticker);
					return book.getPrice(ticker, type);
				}
				return price;
			},
			getPriceSource: book.getPriceSource,
		},
	};
}

/**
 * A share of the daily volume for display: one decimal below 100 %
 * @author jplacht
 *
 * @param {number | null} pct Share in %
 * @returns {string} e.g. "6.0 %", "189 %", "—"
 */
export function formatShare(pct: number | null): string {
	if (pct === null) return "—";
	// unlike formatPercent, ∞ and NaN keep the unit
	return Number.isFinite(pct) ? formatPercent(pct, pct < 100 ? 1 : 0) : "— %";
}

/**
 * A material's check when it gets an icon in a Material I/O: red, amber,
 * or muted only for stale data. "All exchanges" would mark every row of a
 * plan without a CX preference, so it stays in the Market check.
 * @author jplacht
 *
 * @param {Map<string, IMarketCheck> | undefined} checks Checks by ticker
 * @param {string} ticker Material
 * @returns {IFlaggedCheck | undefined} Flagged check
 */
export function flaggedCheck(
	checks: Map<string, IMarketCheck> | undefined,
	ticker: string
): IFlaggedCheck | undefined {
	const check = checks?.get(ticker);
	if (!check?.level) return undefined;
	if (check.level === "muted" && !check.flags.includes("stale"))
		return undefined;
	return check as IFlaggedCheck;
}
