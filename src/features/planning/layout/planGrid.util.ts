import type { InjectionKey, Ref } from "vue";

// Types & Interfaces
import type {
	ElementId,
	GridItem,
	IFollow,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

// Util
import { ELEMENTS } from "@/features/planning/layout/elements";
import { partsOf, sideOf, tabEls } from "@/features/planning/layout/tabs";

/** PlanGrid's measuring: an item hands its title row and content */
export const gridMeasureKey: InjectionKey<
	(id: string, els: HTMLElement[]) => () => void
> = Symbol("PlanGridMeasure");

/**
 * A part set to a height ("cap" or "fixed"): the px its body has, so a
 * table inside can scroll in a box of its own, its header in view; null
 * when it fits its content (then everything shows, the page scrolls)
 */
export const partRoomKey: InjectionKey<Readonly<Ref<number | null>>> =
	Symbol("PlanPartRoom");

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

/** Where a tab's parts beside each other split */
export interface IBesideSplit {
	// width of each part in px
	px: number[];
	// columns of each part but the last: the ones set, or the nearest to
	// the shared split; null where no column split fits them all
	cols: number[] | null;
	// per part but the last: the columns it may have with the lines
	// beside it held, both neighbours keeping their minimums
	range: ([number, number] | null)[];
	// none set: shared by the parts' minimum widths, on the nearest columns
	auto: boolean;
}

/**
 * Parts beside each other in a box `cols` columns wide: each line between
 * two sits where the grid's columns meet (half the gap on each side), at
 * the columns set, held to where every part keeps its minimum width; none
 * set, at the columns nearest a share in proportion to the minimums (so a
 * first drag moves only its line). Where no column split fits them all,
 * shared in proportion. Null: narrower than all minimums together, so
 * they stack.
 * @author jplacht
 *
 * @param {number} width Box width in px
 * @param {number} cols Box width in columns
 * @param {number} gap The grid's gap in px
 * @param {(number | undefined)[]} sets Columns of each part but the last, if set
 * @param {number[]} mins Each part's minimum width
 * @returns {IBesideSplit | null} The split, or null to stack
 */
export function besideSplit(
	width: number,
	cols: number,
	gap: number,
	sets: (number | undefined)[],
	mins: number[]
): IBesideSplit | null {
	const total = mins.reduce((a, b) => a + b, 0);
	if (width < total) return null;
	const n = mins.length;
	const col = (width - (cols - 1) * gap) / cols;
	// the line after `k` columns, in px from the box's left
	const at = (k: number) =>
		k <= 0 ? 0 : k >= cols ? width : k * col + (k - 1) * gap + gap / 2;
	const share = mins.map((m) => (width * m) / total);
	// lines in columns from the left: as set, else nearest the shared split
	const lines: number[] = [];
	let px = 0;
	for (let i = 0; i < n - 1; i++) {
		px += share[i];
		const s = sets[i];
		lines.push(
			s === undefined
				? Math.round((px + gap / 2) / (col + gap))
				: (lines[i - 1] ?? 0) + s
		);
	}
	const bound = (i: number) => (i < 0 ? 0 : i >= n - 1 ? cols : lines[i]);
	// fit: forward so each part keeps its minimum, back so the rest fit
	for (let i = 0; i < n - 1; i++) {
		while (
			lines[i] < cols &&
			(lines[i] <= bound(i - 1) ||
				at(lines[i]) - at(bound(i - 1)) < mins[i])
		)
			lines[i]++;
	}
	for (let i = n - 2; i >= 0; i--) {
		while (
			lines[i] > 0 &&
			(lines[i] >= bound(i + 1) ||
				at(bound(i + 1)) - at(lines[i]) < mins[i + 1])
		)
			lines[i]--;
	}
	const fits = lines.every(
		(l, i) =>
			l > bound(i - 1) &&
			l < bound(i + 1) &&
			at(l) - at(bound(i - 1)) >= mins[i] &&
			at(bound(i + 1)) - at(l) >= mins[i + 1]
	);
	const auto = !fits || sets.every((s) => s === undefined);
	const range = lines.map((_, i): [number, number] | null => {
		if (!fits) return null;
		const ok: number[] = [];
		for (let k = bound(i - 1) + 1; k < bound(i + 1); k++)
			if (
				at(k) - at(bound(i - 1)) >= mins[i] &&
				at(bound(i + 1)) - at(k) >= mins[i + 1]
			)
				ok.push(k - bound(i - 1));
		return ok.length ? [ok[0], ok.at(-1)!] : null;
	});
	return {
		px: fits ? mins.map((_, i) => at(bound(i)) - at(bound(i - 1))) : share,
		cols: fits ? lines.map((l, i) => l - bound(i - 1)) : null,
		range,
		auto,
	};
}

/**
 * Where a tab's parts split, beside each other in a box this wide; null
 * when they sit below each other (set so, or too narrow for all)
 *
 * @param {GridItem} it Item
 * @param {ElementId} host The tab's own element
 * @param {number} width Box width in px
 * @param {number} cols Box width in columns
 * @param {number} gap The grid's gap in px
 * @returns {IBesideSplit | null} The split, or null
 */
export function tabBeside(
	it: Pick<GridItem, "els" | "join" | "joinSize">,
	host: ElementId,
	width: number,
	cols: number,
	gap: number
): IBesideSplit | null {
	if (sideOf(it, host) !== "beside") return null;
	return besideSplit(
		width,
		cols,
		gap,
		partsOf(it, host).map((e) => it.joinSize?.[e]),
		tabEls(it, host).map((e) => ELEMENTS[e].minW)
	);
}
