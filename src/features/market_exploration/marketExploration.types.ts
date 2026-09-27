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
