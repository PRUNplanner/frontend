export interface IScatterPoint {
	/** unique per chart */
	key: string;
	/** text next to the dot */
	label: string;
	x: number;
	y: number;
	/** 0..1, scales the dot radius; constant when left out */
	size?: number;
	/** dot fill, else muted */
	color?: string;
	/** white ring, e.g. pinned */
	ring?: boolean;
	/** labelled first, and still labelled above maxLabels */
	emphasis?: boolean;
}

export type IScatterLabelSide = "right" | "left" | "below";

/** a dot in px, as laid out on the plot */
export interface IScatterDot {
	key: string;
	cx: number;
	cy: number;
	r: number;
}

export interface IScatterRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** an axis-aligned line in px: x1, y1, x2, y2 */
export type IScatterSegment = [number, number, number, number];
