export interface IChartBarItem {
	name: string;
	value: number;
	/** bar colour, else by sign (positive / negative token) */
	color?: string;
}

export interface IChartTheme {
	positive: string;
	negative: string;
	warning: string;
	muted: string;
	/** text and marks that need full contrast */
	ink: string;
	grid: string;
	axis: string;
	/** tooltip background */
	surface: string;
	/** exchange colour, UNIVERSE and unknown codes are muted */
	exchange: (code: string) => string;
	/** 1 inputs, 2 workforce, 3 degradation, 4 shipping */
	costPart: (slot: 1 | 2 | 3 | 4) => string;
}

export interface IStripItem {
	/** unique per strip, e.g. a material ticker */
	key: string;
	value: number;
}

export interface IStripDot extends IStripItem {
	/** position on the axis, 0..100 */
	pct: number;
	/** close neighbours split up and down so they never overlap */
	lane: "mid" | "up" | "down";
}

export type IChartZone = "red" | "yellow" | "none";
