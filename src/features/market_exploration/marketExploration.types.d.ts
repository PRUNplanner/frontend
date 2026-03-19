export interface IExploration {
	ticker: string;
	exchange_code: string;
	date_epoch: number;
	open_p: number;
	close_p: number;
	high_p: number;
	low_p: number;
	volume: number;
	traded: number;

	[key: string]: string | number;
}

export type IMaterialExplorationRecord = Record<string, IExploration[]>;

export interface IMaterialMarketHistory {
	date: string;
	AI1: number;
	CI1: number;
	IC1: number;
	NC1: number;

	[key: string]: string | number;
}
