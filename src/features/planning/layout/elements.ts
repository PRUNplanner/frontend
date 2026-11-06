// Types & Interfaces
import type {
	ElementId,
	GridItem,
} from "@/features/planning/layout/planLayout.types";

/** What the grid knows of an element: its name, its minimum size, its group */
export interface IElementMeta {
	// i18n key of its name
	label: string;
	// px; below it the element is never shown, the engine widens it
	minW: number;
	minH: number;
	// columns of 12 when added from Elements
	defaultW: number;
	// can't be hidden
	required?: boolean;
	// a results tile: no title row, no folding
	kpi?: boolean;
	// grouped in the Elements panel
	group: "base" | "production" | "results" | "kpis";
	// only for logged-in users
	loggedIn?: boolean;
}

const base = (label: string): IElementMeta => ({
	label,
	minW: 190,
	minH: 96,
	defaultW: 3,
	group: "base",
});
const tool = (
	label: string,
	minW: number,
	minH: number,
	more: Partial<IElementMeta> = {}
): IElementMeta => ({
	label,
	minW,
	minH,
	defaultW: 6,
	group: "production",
	...more,
});
const kpi = (label: string, minW: number = 150): IElementMeta => ({
	label,
	minW,
	minH: 64,
	defaultW: 2,
	kpi: true,
	group: "kpis",
});

/** Every element, in the order of the Elements panel */
export const ELEMENTS: Record<ElementId, IElementMeta> = {
	empire: base("plan.base.empire.label"),
	planet: base("plan.base.planet.label"),
	workforce: base("plan.base.workforce.label"),
	housing: base("plan.base.housing.label"),
	experts: base("plan.base.experts.label"),
	production: tool("plan.tools.labels.production", 540, 240, {
		required: true,
	}),
	"construction-cart": tool("plan.tools.labels.construction_cart", 420, 200),
	"supply-cart": tool("plan.tools.labels.supply_cart", 440, 200),
	"visitation-frequency": tool(
		"plan.tools.labels.visitation_frequency",
		360,
		160
	),
	"repair-analysis": tool("plan.tools.labels.repair_analysis", 360, 160),
	"profit-breakdown": tool("plan.tools.labels.profit_breakdown", 400, 200),
	"plan-check": tool("plan.tools.labels.plan_check", 440, 200),
	popr: tool("plan.tools.labels.popr", 380, 160, { loggedIn: true }),
	"material-io": {
		label: "plan.components.materialio.label",
		minW: 290,
		minH: 200,
		defaultW: 3,
		group: "results",
	},
	"material-io-totals": {
		label: "plan.layout.material_io_totals",
		minW: 190,
		minH: 96,
		defaultW: 3,
		group: "results",
	},
	// own names: the Workforce tile and the Workforce part both appear in
	// Elements and on handles
	"kpi-profit": kpi("plan.layout.kpis.profit", 180),
	"kpi-payback": kpi("plan.layout.kpis.payback"),
	"kpi-workforce": kpi("plan.layout.kpis.workforce"),
	"kpi-area": kpi("plan.layout.kpis.area"),
	"kpi-storage": kpi("plan.layout.kpis.storage"),
};

export const ELEMENT_IDS = Object.keys(ELEMENTS) as ElementId[];

/** Elements that hide parts (tiers, fields, buttons) customising can open */
export const OPENABLE: readonly ElementId[] = [
	"workforce",
	"housing",
	"experts",
];

export const isElementId = (id: unknown): id is ElementId =>
	typeof id === "string" && Object.hasOwn(ELEMENTS, id);

/** A tab group's minimum width: the largest of its elements */
export const minWidthOf = (item: Pick<GridItem, "els">): number =>
	Math.max(...item.els.map((e) => ELEMENTS[e].minW));

export const minHeightOf = (item: Pick<GridItem, "els">): number =>
	Math.max(...item.els.map((e) => ELEMENTS[e].minH));

export const isKpiItem = (item: Pick<GridItem, "els">): boolean =>
	item.els.every((e) => ELEMENTS[e].kpi);

/**
 * Columns an item needs at least, at this grid width
 *
 * @param {Pick<GridItem, "els">} item Item
 * @param {number} cols Columns
 * @param {number} width Grid width in px
 * @param {number} gap Gap in px
 * @returns {number} 1 to cols
 */
export function minColsOf(
	item: Pick<GridItem, "els">,
	cols: number,
	width: number,
	gap: number
): number {
	const step = (width + gap) / cols;
	return Math.min(
		cols,
		Math.max(1, Math.ceil((minWidthOf(item) + gap) / step - 1e-9))
	);
}
