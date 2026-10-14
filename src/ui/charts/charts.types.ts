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

export interface IWaterfallSegment {
	/** unique per column, e.g. a material ticker */
	key: string;
	/** chip text, e.g. the ticker */
	label: string;
	/** size, positive */
	value: number;
	/** chip colour class, e.g. the material category */
	chipClass?: string;
}

/** neutral grey, negative, negative hatched, positive */
export type WaterfallTone = "neutral" | "negative" | "hatched" | "positive";

export interface IWaterfallColumn {
	key: string;
	label: string;
	/** a total stands on 0, a step floats from the running total */
	kind: "total" | "step";
	/** the total, or the signed change of a step */
	value: number;
	tone: WaterfallTone;
	/** stacked from the column's start, largest first; empty: one bar */
	segments: IWaterfallSegment[];
}

export interface IWaterfallSegmentBox extends IWaterfallSegment {
	/** px from the plot top */
	top: number;
	height: number;
	/** inside the bar, beside it (right) or only in the tooltip */
	labelAt: "inside" | "beside" | "hidden";
	/** px from the plot top, for a label beside the bar */
	labelTop: number;
}

export interface IWaterfallColumnBox {
	column: IWaterfallColumn;
	/** px from the plot top */
	top: number;
	height: number;
	/** px of the running total after this column, where its connector runs */
	endY: number;
	segments: IWaterfallSegmentBox[];
}

export interface IWaterfallLayout {
	ticks: { value: number; y: number }[];
	zeroY: number;
	columns: IWaterfallColumnBox[];
}

export interface ISparklineLayout {
	/** svg polyline points, one per run of values between gaps */
	lines: string[];
	/** the last value's point, null without any value */
	end: { x: number; y: number } | null;
}

export interface ILineSeries {
	key: string;
	/** direct label and tooltip name, e.g. the exchange code */
	label: string;
	color: string;
	/** one value per day of the chart, null where there is none */
	values: (number | null)[];
}

export interface ILineLabel {
	key: string;
	/** px of the label's middle */
	y: number;
}

export interface ILineTooltipRow {
	key: string;
	label: string;
	color: string;
	value: number;
}

export interface IStackedBarSegment {
	key: string;
	/** share of the bar, e.g. % (segments are drawn in proportion) */
	value: number;
	/** CSS colour */
	color: string;
}
