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
