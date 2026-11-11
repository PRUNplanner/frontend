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
		const s = besideSplit(1200, 12, 16, [4], [300, 200])!;
		expect(s.px[0]).toBeCloseTo(at(4));
		expect(s.px[1]).toBeCloseTo(1200 - at(4));
		expect(s.cols).toEqual([4]);
		expect(s.auto).toBe(false);
		// the first needs 300 px (4 columns), the second 200 (the last 2)
		expect(s.range).toEqual([[4, 9]]);
		expect(besideSplit(1200, 12, 16, [1], [300, 200])!.cols).toEqual([4]);
		expect(besideSplit(1200, 12, 16, [11], [300, 200])!.cols).toEqual([9]);
	});

	it("shares by the minimums when not set, on the nearest columns", () => {
		const s = besideSplit(1200, 12, 16, [undefined], [300, 200])!;
		// 720 px by the minimums: the line where columns 7 and 8 meet
		expect(s.px[0]).toBeCloseTo(at(7));
		expect(s.px[1]).toBeCloseTo(1200 - at(7));
		expect(s.auto).toBe(true);
		expect(s.cols).toEqual([7]);
	});

	it("stacks when narrower than all minimums", () => {
		expect(besideSplit(450, 6, 16, [3], [300, 200])).toBeNull();
		expect(
			besideSplit(1200, 12, 16, [3, 3, 3], [300, 300, 300, 301])
		).toBeNull();
	});

	it("shares by size where no column split fits both", () => {
		// 520 px in 2 columns: the one split leaves the first 252 px
		const s = besideSplit(520, 2, 16, [1], [300, 200])!;
		expect(s.range).toEqual([null]);
		expect(s.cols).toBeNull();
		expect(s.auto).toBe(true);
	});

	it("splits several parts, each line on the columns and in its range", () => {
		const s = besideSplit(1200, 12, 16, [3, 5], [200, 200, 200])!;
		expect(s.cols).toEqual([3, 5]);
		expect(s.px[0]).toBeCloseTo(at(3));
		expect(s.px[1]).toBeCloseTo(at(8) - at(3));
		expect(s.px[2]).toBeCloseTo(1200 - at(8));
		expect(s.px.reduce((a, b) => a + b, 0)).toBeCloseTo(1200);
		// the first part takes 3 to 6 columns, the second 2 to 6, the lines beside held
		expect(s.range).toEqual([
			[3, 6],
			[2, 6],
		]);
	});

	it("holds every part to its minimum, later ones first", () => {
		// too much asked of the first: the others keep their 200 px (2 and 3 columns)
		expect(
			besideSplit(1200, 12, 16, [10, 1], [200, 200, 200])!.cols
		).toEqual([7, 2]);
		// shared: by the minimums, a column line near each split
		const auto = besideSplit(
			1200,
			12,
			16,
			[undefined, undefined],
			[200, 200, 200]
		)!;
		expect(auto.auto).toBe(true);
		expect(auto.px[0]).toBeCloseTo(at(4));
		expect(auto.px[1]).toBeCloseTo(at(8) - at(4));
		expect(auto.px[2]).toBeCloseTo(1200 - at(8));
		expect(auto.cols).toEqual([4, 4]);
	});
});
