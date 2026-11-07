import type { InjectionKey } from "vue";

// Types & Interfaces
import type {
	GridItem,
	IFollow,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

/** PlanGrid's measuring: an item hands its title row and content */
export const gridMeasureKey: InjectionKey<
	(id: string, els: HTMLElement[]) => () => void
> = Symbol("PlanGridMeasure");

/**
 * The parts that follow while scrolling: each following part of the page
 * with the parts below it inside its columns, as one stack. It may slide
 * down until the first part below that reaches beyond its columns, or the
 * page's end; a stack with no room to slide stays put. Not on a phone,
 * where everything stacks.
 * @author jplacht
 *
 * @param {GridItem[]} page The page's items (not the band)
 * @param {IPackResult} pack Where they are
 * @param {number} gap Gap between items
 * @returns {Map<string, IFollow>} Per following part
 */
export function followStacks(
	page: GridItem[],
	pack: IPackResult,
	gap: number
): Map<string, IFollow> {
	const out = new Map<string, IFollow>();
	if (pack.phone) return out;
	for (const f of page) {
		const p = pack.items[f.id];
		if (!f.follow || !p || out.has(f.id)) continue;
		const ids = [f.id];
		let bottom = p.top + p.height;
		let limit = pack.page.height;
		const below = page
			.map((o) => ({ o, q: pack.items[o.id] }))
			.filter(
				({ o, q }) =>
					o !== f &&
					q &&
					q.top > p.top &&
					q.x < p.x + p.w &&
					p.x < q.x + q.w
			)
			.sort((a, b) => a.q.top - b.q.top);
		for (const { o, q } of below) {
			if (q.x < p.x || q.x + q.w > p.x + p.w) {
				limit = q.top - gap;
				break;
			}
			ids.push(o.id);
			bottom = Math.max(bottom, q.top + q.height);
		}
		const slide = limit - bottom;
		if (slide <= 0 || ids.some((id) => out.has(id))) continue;
		for (const id of ids)
			out.set(id, { offset: pack.items[id].top - p.top, slide });
	}
	return out;
}

/** Where a tab's two parts beside each other split */
export interface IBesideSplit {
	// width of the first part in px
	px: number;
	// its columns: the ones set, or the nearest to the shared split
	cols: number | null;
	// the columns the first part may have, both keeping their minimums
	range: [number, number] | null;
	// not set: shared by the parts' minimum widths
	auto: boolean;
}

/**
 * Two parts beside each other in a box `cols` columns wide: the first
 * gets the columns set (and half the gap after them, so the line between
 * them sits where the grid's columns meet), held to where both keep their
 * minimum widths; not set, the room beyond both minimums is shared in
 * proportion. Null: narrower than both minimums, so they stack.
 * @author jplacht
 *
 * @param {number} width Box width in px
 * @param {number} cols Box width in columns
 * @param {number} gap The grid's gap in px
 * @param {number | undefined} set Columns of the first part, if set
 * @param {number} minA First part's minimum width
 * @param {number} minB Second part's minimum width
 * @returns {IBesideSplit | null} The split, or null to stack
 */
export function besideSplit(
	width: number,
	cols: number,
	gap: number,
	set: number | undefined,
	minA: number,
	minB: number
): IBesideSplit | null {
	if (width < minA + minB) return null;
	const col = (width - (cols - 1) * gap) / cols;
	const at = (n: number) => n * col + (n - 1) * gap + gap / 2;
	const fits: number[] = [];
	for (let n = 1; n < cols; n++)
		if (at(n) >= minA && width - at(n) >= minB) fits.push(n);
	const range: [number, number] | null = fits.length
		? [fits[0], fits.at(-1)!]
		: null;
	const nearest = (px: number) =>
		range
			? fits.reduce((a, n) =>
					Math.abs(at(n) - px) < Math.abs(at(a) - px) ? n : a
				)
			: null;
	if (set === undefined || !range) {
		const px = (width * minA) / (minA + minB);
		return { px, cols: nearest(px), range, auto: true };
	}
	const n = Math.min(Math.max(set, range[0]), range[1]);
	return { px: at(n), cols: n, range, auto: false };
}
