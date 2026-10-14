export interface IMaterialMarketHistory {
	date: string;
	AI1: number;
	CI1: number;
	IC1: number;
	NC1: number;

	[key: string]: string | number;
}

export type CandleTuple = [number, number, number, number, number, number];
export type CandleInterval = "daily" | "weekly" | "monthly";
export type ChartView = "candles" | "exchanges";
export type ExchangeMetric = "vwap" | "low" | "high";
/** last n days, null for all */
export type ExchangeRange = 30 | 90 | 365 | null;

export interface IExchangeLines {
	/** UTC midnight epochs (ms), continuous */
	days: number[];
	/** per exchange code, one value per day, null without trades */
	values: Record<string, (number | null)[]>;
	/** traded units of all exchanges per day */
	volume: number[];
}
