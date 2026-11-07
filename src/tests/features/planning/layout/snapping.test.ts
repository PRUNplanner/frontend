import { describe, expect, it } from "vitest";

// Types & Interfaces
import type {
	IPackedItem,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";

// Util
import { snapHeightTo, snapTopTo } from "@/features/planning/layout/snapping";

const box = (o: Partial<IPackedItem>): IPackedItem => ({
	left: 0,
	top: 0,
	width: 100,
	height: 200,
	content: 300,
	x: 0,
	w: 3,
	region: "page",
	auto: false,
	scroll: false,
	...o,
});
const pack = (items: Record<string, IPackedItem>): IPackResult => ({
	items,
	band: { height: 0, colWidth: 80 },
	page: { height: 1000, colWidth: 80 },
	phone: false,
});
const opts = { w: 3, min: 64, zoom: 1, off: false };

describe("snapHeightTo", () => {
	// me at the left, a neighbour to its right, one below it in its columns
	const p = pack({
		me: box({ top: 100, height: 200, content: 420 }),
		side: box({ x: 3, top: 0, height: 500 }),
		below: box({ top: 316, height: 260 }),
		band: box({ x: 6, region: "band", height: 333 }),
	});

	it("snaps to the bottom of an item beside it", () => {
		// side's bottom is at 500: a height of 400 from my top at 100
		expect(snapHeightTo(p, "me", 395, opts)).toEqual({
			value: 400,
			kind: "bottom",
			ref: "side",
		});
	});

	it("snaps to the height of any item of its region", () => {
		expect(snapHeightTo(p, "me", 268, opts)).toEqual({
			value: 260,
			kind: "height",
			ref: "below",
		});
		// the band's item isn't in my region
		expect(snapHeightTo(p, "me", 333, opts)).toBeNull();
	});

	it("snaps to its own content", () => {
		expect(snapHeightTo(p, "me", 430, opts)).toEqual({
			value: 420,
			kind: "content",
			ref: null,
		});
	});

	it("prefers 'bottom of' on a tie", () => {
		// side: bottom 500 → 400 from my top; another item 400 high
		const tie = pack({
			...p.items,
			tall: box({ x: 9, top: 600, height: 400 }),
		});
		expect(snapHeightTo(tie, "me", 400, opts)?.kind).toBe("bottom");
	});

	it("doesn't snap to a bottom in its own columns", () => {
		// below shares my columns: its bottom (576) is no candidate
		expect(snapHeightTo(p, "me", 476, opts)).toBeNull();
	});

	it("keeps the tolerance at 16 screen px whatever the zoom", () => {
		expect(snapHeightTo(p, "me", 380, opts)).toBeNull();
		// at 50 % a grid px is half a screen px: 32 grid px reach
		expect(snapHeightTo(p, "me", 370, { ...opts, zoom: 0.5 })?.value).toBe(
			400
		);
		expect(snapHeightTo(p, "me", 390, { ...opts, zoom: 2 })).toBeNull();
	});

	it("ignores snaps below the minimum and with Alt", () => {
		expect(snapHeightTo(p, "me", 262, { ...opts, min: 300 })).toBeNull();
		expect(snapHeightTo(p, "me", 400, { ...opts, off: true })).toBeNull();
		expect(snapHeightTo(p, "gone", 400, opts)).toBeNull();
	});
});

describe("snapTopTo", () => {
	const p = pack({
		a: box({ x: 0, top: 0 }),
		b: box({ x: 6, top: 240 }),
		c: box({ x: 9, top: 250 }),
	});
	const o = {
		x: 3,
		w: 3,
		y: 236,
		region: "page" as const,
		zoom: 1,
		off: false,
	};

	it("lines the top up with the nearest item beside it", () => {
		expect(snapTopTo(p, null, o)).toEqual({
			value: 240,
			kind: "top",
			ref: "b",
		});
	});

	it("skips items in its columns, itself and other regions", () => {
		expect(snapTopTo(p, null, { ...o, x: 6, w: 6 })).toBeNull();
		expect(snapTopTo(p, "b", o)?.ref).toBe("c");
		expect(snapTopTo(p, null, { ...o, region: "band" })).toBeNull();
	});

	it("is off with Alt and out of reach", () => {
		expect(snapTopTo(p, null, { ...o, off: true })).toBeNull();
		expect(snapTopTo(p, null, { ...o, y: 100 })).toBeNull();
	});
});
