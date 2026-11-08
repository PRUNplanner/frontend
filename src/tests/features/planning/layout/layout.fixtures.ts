// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";
import type { ILayoutOpsContext } from "@/features/planning/layout/layoutOps";

// Util
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { GAPS } from "@/features/planning/layout/planLayout.constants";
import {
	normaliseLayout,
	renumber,
} from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";

/** A seeded random generator, so a failing case reproduces */
export function prng(seed: number): () => number {
	let s = seed;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const pick = <T>(rnd: () => number, list: readonly T[]): T =>
	list[Math.floor(rnd() * list.length)];

export const int = (rnd: () => number, lo: number, hi: number): number =>
	lo + Math.floor(rnd() * (hi - lo + 1));

/** A random valid layout: elements shuffled into items, some as tabs */
export function randomLayout(rnd: () => number): GridLayout {
	const cols = int(rnd, 4, 24);
	const els = [...ELEMENT_IDS].sort(() => rnd() - 0.5);
	const n = int(rnd, 1, els.length);
	const items: GridItem[] = [];
	let i = 0;
	while (i < n) {
		const size = rnd() < 0.2 ? int(rnd, 2, 4) : 1;
		const group = els.slice(i, i + size) as ElementId[];
		i += size;
		const w = int(rnd, 1, cols);
		const hm = pick(rnd, ["fit", "cap", "fixed"] as const);
		items.push({
			id: `r${items.length}`,
			els: group,
			active: pick(rnd, group),
			x: int(rnd, 0, cols - w),
			w,
			y: items.length,
			hm,
			h: hm === "fit" ? 0 : int(rnd, 64, 900),
			pin: rnd() < 0.15,
			// now and then one shown with the element before it
			...(group.length > 1 &&
				rnd() < 0.4 && {
					join: {
						[group[int(rnd, 1, group.length - 1)]]: pick(rnd, [
							"below",
							"beside",
						] as const),
					},
				}),
		});
	}
	return normaliseLayout({ cols, gap: pick(rnd, GAPS), items });
}

/** Random content heights for a layout's items */
export const randomHeights = (
	rnd: () => number,
	layout: GridLayout
): Record<string, number> =>
	Object.fromEntries(layout.items.map((i) => [i.id, int(rnd, 40, 2000)]));

/** Op context with names as ids, so announcements are easy to read */
export const ctx = (
	width: number = 1440,
	more: Partial<ILayoutOpsContext> = {}
): ILayoutOpsContext => ({
	width,
	title: (it) => it.els.join("+"),
	label: (el) => el,
	...more,
});

/*
 * Two other arrangements than Standard, as the presets Wide and Stacked
 * had them: Supply and Plan check out of Production's tabs, and Base's
 * parts side by side with Production full width below
 */
const fixtureItem = (
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
const kpisOf = (): GridItem[] =>
	presetLayout("standard").items.filter((i) => i.els[0].startsWith("kpi-"));
const BASE: ElementId[] = [
	"empire",
	"planet",
	"workforce",
	"housing",
	"experts",
];

export const wideLayout = (): GridLayout => ({
	cols: 12,
	gap: 16,
	items: renumber([
		...kpisOf(),
		...BASE.map((el, i) => fixtureItem([el], 0, 2, 1 + i)),
		fixtureItem(
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
		fixtureItem(["supply-cart"], 6, 3, 1),
		fixtureItem(["plan-check"], 6, 3, 2, { hm: "cap", h: 360 }),
		fixtureItem(["material-io"], 9, 3, 1),
		fixtureItem(["material-io-totals"], 9, 3, 2),
	]),
});

export const stackedLayout = (): GridLayout => ({
	cols: 12,
	gap: 16,
	items: renumber([
		...kpisOf(),
		fixtureItem(["empire"], 0, 2, 1),
		fixtureItem(["planet"], 2, 3, 1),
		fixtureItem(["workforce"], 5, 3, 1),
		fixtureItem(["housing"], 8, 2, 1),
		fixtureItem(["experts"], 10, 2, 1),
		fixtureItem(
			[
				"production",
				"construction-cart",
				"supply-cart",
				"visitation-frequency",
				"repair-analysis",
				"profit-breakdown",
				"plan-check",
				"popr",
			],
			0,
			12,
			2
		),
		fixtureItem(["material-io"], 0, 8, 3),
		fixtureItem(["material-io-totals"], 8, 4, 3),
	]),
});
