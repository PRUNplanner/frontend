// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	IPackedItem,
	IPackedRegion,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

// Util
import {
	FOLDED_HEIGHT,
	PHONE_WIDTH,
	UNMEASURED_HEIGHT,
} from "@/features/planning/layout/planLayout.constants";
import {
	isKpiItem,
	minColsOf,
	minHeightOf,
	minWidthOf,
} from "@/features/planning/layout/elements";

/** An item folded: its first element is listed, a results tile never */
export const isFolded = (
	item: Pick<GridItem, "els">,
	folded: ReadonlySet<ElementId>
): boolean => folded.has(item.els[0]) && !isKpiItem(item);

/**
 * The box height of an item: its mode, never below its minimum; a folded
 * item shows its title row only
 *
 * @param {GridItem} item Item
 * @param {number} content Measured content height
 * @param {boolean} folded Folded
 * @returns {number} px
 */
export function itemHeight(
	item: GridItem,
	content: number,
	folded: boolean
): number {
	if (folded) return FOLDED_HEIGHT;
	const min = minHeightOf(item);
	const h =
		item.hm === "fixed"
			? item.h
			: item.hm === "cap"
				? Math.min(content, Math.max(item.h, min))
				: content;
	return Math.max(min, h);
}

/** An item's columns: first column and width */
interface ISpan {
	x: number;
	w: number;
}

/**
 * Folded parts side by side with open ones stack as one short column of
 * title bars, where the first of them was; the open parts of that row take
 * the columns this frees, shared by their widths (largest remainder). A
 * row of only folded parts stays a row: stacking it would only push what
 * is below further down. Rows are the items the first packing put at the
 * same top; a taller part of an earlier row between them splits a row.
 *
 * @returns {Map<string, ISpan> | null} The columns of the parts of stacked rows, or null when no row changes
 */
function stackFoldedRows(
	order: GridItem[],
	placed: Record<string, IPackedItem>,
	folded: ReadonlySet<ElementId>,
	gap: number
): Map<string, ISpan> | null {
	const spans = new Map<string, ISpan>();
	const rows = new Map<number, GridItem[]>();
	for (const it of order) {
		const top = Math.round(placed[it.id].top);
		rows.set(top, [...(rows.get(top) ?? []), it]);
	}
	// a column at a row's top is taken by a taller part of an earlier row
	const taken = (c: number, top: number, row: GridItem[]): boolean =>
		order.some((q) => {
			const p = placed[q.id];
			return (
				!row.includes(q) &&
				p.x <= c &&
				c < p.x + p.w &&
				p.top < top &&
				p.top + p.height + gap > top
			);
		});
	// parts of a row with such a part between them can't share columns:
	// each run between those parts stacks on its own
	const runs: GridItem[][] = [];
	for (const [top, row] of rows) {
		const byX = [...row].sort((a, b) => placed[a.id].x - placed[b.id].x);
		let run: GridItem[] = [];
		for (const it of byX) {
			const prev = run.at(-1);
			const from = prev ? placed[prev.id].x + placed[prev.id].w : 0;
			for (let c = from; prev && c < placed[it.id].x; c++)
				if (taken(c, top, row)) {
					runs.push(run);
					run = [];
					break;
				}
			run.push(it);
		}
		runs.push(run);
	}
	let changed = false;
	for (const byX of runs) {
		const shut = byX.filter((it) => isFolded(it, folded));
		const open = byX.filter((it) => !isFolded(it, folded));
		if (shut.length < 2 || !open.length) continue;
		changed = true;
		const w = (it: GridItem) => placed[it.id].w;
		const colW = Math.max(...shut.map(w));
		const freed = shut.reduce((s, it) => s + w(it), 0) - colW;
		const openW = open.reduce((s, it) => s + w(it), 0);
		const quota = open.map((it) => (freed * w(it)) / openW);
		const extra = quota.map(Math.floor);
		let left = freed - extra.reduce((s, e) => s + e, 0);
		for (const i of open
			.map((_, i) => i)
			.sort(
				(a, b) => quota[b] - extra[b] - (quota[a] - extra[a]) || a - b
			))
			if (left-- > 0) extra[i]++;
		// left to right as before, the column where the first folded part was
		let end = placed[byX[0].id].x;
		let prevEnd = end;
		let col: ISpan | null = null;
		for (const it of byX) {
			const p = placed[it.id];
			const skip = p.x - prevEnd;
			prevEnd = p.x + p.w;
			if (col && isFolded(it, folded)) continue;
			const span = isFolded(it, folded)
				? (col = { x: end + skip, w: colW })
				: { x: end + skip, w: p.w + extra[open.indexOf(it)] };
			spans.set(it.id, span);
			end = span.x + span.w;
		}
		for (const it of shut) spans.set(it.id, col!);
	}
	return changed ? spans : null;
}

/**
 * Packs one region: items in (y, x) order, each on the lowest free spot of
 * the columns it spans (a skyline). When an item is narrower than its
 * minimum at this width, every item gets at least its minimum columns and
 * takes the highest free spot closest to its own column ("auto"), also in
 * free space above parts placed before. Below
 * the phone width all stack full width in order, items whose minimum fits
 * half the width two per row (a lone one full width). Then folded parts
 * of a row stack (above).
 */
function packRegion(
	items: GridItem[],
	layout: GridLayout,
	width: number,
	content: Record<string, number>,
	folded: ReadonlySet<ElementId>,
	region: "band" | "page",
	out: Record<string, IPackedItem>
): IPackedRegion {
	const { cols, gap } = layout;
	const colWidth = (width - (cols - 1) * gap) / cols;
	const phone = width < PHONE_WIDTH;
	const half = Math.max(1, Math.floor(cols / 2));
	const sky: number[] = new Array(cols).fill(0);
	const skyAt = (x: number, w: number): number =>
		Math.max(...sky.slice(x, x + w));

	const order = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
	const mins = new Map(
		order.map((it) => [it.id, minColsOf(it, cols, width, gap)])
	);
	const auto = !phone && order.some((it) => it.w < mins.get(it.id)!);

	/** Spans placed so far in this pass, bottoms with the gap below */
	const rects: { x: number; w: number; top: number; bottom: number }[] = [];
	/**
	 * Rearranged ("auto"): the highest free top in these columns, also in
	 * free space above parts placed before (the skyline alone never fills
	 * that, and a wide part placed early could block a column for good)
	 */
	const freeTop = (x: number, w: number, h: number): number => {
		const beside = rects.filter((r) => r.x < x + w && x < r.x + r.w);
		const tops = [0, ...beside.map((r) => r.bottom)].sort((a, b) => a - b);
		return tops.find((t) =>
			beside.every((r) => t >= r.bottom || t + h + gap <= r.top)
		)!;
	};

	/**
	 * Places every item; `fixed` gives some their columns (the second pass:
	 * the parts of stacked rows). The rest are placed by the rules above.
	 */
	function place(fixed: Map<string, ISpan> | null): void {
		sky.fill(0);
		rects.length = 0;
		let side = 0;
		let rowTop = 0;
		for (const it of order) {
			const isF = isFolded(it, folded);
			const nat = content[it.id] ?? UNMEASURED_HEIGHT;
			const height = itemHeight(it, nat, isF);
			const f = fixed?.get(it.id);
			let x: number;
			let w: number;
			if (f) ({ x, w } = f);
			else if (phone) {
				const small = (o: GridItem | undefined) =>
					!!o && minWidthOf(o) <= (width - gap) / 2;
				// a small part pairs with the next one when that is small too;
				// one without a partner takes the full width, no half-empty row
				const paired =
					small(it) &&
					(side === 1 || small(order[order.indexOf(it) + 1]));
				if (paired) {
					w = half;
					x = side ? cols - half : 0;
					side = 1 - side;
				} else {
					w = cols;
					x = 0;
					side = 0;
				}
			} else if (auto) {
				w = Math.min(cols, Math.max(it.w, mins.get(it.id)!));
				x = 0;
				let best = Infinity;
				let bestDist = Infinity;
				for (let c = 0; c <= cols - w; c++) {
					const top = freeTop(c, w, height);
					const dist = Math.abs(c - it.x);
					if (
						top < best - 0.5 ||
						(Math.abs(top - best) <= 0.5 && dist < bestDist)
					) {
						best = top;
						bestDist = dist;
						x = c;
					}
				}
			} else {
				w = Math.min(cols, Math.max(1, it.w));
				x = Math.min(cols - w, Math.max(0, it.x));
			}
			// a phone reads top-down: a row starts below everything so far,
			// its right half sits next to the left one
			const top = phone
				? x > 0
					? rowTop
					: Math.max(...sky)
				: auto
					? freeTop(x, w, height)
					: skyAt(x, w);
			rowTop = top;
			out[it.id] = {
				left: x * (colWidth + gap),
				top,
				width: w * colWidth + (w - 1) * gap,
				height,
				content: nat,
				x,
				w,
				region,
				auto: (phone || auto || !!f) && (x !== it.x || w !== it.w),
				// a few px over are the border and rounding, not worth a scrollbar
				scroll: !isF && nat > height + 4,
			};
			const bottom = top + height + gap;
			rects.push({ x, w, top, bottom });
			for (let c = x; c < x + w; c++) sky[c] = Math.max(sky[c], bottom);
		}
	}

	place(null);
	// a phone stacks everything anyway
	const stacked = phone ? null : stackFoldedRows(order, out, folded, gap);
	if (stacked) place(stacked);
	return {
		height: order.length ? Math.max(0, ...sky) - gap : 0,
		colWidth,
	};
}

/**
 * Where every item of a layout lands at a grid width: the kept-in-view band
 * and the page, packed separately. The layout itself never changes.
 * @author jplacht
 *
 * @param {GridLayout} layout Normalised layout
 * @param {number} width Grid width in px
 * @param {Record<string, number>} content Measured content heights per item id
 * @param {Iterable<ElementId>} folded Folded elements
 * @returns {IPackResult} Positions in px, region heights
 */
export function packLayout(
	layout: GridLayout,
	width: number,
	content: Record<string, number> = {},
	folded: Iterable<ElementId> = []
): IPackResult {
	const set = new Set(folded);
	const items: Record<string, IPackedItem> = {};
	const band = packRegion(
		layout.items.filter((i) => i.pin),
		layout,
		width,
		content,
		set,
		"band",
		items
	);
	const page = packRegion(
		layout.items.filter((i) => !i.pin),
		layout,
		width,
		content,
		set,
		"page",
		items
	);
	return { items, band, page, phone: width < PHONE_WIDTH };
}
