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
