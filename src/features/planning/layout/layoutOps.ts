// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	HeightMode,
	JoinSide,
	ILayoutChange,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

// Util
import {
	COLS_MAX,
	COLS_MIN,
	H_MAX,
	H_SNAP,
	H_STEP,
} from "@/features/planning/layout/planLayout.constants";
import {
	ELEMENTS,
	minColsOf,
	minHeightOf,
	OPENABLE,
	TABLE_VIEW,
} from "@/features/planning/layout/elements";
import {
	cloneLayout,
	freeItemId,
	renumber,
} from "@/features/planning/layout/normaliseLayout";
import {
	hostOf,
	partnerOf,
	removeEl,
	tabEls,
	tabsOf,
	tidyJoin,
} from "@/features/planning/layout/tabs";

/** What an op needs to know of the screen */
export interface ILayoutOpsContext {
	// grid width in px, for the minimum columns
	width: number;
	// the last packing: positions settle the order, content heights
	pack?: IPackResult;
	// an item's name for the announcements, e.g. "Production + 7 tabs"
	title: (it: Pick<GridItem, "els" | "join">) => string;
	// an element's name
	label: (el: ElementId) => string;
}

// a drop above or below an item, between two orders
const HALF = 0.5;
const END = Number.MAX_SAFE_INTEGER / 2;

/** A drag height on the 8 px grid, within the limits */
export const snapHeight = (h: number, min: number): number =>
	Math.min(H_MAX, Math.max(min, Math.round(h / H_SNAP) * H_SNAP));

/** Regions whose packing rearranged parts ("auto"): their tops don't follow the stored order */
const rearranged = (ctx: ILayoutOpsContext): Set<"band" | "page"> =>
	new Set(
		Object.values(ctx.pack?.items ?? {})
			.filter((p) => p.auto)
			.map((p) => p.region)
	);

/**
 * Copies the layout with the order taken from where the items are on
 * screen, so an op changes only what it means to. A rearranged region
 * keeps its stored order: there a part can sit above one stored before
 * it, and copying the tops would reorder the layout at every width.
 */
function settle(layout: GridLayout, ctx: ILayoutOpsContext): GridLayout {
	const copy = cloneLayout(layout);
	const pos = ctx.pack?.items;
	if (!pos) return copy;
	const keep = rearranged(ctx);
	for (const it of copy.items) {
		const p = pos[it.id];
		if (p && !keep.has(p.region)) it.y = p.top;
	}
	return copy;
}

/**
 * The order a drop at `top` (px of the last packing) gets: just above
 * what sits there. In a rearranged region, just before the first part by
 * stored order whose packed top is at or below the drop in the columns it
 * lands in.
 */
function dropOrder(
	g: GridLayout,
	it: GridItem,
	top: number,
	band: boolean,
	ctx: ILayoutOpsContext
): number {
	const pos = ctx.pack?.items;
	if (!pos || !rearranged(ctx).has(band ? "band" : "page")) return top - HALF;
	const below = g.items
		.filter((o) => {
			const p = pos[o.id];
			return (
				o !== it &&
				o.pin === band &&
				p &&
				p.x < it.x + it.w &&
				it.x < p.x + p.w &&
				p.top >= top - HALF
			);
		})
		.sort((a, b) => a.y - b.y);
	return below.length ? below[0].y - HALF : END;
}

const done = (
	layout: GridLayout,
	key: string,
	params: Record<string, string | number> = {}
): ILayoutChange => ({
	layout: { ...layout, items: renumber(layout.items).map(tidyJoin) },
	announcement: { key: `plan.layout.announce.${key}`, params },
});

/**
 * Runs `fn` on a settled copy and its item; an unknown id changes nothing
 */
function edit(
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext,
	fn: (it: GridItem, g: GridLayout) => ILayoutChange
): ILayoutChange {
	const g = settle(layout, ctx);
	const it = g.items.find((i) => i.id === id);
	if (!it) return done(g, "nothing");
	return fn(it, g);
}

/** Minimum columns of an item at the context's width */
export const minCols = (
	item: Pick<GridItem, "els">,
	layout: GridLayout,
	ctx: Pick<ILayoutOpsContext, "width">
): number => minColsOf(item, layout.cols, ctx.width, layout.gap);

/** The height an item has now: its packed height, or its stored one */
const currentHeight = (it: GridItem, ctx: ILayoutOpsContext): number =>
	ctx.pack?.items[it.id]?.height ?? Math.max(it.h, minHeightOf(it));

const contentHeight = (it: GridItem, ctx: ILayoutOpsContext): number =>
	ctx.pack?.items[it.id]?.content ?? 0;

/** Move left or right by `dx` columns; it keeps its height on the page and
 * pushes what it now overlaps down, as a drop there does */
export const moveX = (
	layout: GridLayout,
	id: string,
	dx: number,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		const x = Math.max(0, Math.min(g.cols - it.w, it.x + dx));
		// at the edge already: no undo step, no announcement of a move
		if (x === it.x) return done(g, "nothing");
		it.x = x;
		// ordered as a drop there at its own top (also where rearranged)
		it.y = dropOrder(
			g,
			it,
			ctx.pack?.items[it.id]?.top ?? it.y,
			it.pin,
			ctx
		);
		return done(g, "column", {
			item: ctx.title(it),
			n: it.x + 1,
		});
	});

/** Move above the item above it, or below the one below (same region and columns) */
export const moveY = (
	layout: GridLayout,
	id: string,
	dir: -1 | 1,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		const others = g.items
			.filter(
				(o) =>
					o !== it &&
					o.pin === it.pin &&
					o.x < it.x + it.w &&
					it.x < o.x + o.w
			)
			.sort((a, b) => a.y - b.y);
		const next =
			dir < 0
				? others.filter((o) => o.y < it.y).pop()
				: others.find((o) => o.y > it.y);
		if (next) it.y = next.y + dir * HALF;
		return done(g, dir < 0 ? "up" : "down", {
			item: ctx.title(it),
		});
	});

/**
 * Put an item at a column and an order (a drag's drop): `y` is a top in
 * px of the last packing, so it lands just above what sits there
 */
export const moveTo = (
	layout: GridLayout,
	id: string,
	to: { x: number; y: number; band: boolean },
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		// its stored width: below its minimum here, the packing widens it
		it.x = Math.max(0, Math.min(g.cols - it.w, Math.round(to.x)));
		it.y = dropOrder(g, it, to.y, to.band, ctx);
		it.pin = to.band;
		if (to.band) delete it.follow;
		return done(g, to.band ? "moved_band" : "moved", {
			item: ctx.title(it),
			n: it.x + 1,
		});
	});

type Side = "left" | "right";

/**
 * Parts beside an item towards one side on the last packing: in its
 * region and next to it somewhere from its top to its bottom. A
 * rearranged region has none: its parts don't sit where the layout says.
 */
function besideOf(
	g: GridLayout,
	it: GridItem,
	side: Side,
	ctx: ILayoutOpsContext
): GridItem[] {
	const pos = ctx.pack?.items;
	const p = pos?.[it.id];
	if (!pos || !p || rearranged(ctx).has(p.region)) return [];
	return g.items.filter((o) => {
		const q = pos[o.id];
		return (
			o !== it &&
			!!q &&
			q.region === p.region &&
			q.top < p.top + p.height &&
			p.top < q.top + q.height &&
			(side === "right" ? o.x >= it.x + it.w : o.x + o.w <= it.x)
		);
	});
}

/**
 * How far an edge of an item can go: the column of the grid's edge, or
 * where a part beside it reaches its minimum width (`by`)
 */
export function edgeRoom(
	layout: GridLayout,
	id: string,
	side: Side,
	ctx: ILayoutOpsContext
): { edge: number; by: GridItem | null } {
	let edge = side === "right" ? layout.cols : 0;
	let by: GridItem | null = null;
	const it = layout.items.find((i) => i.id === id);
	for (const o of it ? besideOf(layout, it, side, ctx) : []) {
		const m = minCols(o, layout, ctx);
		const lim = side === "right" ? o.x + o.w - m : o.x + m;
		if (side === "right" ? lim < edge : lim > edge) {
			edge = lim;
			by = o;
		}
	}
	return { edge, by };
}

/**
 * Moves the right or the left edge to column `to`: never below the
 * minimum at this width, never past the grid's edge. Parts beside it give
 * up the columns it takes, down to their own minimum; there it stops.
 */
function setEdge(
	layout: GridLayout,
	id: string,
	side: Side,
	to: number,
	ctx: ILayoutOpsContext
): ILayoutChange {
	return edit(layout, id, ctx, (it, g) => {
		const min = minCols(it, g, ctx);
		const room = edgeRoom(g, id, side, ctx);
		const beside = besideOf(g, it, side, ctx);
		const right = it.x + it.w;
		const want = side === "right" ? to - it.x : right - to;
		if (side === "right") {
			const end = Math.min(to, Math.max(room.edge, right));
			it.w = Math.min(g.cols, Math.max(min, end - it.x));
			it.x = Math.min(it.x, g.cols - it.w);
		} else {
			const start = Math.max(to, Math.min(room.edge, it.x));
			it.x = Math.max(0, Math.min(start, right - min));
			it.w = Math.min(g.cols - it.x, Math.max(min, right - it.x));
		}
		// the parts beside give up the columns it took
		for (const o of beside)
			if (side === "right") {
				const from = it.x + it.w;
				const end = o.x + o.w;
				if (o.x < from && end - from >= 1) {
					o.x = from;
					o.w = end - from;
				}
			} else if (o.x + o.w > it.x && it.x - o.x >= 1) o.w = it.x - o.x;
		const params = { item: ctx.title(it), n: it.w, cols: g.cols };
		if (want > it.w && room.by)
			return done(g, "width_neighbour", {
				...params,
				name: ctx.title(room.by),
			});
		return done(
			g,
			it.w === min && want < min ? "width_min" : "width",
			params
		);
	});
}

/** Width in columns from the right edge (see setEdge) */
export const setWidth = (
	layout: GridLayout,
	id: string,
	w: number,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	setEdge(
		layout,
		id,
		"right",
		(layout.items.find((i) => i.id === id)?.x ?? 0) + w,
		ctx
	);

/** The left edge to column `x`, the right one stays (see setEdge) */
export const setLeft = (
	layout: GridLayout,
	id: string,
	x: number,
	ctx: ILayoutOpsContext
): ILayoutChange => setEdge(layout, id, "left", x, ctx);

/** Full width */
export const fullWidth = (
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		it.x = 0;
		it.w = g.cols;
		return done(g, "full_width", { item: ctx.title(it) });
	});

/** Height mode; "at most" and "fixed" start from the content, up to 480 px */
export const setHeightMode = (
	layout: GridLayout,
	id: string,
	hm: HeightMode,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		it.hm = hm;
		if (hm !== "fit" && !it.h)
			it.h = snapHeight(
				Math.min(contentHeight(it, ctx) || 400, 480),
				minHeightOf(it)
			);
		return done(g, `height_${hm}`, {
			item: ctx.title(it),
			h: it.h,
		});
	});

/**
 * Height in px, the way a drag of the bottom edge sets it: taller than the
 * content keeps the space ("fixed"), shorter scrolls ("at most"); snapped
 * to the content it fits again
 */
export const setHeight = (
	layout: GridLayout,
	id: string,
	h: number,
	ctx: ILayoutOpsContext,
	snapped: "bottom" | "height" | "content" | null = null
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		const min = minHeightOf(it);
		const v = snapped
			? Math.min(H_MAX, Math.max(min, Math.round(h)))
			: snapHeight(h, min);
		it.h = v;
		const content = contentHeight(it, ctx);
		if (snapped === "content") it.hm = "fit";
		else if (v > content + 4) it.hm = "fixed";
		else it.hm = "cap";
		return done(
			g,
			it.hm === "fit"
				? "height_fit"
				: v === min && h < min
					? "height_min"
					: `height_${it.hm}`,
			{ item: ctx.title(it), h: v }
		);
	});

/** Taller or shorter by 40 px */
export const stepHeight = (
	layout: GridLayout,
	id: string,
	dir: -1 | 1,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const it = layout.items.find((i) => i.id === id);
	const from = !it
		? 0
		: it.hm === "fit"
			? currentHeight(it, ctx)
			: Math.max(it.h, minHeightOf(it));
	return setHeight(layout, id, from + dir * H_STEP, ctx);
};

/** Kept in view (the band at the top) or back on the page */
export const togglePin = (
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		it.pin = !it.pin;
		// in the band it stays put anyway
		if (it.pin) delete it.follow;
		// to the end of the band, or the top of the page
		it.y = it.pin ? END : -1;
		return done(g, it.pin ? "pinned" : "unpinned", {
			item: ctx.title(it),
		});
	});

/**
 * Follows while scrolling (in its columns, with the parts below it) or
 * stays in place; a pinned part comes back to the page to follow
 */
export const toggleFollow = (
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		if (it.follow) delete it.follow;
		else {
			it.follow = true;
			if (it.pin) {
				it.pin = false;
				it.y = -1;
			}
		}
		return done(g, it.follow ? "followed" : "unfollowed", {
			item: ctx.title(it),
		});
	});

/** A tab's name: its element, or the two shown in it */
const tabName = (
	it: GridItem,
	host: ElementId,
	ctx: ILayoutOpsContext
): string => ctx.title({ els: tabEls(it, host), join: it.join });

/**
 * Makes an item of one tab, or an element from Elements that isn't on the
 * page, a tab of another item; two shown in one tab come along together
 */
export const makeTab = (
	layout: GridLayout,
	from: { item: string } | { el: ElementId },
	to: string,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	const target = g.items.find((i) => i.id === to);
	const src =
		"item" in from ? g.items.find((i) => i.id === from.item) : undefined;
	const el = "el" in from ? from.el : src?.els[0];
	if (
		!target ||
		!el ||
		src === target ||
		(src && tabsOf(src).length > 1) ||
		(!src && g.items.some((i) => i.els.includes(el)))
	)
		return done(g, "nothing");
	if (src) g.items = g.items.filter((i) => i !== src);
	target.els.push(...(src ? src.els : [el]));
	if (src?.join) target.join = { ...target.join, ...src.join };
	target.active = el;
	target.w = Math.max(target.w, minCols(target, g, ctx));
	target.x = Math.min(target.x, g.cols - target.w);
	return done(g, "tab", {
		el: src ? ctx.title(src) : ctx.label(el),
		item: ctx.label(target.els[0]),
	});
};

/**
 * Why an element can't join the tab an item shows, or null: only one
 * element joins, and a tab holds two
 */
export function joinBlocked(
	layout: GridLayout,
	els: ElementId[],
	to: string
): string | null {
	const target = layout.items.find((i) => i.id === to);
	if (!target) return null;
	if (els.length > 1) return "plan.layout.why.join_one";
	if (partnerOf(target, target.active)) return "plan.layout.why.join_full";
	return null;
}

/**
 * Shows an element in the tab another item shows, below or beside its
 * element: an item of one element (moved there), or one from Elements
 */
export const joinTab = (
	layout: GridLayout,
	from: { item: string } | { el: ElementId },
	to: string,
	side: JoinSide,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	const target = g.items.find((i) => i.id === to);
	const src =
		"item" in from ? g.items.find((i) => i.id === from.item) : undefined;
	const el = "el" in from ? from.el : src?.els[0];
	if (
		!target ||
		!el ||
		src === target ||
		joinBlocked(g, src ? src.els : [el], to) ||
		(!src && g.items.some((i) => i.els.includes(el)))
	)
		return done(g, "nothing");
	if (src) g.items = g.items.filter((i) => i !== src);
	const host = target.active;
	target.els.splice(target.els.indexOf(host) + 1, 0, el);
	target.join = { ...target.join, [el]: side };
	target.w = Math.max(target.w, minCols(target, g, ctx));
	target.x = Math.min(target.x, g.cols - target.w);
	return done(g, `joined_${side}`, {
		el: ctx.label(el),
		name: ctx.label(host),
	});
};

/** Below or beside: where an element shown with another sits */
export const setSide = (
	layout: GridLayout,
	id: string,
	el: ElementId,
	side: JoinSide,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		if (!it.join?.[el] || it.join[el] === side) return done(g, "nothing");
		it.join[el] = side;
		return done(g, `joined_${side}`, {
			el: ctx.label(el),
			name: ctx.label(hostOf(it, el)),
		});
	});

/** A new item below `it` with these elements (a tab, maybe with its partner) */
const splitOff = (
	g: GridLayout,
	it: GridItem,
	els: ElementId[],
	i: number
): void => {
	const join = Object.fromEntries(
		els.filter((e) => it.join?.[e]).map((e) => [e, it.join![e]])
	);
	g.items.push({
		id: freeItemId(g.items, els[0]),
		els,
		active: els[0],
		x: it.x,
		w: it.w,
		y: it.y + 0.01 * (i + 1),
		hm: "fit",
		h: 0,
		pin: it.pin,
		...(Object.keys(join).length && { join }),
	});
};

/**
 * Takes a tab out into its own item, below, with the element shown with
 * it; or an element shown with another, out of their tab. The first tab
 * stays.
 */
export const takeOut = (
	layout: GridLayout,
	id: string,
	el: ElementId,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		const joined = !!it.join?.[el];
		if (!it.els.includes(el) || (!joined && it.els[0] === el))
			return done(g, "nothing");
		const els = joined ? [el] : tabEls(it, el);
		splitOff(g, it, els, 0);
		if (joined) removeEl(it, el);
		else it.els = it.els.filter((e) => !els.includes(e));
		return done(g, "taken_out", { el: ctx.label(el) });
	});

/**
 * A tab dragged out of its group: its own item where it drops, a tab
 * of another item, or with the tab another item shows
 */
export const takeOutTo = (
	layout: GridLayout,
	id: string,
	el: ElementId,
	to:
		| { x: number; y: number; band: boolean }
		| { tab: string; side?: JoinSide },
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const out = takeOut(layout, id, el, ctx);
	const it = out.layout.items.find((i) => i.id !== id && i.els[0] === el);
	if (!it || ("tab" in to && to.tab === id)) return done(layout, "nothing");
	return "tab" in to
		? to.side
			? joinTab(out.layout, { item: it.id }, to.tab, to.side, ctx)
			: makeTab(out.layout, { item: it.id }, to.tab, ctx)
		: moveTo(out.layout, it.id, to, ctx);
};

/** Every tab its own item, each with the element shown with it */
export const split = (
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		const [first, ...rest] = tabsOf(it);
		rest.forEach((host, i) => splitOff(g, it, tabEls(it, host), i));
		it.els = tabEls(it, first);
		return done(g, "split", { el: ctx.label(first) });
	});

/** Why an element can't be hidden, or null */
export const hideBlocked = (el: ElementId): string | null =>
	ELEMENTS[el].required ? "plan.layout.why.required" : null;

/** Why a tab can't be hidden (its element or the one with it stays), or null */
export const hideTabBlocked = (it: GridItem, el: ElementId): string | null =>
	(it.join?.[el] ? [el] : tabEls(it, el)).map(hideBlocked).find(Boolean) ??
	null;

/**
 * Hides a tab with the element shown with it, or an element shown with
 * another; the item goes when nothing is left
 */
export const hide = (
	layout: GridLayout,
	id: string,
	el: ElementId,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		if (!it.els.includes(el) || hideTabBlocked(it, el))
			return done(g, "nothing");
		const name = it.join?.[el] ? ctx.label(el) : tabName(it, el, ctx);
		const els = it.join?.[el] ? [el] : tabEls(it, el);
		els.forEach((e) => removeEl(it, e));
		if (!it.els.length) g.items = g.items.filter((i) => i !== it);
		return done(g, "hidden", { el: name });
	});

/** Hides an item with all its tabs, unless one of them always stays */
export const hideItem = (
	layout: GridLayout,
	id: string,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		if (it.els.some((el) => hideBlocked(el))) return done(g, "nothing");
		g.items = g.items.filter((i) => i !== it);
		return done(g, "hidden", { el: ctx.title(it) });
	});

/** Adds an element that isn't on the page, at the bottom */
export const add = (
	layout: GridLayout,
	el: ElementId,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	if (g.items.some((i) => i.els.includes(el))) return done(g, "nothing");
	const it: GridItem = {
		id: freeItemId(g.items, el),
		els: [el],
		active: el,
		x: 0,
		w: 1,
		y: END,
		hm: "fit",
		h: 0,
		pin: false,
	};
	it.w = Math.min(
		g.cols,
		Math.max(
			Math.round((ELEMENTS[el].defaultW * g.cols) / 12),
			minCols(it, g, ctx)
		)
	);
	g.items.push(it);
	return done(g, "added", { el: ctx.label(el) });
};

/** Adds an element from Elements where a drag drops it */
export const addAt = (
	layout: GridLayout,
	el: ElementId,
	to: { x: number; y: number; band: boolean },
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const id = freeItemId(layout.items, el);
	const added = add(layout, el, ctx);
	if (!added.layout.items.some((i) => i.id === id)) return added;
	const moved = moveTo(added.layout, id, to, ctx);
	return { ...moved, announcement: added.announcement };
};

/** Columns 4–24; items keep their share of the width */
export const setCols = (
	layout: GridLayout,
	n: number,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	const old = g.cols;
	n = Math.max(COLS_MIN, Math.min(COLS_MAX, Math.round(n)));
	for (const it of g.items) {
		const right = Math.round(((it.x + it.w) * n) / old);
		it.x = Math.min(n - 1, Math.round((it.x * n) / old));
		it.w = Math.max(1, Math.min(n - it.x, right - it.x));
	}
	g.cols = n;
	return done(g, "cols", { n });
};

/** Gap between items */
export const setGap = (
	layout: GridLayout,
	gap: number,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	g.gap = gap;
	return done(g, "gap", { n: gap });
};

/** Everything open (all tiers, fields, buttons) or as usual, for an element */
export const toggleOpen = (
	layout: GridLayout,
	el: ElementId,
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	if (!OPENABLE.includes(el)) return done(g, "nothing");
	const open = g.open ?? [];
	const on = !open.includes(el);
	g.open = on ? [...open, el] : open.filter((e) => e !== el);
	if (!g.open.length) delete g.open;
	return done(g, on ? "open" : "closed", { el: ctx.label(el) });
};

/** Cards or a table, for an element that can be shown as one */
export const setView = (
	layout: GridLayout,
	el: ElementId,
	view: "cards" | "table",
	ctx: ILayoutOpsContext
): ILayoutChange => {
	const g = settle(layout, ctx);
	const table = g.table ?? [];
	if (!TABLE_VIEW.includes(el) || table.includes(el) === (view === "table"))
		return done(g, "nothing");
	g.table = view === "table" ? [...table, el] : table.filter((e) => e !== el);
	if (!g.table.length) delete g.table;
	return done(g, `view_${view}`, { el: ctx.label(el) });
};

/** The tab an item shows */
export const setActive = (
	layout: GridLayout,
	id: string,
	el: ElementId,
	ctx: ILayoutOpsContext
): ILayoutChange =>
	edit(layout, id, ctx, (it, g) => {
		if (it.els.includes(el)) it.active = hostOf(it, el);
		return done(g, "tab_shown", { el: ctx.label(it.active) });
	});
