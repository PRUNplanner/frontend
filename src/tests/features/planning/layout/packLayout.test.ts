import { describe, expect, it } from "vitest";

// Types & Interfaces
import type {
	GridItem,
	GridLayout,
	IPackedItem,
} from "@/features/planning/layout/planLayout.types";

// Util
import {
	isFolded,
	itemHeight,
	packLayout,
} from "@/features/planning/layout/packLayout";
import { minHeightOf, minWidthOf } from "@/features/planning/layout/elements";
import {
	FOLDED_HEIGHT,
	PHONE_WIDTH,
	UNMEASURED_HEIGHT,
} from "@/features/planning/layout/planLayout.constants";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	int,
	prng,
	randomHeights,
	randomLayout,
	stackedLayout,
	wideLayout,
} from "@/tests/features/planning/layout/layout.fixtures";

const item = (o: Partial<GridItem>): GridItem => ({
	id: o.id ?? `i-${o.els?.[0] ?? "production"}`,
	els: ["production"],
	active: o.els?.[0] ?? "production",
	x: 0,
	w: 12,
	y: 0,
	hm: "fit",
	h: 0,
	pin: false,
	...o,
});
const grid = (items: GridItem[], cols = 12, gap = 16): GridLayout =>
	normaliseLayout({ cols, gap, items });

const overlaps = (a: IPackedItem, b: IPackedItem): boolean =>
	a.region === b.region &&
	a.left < b.left + b.width - 0.01 &&
	b.left < a.left + a.width - 0.01 &&
	a.top < b.top + b.height - 0.01 &&
	b.top < a.top + a.height - 0.01;

describe("packLayout", () => {
	it("puts each item on the lowest free spot of its columns", () => {
		const layout = grid([
			item({ id: "a", els: ["empire"], x: 0, w: 4, y: 0 }),
			item({ id: "b", els: ["planet"], x: 4, w: 8, y: 1 }),
			item({ id: "c", els: ["production"], x: 0, w: 12, y: 2 }),
		]);
		const { items, page } = packLayout(layout, 1200, {
			a: 100,
			b: 300,
			c: 50,
		});
		expect(items.a.top).toBe(0);
		expect(items.b.top).toBe(0);
		// below the taller of the two, with the gap
		expect(items.c.top).toBe(316);
		// Production at its 240 px minimum
		expect(page.height).toBe(316 + 240);
		// 12 columns of (1200 - 11 × 16) / 12
		expect(page.colWidth).toBeCloseTo(85.333, 2);
		expect(items.b.left).toBeCloseTo(4 * (85.333 + 16), 1);
		expect(items.b.width).toBeCloseTo(8 * 85.333 + 7 * 16, 1);
	});

	it("packs the kept-in-view band and the page apart", () => {
		const layout = grid([
			item({ id: "k", els: ["kpi-profit"], w: 3, pin: true }),
			item({ id: "p", els: ["production"], w: 12, y: 1 }),
		]);
		const { items, band, page } = packLayout(layout, 1200, {
			k: 80,
			p: 400,
		});
		expect(items.k).toMatchObject({ region: "band", top: 0 });
		expect(items.p).toMatchObject({ region: "page", top: 0 });
		expect(band.height).toBe(80);
		expect(page.height).toBe(400);
	});

	it("packs items of the same order by column", () => {
		const layout: GridLayout = {
			cols: 12,
			gap: 16,
			items: [
				item({ id: "a", els: ["planet"], x: 6, w: 6, y: 1 }),
				item({ id: "c", els: ["empire"], x: 0, w: 12, y: 1 }),
			],
		};
		const { items } = packLayout(layout, 1200);
		// the one in the first column first, whatever order the list has
		expect(items.c.top).toBe(0);
		expect(items.a.top).toBe(196);
	});

	it("has empty regions without items", () => {
		const { band } = packLayout(grid([item({})]), 1200);
		expect(band.height).toBe(0);
	});

	describe("heights", () => {
		const prod = item({ els: ["production"] });

		it("fits the content, never below the minimum", () => {
			expect(itemHeight(prod, 900, false)).toBe(900);
			expect(itemHeight(prod, 100, false)).toBe(240);
		});

		it("fits up to its height and scrolls beyond", () => {
			const cap = { ...prod, hm: "cap" as const, h: 480 };
			expect(itemHeight(cap, 300, false)).toBe(300);
			expect(itemHeight(cap, 900, false)).toBe(480);
			// a cap below the minimum is the minimum
			expect(itemHeight({ ...cap, h: 100 }, 900, false)).toBe(240);
		});

		it("keeps a fixed height whatever the content", () => {
			const fixed = { ...prod, hm: "fixed" as const, h: 480 };
			expect(itemHeight(fixed, 100, false)).toBe(480);
			expect(itemHeight(fixed, 2000, false)).toBe(480);
			expect(itemHeight({ ...fixed, h: 0 }, 2000, false)).toBe(240);
		});

		it("shows a folded item as its title row", () => {
			expect(itemHeight(prod, 900, true)).toBe(FOLDED_HEIGHT);
		});

		it("marks content taller than the box as scrolling", () => {
			const layout = grid([
				item({ id: "a", hm: "cap", h: 300 }),
				item({ id: "b", y: 1, els: ["empire"], hm: "fixed", h: 300 }),
				item({ id: "c", y: 2, els: ["planet"] }),
			]);
			const { items } = packLayout(layout, 1200, {
				a: 900,
				b: 100,
				c: 900,
			});
			expect(items.a.scroll).toBe(true);
			expect(items.b.scroll).toBe(false);
			expect(items.c.scroll).toBe(false);
		});

		it("measures an item it hasn't seen yet as 180 px", () => {
			const { items } = packLayout(
				grid([item({ els: ["empire"] })]),
				1200
			);
			expect(items["i-empire"].content).toBe(UNMEASURED_HEIGHT);
		});
	});

	it("folds by the first element, never a results tile", () => {
		const folded = new Set(["production", "kpi-area"] as const);
		expect(isFolded({ els: ["production", "popr"] }, folded)).toBe(true);
		expect(isFolded({ els: ["popr", "production"] }, folded)).toBe(false);
		expect(isFolded({ els: ["kpi-area"] }, folded)).toBe(false);
	});

	describe("automatic reflow", () => {
		// Production needs 540 px: 3 of 12 columns at 2560, 5 at 1280
		const layout = grid([
			item({ id: "a", els: ["empire"], x: 0, w: 2 }),
			item({ id: "p", els: ["production"], x: 2, w: 3, y: 1 }),
			item({ id: "s", els: ["supply-cart"], x: 5, w: 7, y: 2 }),
		]);

		it("keeps the stored places when every item fits", () => {
			const { items } = packLayout(layout, 2560);
			expect(Object.values(items).some((p) => p.auto)).toBe(false);
			expect(items.p).toMatchObject({ x: 2, w: 3 });
		});

		it("widens items below their minimum and lets the others move up", () => {
			const before = structuredClone(layout);
			const { items } = packLayout(layout, 1280);
			expect(items.p.w).toBeGreaterThanOrEqual(5);
			expect(items.p.width).toBeGreaterThanOrEqual(540);
			expect(items.p.auto).toBe(true);
			for (const a of Object.values(items))
				for (const b of Object.values(items))
					if (a !== b) expect(overlaps(a, b)).toBe(false);
			// the stored layout never changes
			expect(layout).toEqual(before);
		});
	});

	describe("rearranged parts fill free space", () => {
		// what the plan page measured, Wide and Stacked at 1316 px
		const measured: Record<string, number> = {
			"i-production": 1243,
			"i-empire": 238,
			"i-planet": 286,
			"i-workforce": 410,
			"i-housing": 578,
			"i-experts": 558,
			"i-plan-check": 900,
			"i-supply-cart": 700,
			"i-material-io": 800,
			"i-material-io-totals": 126,
		};

		it("keep Material I/O at the top beside Production in Wide", () => {
			// Supply needs 5 of 12 columns here: it goes below Production
			const { items } = packLayout(wideLayout(), 1316, measured);
			expect(items["i-supply-cart"].top).toBeGreaterThan(0);
			// Material I/O takes the free space above it, in its own column
			expect(items["i-material-io"]).toMatchObject({ x: 9, top: 0 });
		});

		it("fill the space under a short column of folded parts", () => {
			// 1132 px (the full sidebar at a 1440 px window): Base parts need 3
			const { items } = packLayout(stackedLayout(), 1132, measured, [
				"empire",
				"planet",
			]);
			const column = items["i-planet"];
			expect(items["i-empire"].x).toBe(column.x);
			// Experts goes up under the short column, not below Workforce
			expect(items["i-experts"].x).toBe(column.x);
			expect(items["i-experts"].top).toBe(
				column.top + column.height + 16
			);
		});

		it("never fill space above parts when the layout fits its width", () => {
			// Standard at 1440: the stored places, the skyline as stored
			const { items } = packLayout(
				presetLayout("standard"),
				1440,
				measured
			);
			expect(Object.values(items).some((p) => p.auto)).toBe(false);
			expect(items["i-material-io-totals"]).toMatchObject({
				x: 9,
				top:
					items["i-material-io"].top +
					items["i-material-io"].height +
					16,
			});
		});
	});

	describe("folded parts side by side", () => {
		// Stacked at 1316 px: Empire 2, Planet 3, Workforce 3, Infrastructure 2,
		// Experts 2 columns in one row, Production full width below
		const layout = stackedLayout();
		const heights = Object.fromEntries(
			layout.items.map((i) => [i.id, i.pin ? 80 : 500])
		);
		const span = (p: IPackedItem) => [p.x, p.w];

		it("stack as one short column; the open parts take the columns", () => {
			const before = structuredClone(layout);
			const { items } = packLayout(layout, 1316, heights, [
				"empire",
				"planet",
			]);
			// the column where Empire was, as wide as the wider of the two
			expect(span(items["i-empire"])).toEqual([0, 3]);
			expect(span(items["i-planet"])).toEqual([0, 3]);
			expect(items["i-empire"].top).toBe(0);
			expect(items["i-planet"].top).toBe(FOLDED_HEIGHT + 16);
			// 2 columns freed: by their widths 3:2:2, the larger remainders first
			expect(span(items["i-workforce"])).toEqual([3, 4]);
			expect(span(items["i-housing"])).toEqual([7, 3]);
			expect(span(items["i-experts"])).toEqual([10, 2]);
			expect(items["i-workforce"].top).toBe(0);
			expect(items["i-workforce"].auto).toBe(true);
			// Production still below the open parts, the layout unchanged
			expect(items["i-production"].top).toBe(516);
			expect(layout).toEqual(before);
		});

		it("leave a row with one folded part as it is", () => {
			const { items } = packLayout(layout, 1316, heights, ["planet"]);
			expect(span(items["i-planet"])).toEqual([2, 3]);
			expect(span(items["i-workforce"])).toEqual([5, 3]);
			expect(items["i-workforce"].auto).toBe(false);
		});

		it("leave a row of only folded parts a row", () => {
			const all = [
				"empire",
				"planet",
				"workforce",
				"housing",
				"experts",
			] as const;
			const { items } = packLayout(layout, 1316, heights, all);
			for (const id of all) expect(items[`i-${id}`].top).toBe(0);
			expect(items["i-production"].top).toBe(FOLDED_HEIGHT + 16);
		});

		it("keep a gap between parts of the row", () => {
			const g = grid([
				item({ id: "a", els: ["empire"], x: 0, w: 2, y: 0 }),
				item({ id: "b", els: ["planet"], x: 2, w: 2, y: 1 }),
				item({ id: "c", els: ["workforce"], x: 6, w: 3, y: 2 }),
				item({ id: "p", els: ["production"], x: 0, w: 12, y: 3 }),
			]);
			const { items } = packLayout(g, 1440, { c: 400 }, [
				"empire",
				"planet",
			]);
			expect(span(items.a)).toEqual([0, 2]);
			expect(items.b.top).toBe(FOLDED_HEIGHT + 16);
			// 2 freed columns to Workforce, the 2-column gap before it kept
			expect(span(items.c)).toEqual([4, 5]);
		});

		it("split a row where a taller part of the row above sits between", () => {
			const g = grid([
				item({ id: "ex", els: ["experts"], x: 0, w: 4, y: 0 }),
				item({ id: "ho", els: ["housing"], x: 4, w: 2, y: 1 }),
				item({
					id: "to",
					els: ["material-io-totals"],
					x: 6,
					w: 6,
					y: 2,
				}),
				item({ id: "em", els: ["empire"], x: 0, w: 2, y: 3 }),
				item({ id: "pl", els: ["planet"], x: 2, w: 2, y: 4 }),
				item({ id: "wf", els: ["workforce"], x: 6, w: 6, y: 5 }),
			]);
			const { items } = packLayout(
				g,
				2560,
				{ ex: 100, ho: 500, to: 100, wf: 300 },
				["empire", "planet"]
			);
			// Infrastructure (500 px) splits the row: Workforce keeps its place
			expect(items.wf).toMatchObject({ x: 6, w: 6, top: 116 });
			expect(items.wf.auto).toBe(false);
			// the folded pair alone in its run stays side by side
			expect(items.pl).toMatchObject({ x: 2, top: 116 });
		});

		it("don't stack on a phone", () => {
			const { items } = packLayout(layout, 390, heights, [
				"empire",
				"planet",
			]);
			expect(items["i-empire"].w).toBe(12);
			expect(items["i-planet"].top).toBeGreaterThan(
				items["i-empire"].top
			);
			expect(items["i-planet"].x).toBe(0);
		});
	});

	describe("on a phone", () => {
		it("stacks in layout order, small items two per row", () => {
			const layout = stackedLayout();
			const { items, phone } = packLayout(layout, 390);
			expect(phone).toBe(true);
			// 390 px: an item fits half when its minimum is at most 187 px,
			// so only nothing pairs at the 190 px Base minimum
			const page = layout.items.filter((i) => !i.pin);
			let last = -1;
			for (const it of page) {
				const p = items[it.id];
				expect(p.top).toBeGreaterThan(last - 0.01);
				last = p.top;
			}
			// the results tiles (150–180 px) pair up
			expect(items["i-kpi-payback"].top).toBe(items["i-kpi-profit"].top);
			expect(items["i-kpi-payback"].x).toBe(6);
			expect(items["i-kpi-workforce"].x).toBe(0);
		});

		it("places the phone arrangement (two columns) as arranged", () => {
			const layout = normaliseLayout(
				{
					cols: 2,
					items: [
						{ id: "a", els: ["production"], x: 0, w: 2, y: 0 },
						{ id: "b", els: ["planet"], x: 1, w: 1, y: 1 },
						{ id: "c", els: ["empire"], x: 0, w: 1, y: 2 },
					],
				},
				"phone"
			);
			const { items, phone } = packLayout(layout, 390);
			expect(phone).toBe(true);
			expect(items.a).toMatchObject({ x: 0, w: 2, auto: false });
			expect(items.b).toMatchObject({ x: 1, w: 1, auto: false });
			// Empire goes up beside Planet: a grid, not a stack
			expect(items.c).toMatchObject({ x: 0, w: 1 });
			expect(items.c.top).toBe(items.b.top);
		});

		it("gives a small part without a small partner the full width", () => {
			// Standard at 700: Empire is followed by Production (full width)
			const { items } = packLayout(presetLayout("standard"), 700);
			expect(items["i-empire"]).toMatchObject({ x: 0, w: 12 });
			// the fifth results tile, alone in its row
			expect(items["i-kpi-storage"]).toMatchObject({ x: 0, w: 12 });
			expect(items["i-kpi-area"].w).toBe(6);
		});

		it("pairs Base parts on a wider phone", () => {
			const { items } = packLayout(stackedLayout(), 700);
			expect(items["i-planet"].top).toBe(items["i-empire"].top);
			expect(items["i-planet"].x).toBe(6);
			expect(items["i-housing"].top).toBe(items["i-workforce"].top);
			// alone in its row, and Production full width below
			expect(items["i-experts"].x).toBe(0);
			expect(items["i-production"].w).toBe(12);
		});
	});

	describe("properties of 1,000 random layouts at random widths", () => {
		const rnd = prng(20261105);
		const cases = Array.from({ length: 1000 }, () => {
			const layout = randomLayout(rnd);
			return {
				layout,
				width: int(rnd, 320, 3840),
				heights: randomHeights(rnd, layout),
				folded: layout.items
					.filter(() => rnd() < 0.2)
					.map((i) => i.els[0]),
			};
		});

		it("never overlaps, keeps items in the grid and at their minimum", () => {
			for (const { layout, width, heights, folded } of cases) {
				const pack = packLayout(layout, width, heights, folded);
				const set = new Set(folded);
				const placed = Object.entries(pack.items);
				expect(placed).toHaveLength(layout.items.length);
				for (const [id, p] of placed) {
					const it = layout.items.find((i) => i.id === id)!;
					expect(p.x).toBeGreaterThanOrEqual(0);
					expect(p.x + p.w).toBeLessThanOrEqual(layout.cols);
					expect(p.left + p.width).toBeLessThanOrEqual(width + 0.01);
					// regions never mix
					expect(p.region).toBe(it.pin ? "band" : "page");
					if (isFolded(it, set)) expect(p.height).toBe(FOLDED_HEIGHT);
					else
						expect(p.height).toBeGreaterThanOrEqual(
							minHeightOf(it)
						);
					// wide enough, unless the screen is narrower than the minimum
					if (minWidthOf(it) <= width && !pack.phone)
						expect(p.width).toBeGreaterThanOrEqual(
							Math.min(width, minWidthOf(it)) - 0.01
						);
				}
				for (let a = 0; a < placed.length; a++)
					for (let b = a + 1; b < placed.length; b++)
						expect(overlaps(placed[a][1], placed[b][1])).toBe(
							false
						);
			}
		});

		it("gives the same output for the same input", () => {
			for (const { layout, width, heights, folded } of cases.slice(
				0,
				200
			))
				expect(packLayout(layout, width, heights, folded)).toEqual(
					packLayout(structuredClone(layout), width, { ...heights }, [
						...folded,
					])
				);
		});

		it("stacks phone widths in layout order", () => {
			for (const { layout, heights } of cases.slice(0, 300)) {
				const width = int(rnd, 320, PHONE_WIDTH - 1);
				const pack = packLayout(layout, width, heights);
				for (const pin of [true, false]) {
					const tops = layout.items
						.filter((i) => i.pin === pin)
						.map((i) => pack.items[i.id].top);
					for (let i = 1; i < tops.length; i++)
						expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1]);
				}
			}
		});

		// the spec's budget is 2 ms; here it takes 0.04 ms (0.25 ms rearranged).
		// CI runs this under coverage, about 8x slower and noisy, so the limit
		// only catches a real slowdown, as in the chain auto-layout test
		it("packs 40 items in well under 10 ms, also under coverage", () => {
			// there are fewer elements than 40: the packer doesn't mind repeats
			const layout: GridLayout = {
				cols: 12,
				gap: 16,
				items: Array.from({ length: 40 }, (_, i) =>
					item({
						id: `x${i}`,
						els: ["empire"],
						x: (i * 3) % 12,
						w: 3,
						y: i,
					})
				),
			};
			packLayout(layout, 1440);
			const start = performance.now();
			for (let i = 0; i < 100; i++) packLayout(layout, 1440);
			expect((performance.now() - start) / 100).toBeLessThan(10);
			// rearranged (800 px: 3 columns are below the minimum), the slower path
			const auto = performance.now();
			for (let i = 0; i < 100; i++) packLayout(layout, 800);
			expect(packLayout(layout, 800).items.x0.auto).toBe(true);
			expect((performance.now() - auto) / 100).toBeLessThan(10);
		});
	});
});
