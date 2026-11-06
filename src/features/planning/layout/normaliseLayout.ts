// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	HeightMode,
} from "@/features/planning/layout/planLayout.types";

// Util
import {
	COLS_MAX,
	COLS_MIN,
	GAPS,
	H_MAX,
	H_MIN,
	MAX_ELEMENTS,
} from "@/features/planning/layout/planLayout.constants";
import {
	ELEMENTS,
	isElementId,
	OPENABLE,
	TABLE_VIEW,
} from "@/features/planning/layout/elements";

const HEIGHT_MODES: HeightMode[] = ["fit", "cap", "fixed"];

const clamp = (v: number, lo: number, hi: number): number =>
	Math.min(hi, Math.max(lo, v));

const num = (v: unknown, fallback: number): number =>
	typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * Renumbers `y` 0…n in reading order: the kept-in-view band first, then
 * the page, each by y, then x, keeping the order of items that tie
 *
 * @param {GridItem[]} items Items, changed in place
 * @returns {GridItem[]} The items sorted
 */
export function renumber(items: GridItem[]): GridItem[] {
	const sorted = items
		.map((it, i) => ({ it, i }))
		.sort(
			(a, b) =>
				Number(b.it.pin) - Number(a.it.pin) ||
				a.it.y - b.it.y ||
				a.it.x - b.it.x ||
				a.i - b.i
		)
		.map(({ it }) => it);
	sorted.forEach((it, i) => (it.y = i));
	return sorted;
}

/** A free item id: `i-<element>`, or with a number when taken */
export function freeItemId(items: GridItem[], el: ElementId): string {
	const taken = new Set(items.map((i) => i.id));
	let id = `i-${el}`;
	for (let n = 2; taken.has(id); n++) id = `i-${el}-${n}`;
	return id;
}

/** A height: 0, or 64–4000 px */
const height = (v: unknown): number => {
	const h = Math.round(num(v, 0));
	return h <= 0 ? 0 : clamp(h, H_MIN, H_MAX);
};

/**
 * A layout as the grid can use it, from whatever was stored: drops unknown
 * and duplicate elements, keeps Production, clamps columns, widths and
 * heights to the limits, makes `active` one of the item's tabs and
 * renumbers `y` in reading order; keeps the elements shown everything
 * open or as a table that can be. Elements missing from it count as hidden,
 * except Production, which is added at the bottom. Normalising twice
 * changes nothing.
 * @author jplacht
 *
 * @param {unknown} input Layout, possibly broken
 * @returns {GridLayout} Valid layout
 */
export function normaliseLayout(input: unknown): GridLayout {
	const raw = (input ?? {}) as Partial<Record<keyof GridLayout, unknown>>;
	const cols = clamp(Math.round(num(raw.cols, 12)), COLS_MIN, COLS_MAX);
	const gapIn = num(raw.gap, 16);
	const gap = GAPS.reduce((best, g) =>
		Math.abs(g - gapIn) < Math.abs(best - gapIn) ? g : best
	);

	const seen = new Set<ElementId>();
	const items: GridItem[] = [];
	for (const r of Array.isArray(raw.items) ? raw.items : []) {
		const it = (r ?? {}) as Partial<Record<keyof GridItem, unknown>>;
		const els: ElementId[] = [];
		for (const e of Array.isArray(it.els) ? it.els : [])
			if (isElementId(e) && !seen.has(e) && seen.size < MAX_ELEMENTS) {
				seen.add(e);
				els.push(e);
			}
		if (!els.length) continue;
		const w = clamp(Math.round(num(it.w, cols)), 1, cols);
		const hm = HEIGHT_MODES.includes(it.hm as HeightMode)
			? (it.hm as HeightMode)
			: "fit";
		const id =
			typeof it.id === "string" &&
			it.id &&
			!items.some((o) => o.id === it.id)
				? it.id
				: freeItemId(items, els[0]);
		items.push({
			id,
			els,
			active: els.includes(it.active as ElementId)
				? (it.active as ElementId)
				: els[0],
			x: clamp(Math.round(num(it.x, 0)), 0, cols - w),
			w,
			y: num(it.y, Number.MAX_SAFE_INTEGER),
			hm,
			h: height(it.h),
			pin: it.pin === true,
		});
	}

	// Production can't be hidden
	for (const el of Object.keys(ELEMENTS) as ElementId[])
		if (ELEMENTS[el].required && !seen.has(el))
			items.push({
				id: freeItemId(items, el),
				els: [el],
				active: el,
				x: 0,
				w: cols,
				y: Number.MAX_SAFE_INTEGER,
				hm: "fit",
				h: 0,
				pin: false,
			});

	const open = normaliseFolded(raw.open).filter((e) => OPENABLE.includes(e));
	const table = normaliseFolded(raw.table).filter((e) =>
		TABLE_VIEW.includes(e)
	);
	return {
		cols,
		gap,
		items: renumber(items),
		...(open.length && { open }),
		...(table.length && { table }),
	};
}

/**
 * Folded element ids as stored: known ids, each once
 *
 * @param {unknown} input Stored list
 * @returns {ElementId[]} Folded elements
 */
export function normaliseFolded(input: unknown): ElementId[] {
	return [
		...new Set((Array.isArray(input) ? input : []).filter(isElementId)),
	];
}

/**
 * A copy of a layout; unlike structuredClone it takes Vue's reactive
 * proxies too
 *
 * @param {GridLayout} layout Layout
 * @returns {GridLayout} Copy
 */
export const cloneLayout = (layout: GridLayout): GridLayout => ({
	cols: layout.cols,
	gap: layout.gap,
	items: layout.items.map((i) => ({ ...i, els: [...i.els] })),
	...(layout.open && { open: [...layout.open] }),
	...(layout.table && { table: [...layout.table] }),
});
