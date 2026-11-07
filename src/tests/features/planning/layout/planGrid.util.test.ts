import { describe, expect, it } from "vitest";

// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";

// Util
import {
	besideSplit,
	followStacks,
} from "@/features/planning/layout/planGrid.util";
import { packLayout } from "@/features/planning/layout/packLayout";

/** An item of fixed height, so the packing is easy to follow */
const item = (
	el: ElementId,
	x: number,
	w: number,
	y: number,
	h: number,
	follow = false
): GridItem => ({
	id: `i-${el}`,
	els: [el],
	active: el,
	x,
	w,
	y,
	hm: "fixed",
	h,
	pin: false,
	...(follow && { follow: true }),
});

const stacks = (items: GridItem[], width = 1440) => {
	const g: GridLayout = { cols: 12, gap: 16, items };
	return followStacks(items, packLayout(g, width), 16);
};

describe("followStacks", () => {
	it("slides a following part with the parts below it in its columns, down to the page's end", () => {
		const out = stacks([
			item("planet", 0, 8, 0, 1000),
			item("material-io", 8, 4, 0, 300, true),
			item("material-io-totals", 8, 4, 1, 200),
		]);
		// the stack ends at 300 + 16 + 200 = 516 px, the page at 1000 px
		expect(Object.fromEntries(out)).toEqual({
			"i-material-io": { offset: 0, slide: 484 },
			"i-material-io-totals": { offset: 316, slide: 484 },
		});
	});

	it("stops above the first part below that reaches beyond its columns", () => {
		const out = stacks([
			item("planet", 4, 4, 0, 700),
			item("material-io", 8, 4, 1, 300, true),
			// columns 4–11: packed below Planet, at 716 px
			item("experts", 4, 8, 2, 100),
		]);
		// may slide to 716 − 16 = 700 px: 400 px
		expect(out.get("i-material-io")).toEqual({ offset: 0, slide: 400 });
		expect(out.has("i-experts")).toBe(false);
	});

	it("leaves a stack without room, parts that don't follow, and phones alone", () => {
		expect(
			stacks([
				item("material-io", 8, 4, 0, 300, true),
				item("experts", 0, 12, 1, 100),
			]).size
		).toBe(0);
		expect(stacks([item("planet", 0, 8, 0, 1000)]).size).toBe(0);
		expect(
			stacks(
				[
					item("planet", 0, 8, 0, 1000),
					item("material-io", 8, 4, 0, 300, true),
				],
				600
			).size
		).toBe(0);
	});
});

describe("besideSplit", () => {
	// 1200 px over 12 columns with a 16 px gap: columns of 85.33 px
	const col = (1200 - 11 * 16) / 12;
	const at = (n: number) => n * col + (n - 1) * 16 + 8;

	it("splits where the columns meet, held to both minimums", () => {
		const s = besideSplit(1200, 12, 16, 4, 300, 200)!;
		expect(s.px).toBeCloseTo(at(4));
		expect(s.cols).toBe(4);
		expect(s.auto).toBe(false);
		// the first needs 300 px (4 columns), the second 200 (the last 2)
		expect(s.range).toEqual([4, 9]);
		expect(besideSplit(1200, 12, 16, 1, 300, 200)!.cols).toBe(4);
		expect(besideSplit(1200, 12, 16, 11, 300, 200)!.cols).toBe(9);
	});

	it("shares by the minimums when not set, naming the nearest columns", () => {
		const s = besideSplit(1200, 12, 16, undefined, 300, 200)!;
		expect(s.px).toBe(720);
		expect(s.auto).toBe(true);
		expect(s.cols).toBe(7);
	});

	it("stacks when narrower than both minimums", () => {
		expect(besideSplit(450, 6, 16, 3, 300, 200)).toBeNull();
	});

	it("shares by size where no column split fits both", () => {
		// 520 px in 2 columns: the one split leaves the first 252 px
		const s = besideSplit(520, 2, 16, 1, 300, 200)!;
		expect(s.range).toBeNull();
		expect(s.cols).toBeNull();
		expect(s.auto).toBe(true);
	});
});
