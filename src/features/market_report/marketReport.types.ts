export type MarketExchangeCode = "AI1" | "CI1" | "IC1" | "NC1";
export type MarketIndexView = "combined" | "exchange" | "sector";
export type MarketMoversDirection = "rising" | "falling";

/** daily series per ticker, oldest first, null without trades */
export type IPriceSeries = Record<string, (number | null)[]>;

export interface IMarketKpis {
	turnover7d: number;
	/** against the 7 days before, in %; null without trades then */
	turnover7dChange: number | null;
	/** materials traded in the last 7 days, and in the last 30 */
	traded7d: number;
	traded30d: number;
	index: number | null;
	/** since the base day, in % */
	indexChange: number | null;
	/** share of 30-day turnover in flat materials, in % */
	flatShare: number;
	flatCount: number;
}

export interface IMarketBrief {
	index: number | null;
	indexChange: number | null;
	/** sector key with the largest index change */
	sector: string | null;
	sectorChange: number | null;
	/** ȼ per 100 pioneers a day at today's VWAP 7D */
	pioneerCost: number | null;
	/** against the first day of the 15-day spark, in % */
	pioneerChange: number | null;
}

export interface IMarketExchangeCard {
	code: MarketExchangeCode;
	turnover30d: number;
	turnover7d: number;
	/** of the 30-day turnover of all four, in % */
	share: number;
	traded7d: number;
	/** daily turnover, oldest first, 0 without trades */
	daily: number[];
}

export interface IMarketBookStats {
	/** median bid–ask spread of the books with both, in % of the mid */
	spreadMedian: number | null;
	noBid: number;
	noAsk: number;
}

export interface IWorkforceDriver {
	ticker: string;
	/** change of its share of the cost, ȼ per 100 workers a day */
	delta: number;
	/** its price change, in % */
	pct: number;
}

export interface ITreemapNode<T> {
	value: number;
	item: T;
}

export interface ITreemapRect<T> {
	item: T;
	x: number;
	y: number;
	w: number;
	h: number;
}

/** index change over the last 7, 30 and 90 days, in % */
export interface IMarketIndexChanges {
	d7: number | null;
	d30: number | null;
	d90: number | null;
}

export interface IMarketSectorCard {
	key: string;
	/** sector index, oldest first */
	values: (number | null)[];
	/** over the whole series and the last 30 days, in % */
	change: number | null;
	change30: number | null;
	/** of the 30-day turnover of all materials, in % */
	share: number;
}

/** the numbers of the landing page's lead sentence */
export interface IMarketLead {
	change: number | null;
	change30: number | null;
	/** epoch ms the index is 100 */
	start: number;
	sector: string | null;
	sectorChange: number | null;
	/** ȼ per 100 pioneers a day at the last VWAP 7D, null without prices */
	pioneerCost: number | null;
	pioneerChange: number | null;
	/** epoch ms of the first day with a full pioneer basket */
	pioneerStart: number | null;
}
