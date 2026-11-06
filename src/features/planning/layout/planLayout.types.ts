// Types & Interfaces
import type {
	BaseSection,
	PlanTool,
	ResultTile,
} from "@/features/planning/planView.util";

/** One self-contained part of the plan page */
export type ElementId =
	| BaseSection
	| PlanTool
	| `kpi-${ResultTile}`
	| "production"
	| "material-io"
	| "material-io-totals";

/** The three built-in layouts; presets never change */
export type PresetKey = "today" | "wide" | "stacked";

/** Height mode: fit the content, fit it up to `h`, or always `h` */
export type HeightMode = "fit" | "cap" | "fixed";

/** A box on the grid: one element, or several as tabs */
export interface GridItem {
	id: string;
	els: ElementId[];
	// the tab shown
	active: ElementId;
	// first column (0-based) and width in columns
	x: number;
	w: number;
	// reading order: items pack by (y, x)
	y: number;
	hm: HeightMode;
	// px for "cap" and "fixed", 0 for "fit"
	h: number;
	// kept in view: packed in the sticky band at the top
	pin: boolean;
	// follows while scrolling, in its columns, with the parts below it
	follow?: boolean;
}

/** The player's grid */
export interface GridLayout {
	cols: number;
	gap: number;
	items: GridItem[];
	// elements that show all they can hide (tiers, fields, buttons)
	open?: ElementId[];
	// elements shown as a table instead of cards
	table?: ElementId[];
}

/** How a part follows while scrolling: px below its stack's head, px it may slide */
export interface IFollow {
	offset: number;
	slide: number;
}

/** Where an item lands, in px from its region's top left */
export interface IPackedItem {
	left: number;
	top: number;
	width: number;
	height: number;
	// content height, measured
	content: number;
	// columns used, can differ from the stored ones ("auto")
	x: number;
	w: number;
	region: "band" | "page";
	// rearranged at this width, the stored layout unchanged
	auto: boolean;
	// content taller than the box: the body scrolls
	scroll: boolean;
}

/** A region's packing */
export interface IPackedRegion {
	height: number;
	// column width in px
	colWidth: number;
}

/** packLayout's result */
export interface IPackResult {
	items: Record<string, IPackedItem>;
	band: IPackedRegion;
	page: IPackedRegion;
	// the width is below the phone breakpoint: everything stacks
	phone: boolean;
}

/** What a layout change says, to the toast and screen readers */
export interface ILayoutAnnouncement {
	key: string;
	params: Record<string, string | number>;
}

/** A layout op's result */
export interface ILayoutChange {
	layout: GridLayout;
	announcement: ILayoutAnnouncement;
}
