// Types & Interfaces
import type {
	IPackedItem,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

/** What a drag snaps to */
export type SnapKind = "bottom" | "height" | "content";

export interface ISnap {
	// height (resize) or top (move) in grid px
	value: number;
	kind: SnapKind | "top";
	// the item lined up with, null for its own content
	ref: string | null;
}

// screen px within which an edge snaps
export const SNAP_TOLERANCE = 16;

const sharesColumns = (o: IPackedItem, x: number, w: number): boolean =>
	o.x < x + w && x < o.x + o.w;

/**
 * Where a bottom edge being dragged snaps: the bottom of an item beside it
 * (no shared columns, so it stays put), the same height as any other item
 * of its region, or its own content height. Within 16 screen px; a tie
 * goes to "bottom of". Alt (`off`) skips it.
 * @author jplacht
 *
 * @param {IPackResult} pack Last packing
 * @param {string} id Item resized
 * @param {number} raw Height the pointer asks for, grid px
 * @param {{ w: number; min: number; zoom: number; off: boolean }} o Its width in columns now, minimum height, page zoom, Alt held
 * @returns {ISnap | null} Snap, or none
 */
export function snapHeightTo(
	pack: IPackResult,
	id: string,
	raw: number,
	o: { w: number; min: number; zoom: number; off: boolean }
): ISnap | null {
	const me = pack.items[id];
	if (!me || o.off) return null;
	const tol = SNAP_TOLERANCE / o.zoom;
	let best: (ISnap & { dist: number }) | null = null;
	const consider = (value: number, kind: SnapKind, ref: string | null) => {
		const dist = Math.abs(value - raw);
		if (value < o.min || dist > tol) return;
		if (
			!best ||
			dist < best.dist - 0.5 ||
			(Math.abs(dist - best.dist) <= 0.5 && kind === "bottom")
		)
			best = { value: Math.round(value), kind, ref, dist };
	};
	consider(me.content, "content", null);
	for (const [rid, q] of Object.entries(pack.items)) {
		if (rid === id || q.region !== me.region) continue;
		if (!sharesColumns(q, me.x, o.w))
			consider(q.top + q.height - me.top, "bottom", rid);
		consider(q.height, "height", rid);
	}
	if (!best) return null;
	const { dist: _dist, ...snap } = best as ISnap & { dist: number };
	return snap;
}

/**
 * Where the top of an item being moved snaps: the top of an item beside
 * where it would land (same region, no shared columns)
 *
 * @param {IPackResult} pack Last packing
 * @param {string | null} id Item moved, null for one from Elements
 * @param {{ x: number; w: number; y: number; region: "band" | "page"; zoom: number; off: boolean }} o Where it would land
 * @returns {ISnap | null} Snap, or none
 */
export function snapTopTo(
	pack: IPackResult,
	id: string | null,
	o: {
		x: number;
		w: number;
		y: number;
		region: "band" | "page";
		zoom: number;
		off: boolean;
	}
): ISnap | null {
	if (o.off) return null;
	const tol = SNAP_TOLERANCE / o.zoom;
	let best: (ISnap & { dist: number }) | null = null;
	for (const [rid, q] of Object.entries(pack.items)) {
		if (rid === id || q.region !== o.region || sharesColumns(q, o.x, o.w))
			continue;
		const dist = Math.abs(q.top - o.y);
		if (dist <= tol && (!best || dist < best.dist))
			best = { value: q.top, kind: "top", ref: rid, dist };
	}
	if (!best) return null;
	const { dist: _dist, ...snap } = best as ISnap & { dist: number };
	return snap;
}
