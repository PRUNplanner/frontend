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
	today: () =>
		build([
			...kpis(),
			...baseColumn(),
			item(["production", ...TOOLS], 2, 7, 1),
			item(["material-io"], 9, 3, 1),
			item(["material-io-totals"], 9, 3, 2),
		]),
	// Supply and Plan check next to Production
	wide: () =>
		build([
			...kpis(),
			...baseColumn(),
			item(
				[
					"production",
					"construction-cart",
					"visitation-frequency",
					"repair-analysis",
					"profit-breakdown",
					"popr",
				],
				2,
				4,
				1
			),
			item(["supply-cart"], 6, 3, 1),
			item(["plan-check"], 6, 3, 2, { hm: "cap", h: 360 }),
			item(["material-io"], 9, 3, 1),
			item(["material-io-totals"], 9, 3, 2),
		]),
	// Base parts side by side, Production full width below
	stacked: () =>
		build([
			...kpis(),
			item(["empire"], 0, 2, 1),
			item(["planet"], 2, 3, 1),
			item(["workforce"], 5, 3, 1),
			item(["housing"], 8, 2, 1),
			item(["experts"], 10, 2, 1),
			item(["production", ...TOOLS], 0, 12, 2),
			item(["material-io"], 0, 8, 3),
			item(["material-io-totals"], 8, 4, 3),
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
