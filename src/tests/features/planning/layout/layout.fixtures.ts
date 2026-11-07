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
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";

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
