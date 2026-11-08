// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	PresetKey,
} from "@/features/planning/layout/planLayout.types";

// Util
import { renumber } from "@/features/planning/layout/normaliseLayout";

const BASE: ElementId[] = [
	"empire",
	"planet",
	"workforce",
	"housing",
	"experts",
];
const TOOLS: ElementId[] = [
	"construction-cart",
	"supply-cart",
	"visitation-frequency",
	"repair-analysis",
	"profit-breakdown",
	"plan-check",
	"popr",
];

const item = (
	els: ElementId[],
	x: number,
	w: number,
	y: number,
	more: Partial<GridItem> = {}
): GridItem => ({
	id: `i-${els[0]}`,
	els,
	active: els[0],
	x,
	w,
	y,
	hm: "fit",
	h: 0,
	pin: false,
	...more,
});

// the results tiles, kept in view in every preset
const kpis = (): GridItem[] => [
	item(["kpi-profit"], 0, 3, 0, { pin: true }),
	item(["kpi-payback"], 3, 2, 0, { pin: true }),
	item(["kpi-workforce"], 5, 3, 0, { pin: true }),
	item(["kpi-area"], 8, 2, 0, { pin: true }),
	item(["kpi-storage"], 10, 2, 0, { pin: true }),
];
// Base's parts down the left column
const baseColumn = (): GridItem[] =>
	BASE.map((el, i) => item([el], 0, 2, 1 + i));

const build = (items: GridItem[]): GridLayout => ({
	cols: 12,
	gap: 16,
	items: renumber(items),
});

const PRESETS: Record<PresetKey, () => GridLayout> = {
	// KPIs on top · Base · Production with tools · Material I/O
	standard: () =>
		build([
			...kpis(),
			...baseColumn(),
			item(["production", ...TOOLS], 2, 7, 1),
			item(["material-io"], 9, 3, 1),
			item(["material-io-totals"], 9, 3, 2),
		]),
};

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/**
 * A preset's layout, a fresh copy each call
 *
 * @param {PresetKey} key Preset
 * @returns {GridLayout} Layout
 */
export const presetLayout = (key: PresetKey): GridLayout => PRESETS[key]();
