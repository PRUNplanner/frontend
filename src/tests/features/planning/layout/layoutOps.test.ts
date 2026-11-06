import { describe, expect, it } from "vitest";

// Types & Interfaces
import type {
	ElementId,
	GridLayout,
	ILayoutChange,
} from "@/features/planning/layout/planLayout.types";

// Util
import * as ops from "@/features/planning/layout/layoutOps";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { packLayout } from "@/features/planning/layout/packLayout";
import { PRESET_KEYS, presetLayout } from "@/features/planning/layout/presets";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { GAPS } from "@/features/planning/layout/planLayout.constants";
import {
	ctx,
	int,
	pick,
	prng,
	randomHeights,
	randomLayout,
} from "@/tests/features/planning/layout/layout.fixtures";

const item = (g: GridLayout, el: ElementId) =>
	g.items.find((i) => i.els.includes(el))!;
const ann = (c: ILayoutChange) =>
	c.announcement.key.replace("plan.layout.announce.", "");

// a context that knows where things are on screen
const packed = (
	g: GridLayout,
	width = 1440,
	heights: Record<string, number> = {}
) => ctx(width, { pack: packLayout(g, width, heights) });

describe("layoutOps", () => {
	const today = () => presetLayout("today");

	describe("moving", () => {
		it("moves left and right within the grid", () => {
			const g = today();
			const c = ops.moveX(g, "i-material-io", -1, packed(g));
			expect(item(c.layout, "material-io").x).toBe(8);
			expect(c.announcement).toEqual({
				key: "plan.layout.announce.column",
				params: { item: "material-io", n: 9 },
			});
			// at the edge it stays
			expect(
				item(
					ops.moveX(g, "i-material-io", 1, packed(g)).layout,
					"material-io"
				).x
			).toBe(9);
			expect(
				item(ops.moveX(g, "i-empire", -1, packed(g)).layout, "empire").x
			).toBe(0);
			// and says nothing changed: no undo step
			expect(ann(ops.moveX(g, "i-empire", -1, packed(g)))).toBe(
				"nothing"
			);
		});

		it("moves above the item above and below the one below", () => {
			const g = today();
			const up = ops.moveY(g, "i-planet", -1, packed(g)).layout;
			const order = (l: GridLayout) =>
				l.items.filter((i) => i.x === 0 && !i.pin).map((i) => i.els[0]);
			expect(order(up)).toEqual([
				"planet",
				"empire",
				"workforce",
				"housing",
				"experts",
			]);
			const down = ops.moveY(g, "i-planet", 1, packed(g));
			expect(order(down.layout)).toEqual([
				"empire",
				"workforce",
				"planet",
				"housing",
				"experts",
			]);
			expect(ann(down)).toBe("down");
			// nothing above: nothing changes
			expect(
				order(ops.moveY(g, "i-empire", -1, packed(g)).layout)
			).toEqual(order(g));
		});

		it("moves to a column and an order, also into the band", () => {
			const g = today();
			const p = packLayout(g, 1440);
			// under Production: Material I/O to its columns, below it
			const c = ops.moveTo(
				g,
				"i-material-io",
				{
					x: 2,
					y:
						p.items["i-production"].top +
						p.items["i-production"].height +
						1,
					band: false,
				},
				ctx(1440, { pack: p })
			);
			const io = item(c.layout, "material-io");
			expect(io.x).toBe(2);
			expect(io.y).toBeGreaterThan(item(c.layout, "production").y);
			const band = ops.moveTo(
				g,
				"i-empire",
				{ x: 0, y: 0, band: true },
				packed(g)
			);
			expect(item(band.layout, "empire").pin).toBe(true);
			expect(ann(band)).toBe("moved_band");
		});

		it("keeps the stored width of an item moved where it is too narrow", () => {
			const g = normaliseLayout({
				items: [{ id: "p", els: ["production"], x: 0, w: 2, y: 0 }],
			});
			const c = ops.moveTo(
				g,
				"p",
				{ x: 20, y: 0, band: false },
				ctx(1200)
			);
			// the packing widens it on screen; the layout keeps its 2 columns
			expect(c.layout.items[0]).toMatchObject({ w: 2, x: 10 });
		});
	});

	describe("width", () => {
		it("sets the width, never below the minimum at this width", () => {
			const g = today();
			const c = ops.setWidth(g, "i-production", 9, packed(g));
			expect(item(c.layout, "production").w).toBe(9);
			// 540 px at 1440: 5 columns of 12
			const min = ops.setWidth(g, "i-production", 2, packed(g));
			expect(item(min.layout, "production").w).toBe(5);
			expect(ann(min)).toBe("width_min");
			expect(min.announcement.params).toEqual({
				item: "production+construction-cart+supply-cart+visitation-frequency+repair-analysis+profit-breakdown+plan-check+popr",
				n: 5,
				cols: 12,
			});
			expect(ops.minCols(item(g, "production"), g, { width: 1440 })).toBe(
				5
			);
		});

		it("stops at the right edge, and moves left when the minimum needs it", () => {
			const g = today();
			expect(
				item(
					ops.setWidth(g, "i-material-io", 5, packed(g)).layout,
					"material-io"
				).w
			).toBe(3);
			// narrow screen: Material I/O needs more than the 3 columns left
			const c = ops.setWidth(g, "i-material-io", 1, packed(g, 800));
			const io = item(c.layout, "material-io");
			expect(io.x + io.w).toBeLessThanOrEqual(12);
			expect(io.w).toBe(ops.minCols(io, g, { width: 800 }));
		});

		it("goes full width", () => {
			const g = today();
			const c = ops.fullWidth(g, "i-empire", packed(g));
			expect(item(c.layout, "empire")).toMatchObject({ x: 0, w: 12 });
			expect(ann(c)).toBe("full_width");
		});
	});

	describe("height", () => {
		const g = today();
		const heights = { "i-production": 900, "i-empire": 150 };

		it("switches the mode, starting from the content up to 480 px", () => {
			const cap = ops.setHeightMode(
				g,
				"i-production",
				"cap",
				packed(g, 1440, heights)
			);
			expect(item(cap.layout, "production")).toMatchObject({
				hm: "cap",
				h: 480,
			});
			expect(ann(cap)).toBe("height_cap");
			const small = ops.setHeightMode(
				g,
				"i-empire",
				"fixed",
				packed(g, 1440, heights)
			);
			expect(item(small.layout, "empire")).toMatchObject({
				hm: "fixed",
				h: 152,
			});
			const fit = ops.setHeightMode(
				cap.layout,
				"i-production",
				"fit",
				packed(g)
			);
			expect(item(fit.layout, "production")).toMatchObject({
				hm: "fit",
				h: 480,
			});
			// without a measure: 400
			expect(
				item(
					ops.setHeightMode(g, "i-production", "fixed", ctx()).layout,
					"production"
				).h
			).toBe(400);
		});

		it("is fixed when set taller than the content, 'at most' when shorter", () => {
			const p = packed(g, 1440, heights);
			const tall = ops.setHeight(g, "i-production", 1003, p);
			expect(item(tall.layout, "production")).toMatchObject({
				hm: "fixed",
				h: 1000,
			});
			const short = ops.setHeight(g, "i-production", 480, p);
			expect(item(short.layout, "production")).toMatchObject({
				hm: "cap",
				h: 480,
			});
			expect(short.announcement.params).toEqual({
				item: expect.any(String),
				h: 480,
			});
			// a snap keeps the exact px; snapped to the content it fits again
			expect(
				item(
					ops.setHeight(g, "i-production", 437, p, "height").layout,
					"production"
				).h
			).toBe(437);
			const fit = ops.setHeight(
				short.layout,
				"i-production",
				900,
				p,
				"content"
			);
			expect(item(fit.layout, "production").hm).toBe("fit");
			expect(ann(fit)).toBe("height_fit");
		});

		it("never goes below the minimum or above 4000 px", () => {
			const p = packed(g, 1440, heights);
			const min = ops.setHeight(g, "i-production", 10, p);
			expect(item(min.layout, "production").h).toBe(240);
			expect(ann(min)).toBe("height_min");
			expect(
				item(
					ops.setHeight(g, "i-production", 9999, p).layout,
					"production"
				).h
			).toBe(4000);
		});

		it("steps by 40 px from the height it has now", () => {
			const p = packed(g, 1440, heights);
			const taller = ops.stepHeight(g, "i-production", 1, p);
			expect(item(taller.layout, "production")).toMatchObject({
				hm: "fixed",
				h: 944,
			});
			const shorter = ops.stepHeight(
				taller.layout,
				"i-production",
				-1,
				p
			);
			expect(item(shorter.layout, "production")).toMatchObject({
				hm: "cap",
				h: 904,
			});
			// shorter than the content
			const cap = ops.stepHeight(g, "i-production", -1, p);
			expect(item(cap.layout, "production")).toMatchObject({
				hm: "cap",
				h: 864,
			});
			// unknown: nothing
			expect(ann(ops.stepHeight(g, "nope", 1, p))).toBe("nothing");
		});
	});

	it("keeps an item in view and lets it go again", () => {
		const g = today();
		const pin = ops.togglePin(g, "i-empire", packed(g));
		const e = item(pin.layout, "empire");
		expect(e.pin).toBe(true);
		// at the end of the band
		expect(e.y).toBe(
			Math.max(...pin.layout.items.filter((i) => i.pin).map((i) => i.y))
		);
		expect(ann(pin)).toBe("pinned");
		const back = ops.togglePin(pin.layout, "i-empire", packed(pin.layout));
		expect(item(back.layout, "empire").pin).toBe(false);
		expect(ann(back)).toBe("unpinned");
	});

	describe("tabs", () => {
		it("makes an item of one element a tab of another", () => {
			const g = presetLayout("wide");
			const c = ops.makeTab(
				g,
				{ item: "i-supply-cart" },
				"i-production",
				packed(g)
			);
			const p = item(c.layout, "production");
			expect(p.els.at(-1)).toBe("supply-cart");
			expect(p.active).toBe("supply-cart");
			expect(c.layout.items).toHaveLength(g.items.length - 1);
			expect(c.announcement.params).toEqual({
				el: "supply-cart",
				item: "production",
			});
		});

		it("adds an element from Elements as a tab", () => {
			const g = ops.hide(
				presetLayout("wide"),
				"i-supply-cart",
				"supply-cart",
				ctx()
			).layout;
			const c = ops.makeTab(
				g,
				{ el: "supply-cart" },
				"i-material-io",
				ctx()
			);
			expect(item(c.layout, "material-io").els).toEqual([
				"material-io",
				"supply-cart",
			]);
		});

		it("refuses groups, itself, unknowns and elements already shown", () => {
			const g = today();
			expect(
				ann(ops.makeTab(g, { item: "i-production" }, "i-empire", ctx()))
			).toBe("nothing");
			expect(
				ann(ops.makeTab(g, { item: "i-empire" }, "i-empire", ctx()))
			).toBe("nothing");
			expect(
				ann(ops.makeTab(g, { item: "i-empire" }, "nope", ctx()))
			).toBe("nothing");
			expect(
				ann(ops.makeTab(g, { el: "planet" }, "i-empire", ctx()))
			).toBe("nothing");
		});

		it("takes a tab out below, the first tab stays", () => {
			const g = today();
			const c = ops.takeOut(g, "i-production", "supply-cart", packed(g));
			const s = item(c.layout, "supply-cart");
			expect(s.els).toEqual(["supply-cart"]);
			expect(s).toMatchObject({ x: 2, w: 7, pin: false });
			// right below Production in reading order, before Planet
			expect(s.y).toBeGreaterThan(item(c.layout, "production").y);
			expect(s.y).toBeLessThan(item(c.layout, "planet").y);
			expect(item(c.layout, "production").els).not.toContain(
				"supply-cart"
			);
			expect(
				ann(ops.takeOut(g, "i-production", "production", ctx()))
			).toBe("nothing");
			expect(ann(ops.takeOut(g, "i-production", "empire", ctx()))).toBe(
				"nothing"
			);
		});

		it("drags a tab out to a spot, or onto another item as a tab", () => {
			const g = today();
			const c = ops.takeOutTo(
				g,
				"i-production",
				"supply-cart",
				{ x: 4, y: 0, band: false },
				packed(g)
			);
			expect(item(c.layout, "supply-cart")).toMatchObject({
				els: ["supply-cart"],
				x: 4,
			});
			expect(item(c.layout, "production").els).not.toContain(
				"supply-cart"
			);
			expect(ann(c)).toBe("moved");

			const t = ops.takeOutTo(
				g,
				"i-production",
				"supply-cart",
				{ tab: "i-planet" },
				ctx()
			);
			expect(item(t.layout, "planet").els).toEqual([
				"planet",
				"supply-cart",
			]);
			expect(item(t.layout, "production").els).not.toContain(
				"supply-cart"
			);
			expect(ann(t)).toBe("tab");

			// back onto its own group, or the group's first tab: nothing
			for (const [el, to] of [
				["supply-cart", { tab: "i-production" }],
				["production", { x: 0, y: 0, band: false }],
			] as const)
				expect(
					ann(ops.takeOutTo(g, "i-production", el, to, ctx()))
				).toBe("nothing");
		});

		it("moves the shown tab when it is taken out", () => {
			const g = ops.setActive(
				today(),
				"i-production",
				"popr",
				ctx()
			).layout;
			expect(item(g, "production").active).toBe("popr");
			const c = ops.takeOut(g, "i-production", "popr", ctx());
			expect(item(c.layout, "production").active).toBe("production");
		});

		it("splits every tab into its own item", () => {
			const c = ops.split(today(), "i-production", ctx());
			expect(c.layout.items).toHaveLength(today().items.length + 7);
			expect(new Set(c.layout.items.map((i) => i.id)).size).toBe(
				c.layout.items.length
			);
			expect(ann(c)).toBe("split");
		});

		it("ignores an unknown tab to show", () => {
			const c = ops.setActive(today(), "i-production", "empire", ctx());
			expect(item(c.layout, "production").active).toBe("production");
		});
	});

	describe("hide and add", () => {
		it("hides an item or a tab, never Production", () => {
			const g = today();
			const c = ops.hide(g, "i-empire", "empire", ctx());
			expect(c.layout.items.some((i) => i.els.includes("empire"))).toBe(
				false
			);
			expect(c.announcement).toEqual({
				key: "plan.layout.announce.hidden",
				params: { el: "empire" },
			});
			const tab = ops.hide(g, "i-production", "popr", ctx());
			expect(item(tab.layout, "production").els).not.toContain("popr");
			expect(ann(ops.hide(g, "i-production", "production", ctx()))).toBe(
				"nothing"
			);
			expect(ann(ops.hide(g, "i-production", "empire", ctx()))).toBe(
				"nothing"
			);
			expect(ops.hideBlocked("production")).toBe(
				"plan.layout.why.required"
			);
			expect(ops.hideBlocked("empire")).toBeNull();
		});

		it("moves the shown tab when it is hidden", () => {
			const g = ops.setActive(
				today(),
				"i-production",
				"popr",
				ctx()
			).layout;
			expect(
				item(
					ops.hide(g, "i-production", "popr", ctx()).layout,
					"production"
				).active
			).toBe("production");
		});

		it("adds an element back at the bottom, at its default width", () => {
			const g = ops.hide(
				today(),
				"i-production",
				"supply-cart",
				ctx()
			).layout;
			const c = ops.add(g, "supply-cart", ctx());
			const s = item(c.layout, "supply-cart");
			expect(s).toMatchObject({
				x: 0,
				w: 6,
				y: c.layout.items.length - 1,
			});
			expect(ann(c)).toBe("added");
			expect(ann(ops.add(c.layout, "supply-cart", ctx()))).toBe(
				"nothing"
			);
			// at least its minimum: Production-wide on a narrow screen
			const narrow = ops.add(
				ops.hide(today(), "i-empire", "empire", ctx()).layout,
				"empire",
				ctx(700)
			);
			expect(item(narrow.layout, "empire").w).toBe(4);
		});

		it("adds an element where a drag drops it", () => {
			const g = ops.hide(today(), "i-empire", "empire", ctx()).layout;
			const c = ops.addAt(
				g,
				"empire",
				{ x: 9, y: 0, band: true },
				packed(g)
			);
			expect(item(c.layout, "empire")).toMatchObject({ x: 9, pin: true });
			expect(ann(c)).toBe("added");
			// already there: nothing
			expect(
				ann(
					ops.addAt(
						today(),
						"empire",
						{ x: 0, y: 0, band: false },
						ctx()
					)
				)
			).toBe("nothing");
		});
	});

	describe("grid", () => {
		it("rescales items to new columns, within 4–24", () => {
			const g = today();
			const c = ops.setCols(g, 24, ctx());
			expect(c.layout.cols).toBe(24);
			expect(item(c.layout, "production")).toMatchObject({ x: 4, w: 14 });
			expect(c.announcement).toEqual({
				key: "plan.layout.announce.cols",
				params: { n: 24 },
			});
			expect(ops.setCols(g, 2, ctx()).layout.cols).toBe(4);
			expect(ops.setCols(g, 99, ctx()).layout.cols).toBe(24);
			const four = ops.setCols(g, 4, ctx()).layout;
			for (const it of four.items)
				expect(it.x + it.w).toBeLessThanOrEqual(4);
		});

		it("sets the gap", () => {
			const c = ops.setGap(today(), 8, ctx());
			expect(c.layout.gap).toBe(8);
			expect(c.announcement.params).toEqual({ n: 8 });
		});
	});

	describe("at a rearranged width", () => {
		// 1100 px: Production needs 6 of 12 columns, Base parts 3, so the
		// packing rearranges; Empire fills the space above Production
		const g = normaliseLayout({
			cols: 12,
			gap: 16,
			items: [
				{ id: "ex", els: ["experts"], x: 0, w: 3, y: 0 },
				{ id: "to", els: ["material-io-totals"], x: 3, w: 9, y: 1 },
				{ id: "pr", els: ["production"], x: 0, w: 4, y: 2 },
				{ id: "em", els: ["empire"], x: 0, w: 2, y: 3 },
			],
		});
		const heights = { ex: 100, to: 300, pr: 400, em: 100 };
		const p = packLayout(g, 1100, heights);
		const order = (l: GridLayout) => l.items.map((i) => i.id);

		it("is rearranged so that Empire sits above Production", () => {
			expect(p.items.em.top).toBeLessThan(p.items.pr.top);
		});

		it("keeps the stored order of the other parts on any change", () => {
			const c = ops.setGap(g, 12, ctx(1100, { pack: p }));
			expect(order(c.layout)).toEqual(["ex", "to", "pr", "em"]);
			// at a width that fits, Empire is still below Production
			const wide = packLayout(c.layout, 1920, heights);
			expect(wide.items.em.top).toBeGreaterThan(wide.items.pr.top);
		});

		it("drops a part before the first part at or below the drop", () => {
			// Empire dropped at the top of the columns of Experts
			const c = ops.moveTo(
				g,
				"em",
				{ x: 0, y: 0, band: false },
				ctx(1100, { pack: p })
			);
			expect(order(c.layout)).toEqual(["em", "ex", "to", "pr"]);
			// below everything: at the end
			const end = ops.moveTo(
				g,
				"ex",
				{ x: 0, y: 5000, band: false },
				ctx(1100, { pack: p })
			);
			expect(order(end.layout)).toEqual(["to", "pr", "em", "ex"]);
		});

		it("moves a column the same by key as by a drop there", () => {
			const c = ctx(1100, { pack: p });
			const key = ops.moveX(g, "em", 1, c);
			const drop = ops.moveTo(
				g,
				"em",
				{ x: 1, y: p.items.em.top, band: false },
				c
			);
			expect(key.layout).toEqual(drop.layout);
		});

		it("adds a part where it is dropped", () => {
			const c = ops.addAt(
				g,
				"planet",
				{ x: 0, y: 0, band: false },
				ctx(1100, { pack: p })
			);
			expect(order(c.layout)[0]).toBe("i-planet");
		});
	});

	it("changes nothing for an unknown item", () => {
		const g = today();
		for (const c of [
			ops.moveX(g, "nope", 1, ctx()),
			ops.setWidth(g, "nope", 3, ctx()),
			ops.togglePin(g, "nope", ctx()),
			ops.hide(g, "nope", "empire", ctx()),
		]) {
			expect(c.layout).toEqual(g);
			expect(ann(c)).toBe("nothing");
		}
	});

	describe("200 random ops on random layouts", () => {
		const run = (seed: number) => {
			const rnd = prng(seed);
			let g = randomLayout(rnd);
			const width = int(rnd, 760, 3840);
			for (let n = 0; n < 200; n++) {
				const c = ctx(width, {
					pack: packLayout(g, width, randomHeights(rnd, g)),
				});
				const it = pick(rnd, g.items);
				const el = pick(rnd, it.els);
				const other = pick(rnd, g.items).id;
				const missing = ELEMENT_IDS.filter(
					(e) => !g.items.some((i) => i.els.includes(e))
				);
				const before = structuredClone(g);
				const steps: (() => ILayoutChange)[] = [
					() => ops.moveX(g, it.id, pick(rnd, [-1, 1]), c),
					() => ops.moveY(g, it.id, pick(rnd, [-1, 1] as const), c),
					() =>
						ops.moveTo(
							g,
							it.id,
							{
								x: int(rnd, -2, 26),
								y: int(rnd, 0, 3000),
								band: rnd() < 0.2,
							},
							c
						),
					() => ops.setWidth(g, it.id, int(rnd, 0, 30), c),
					() => ops.fullWidth(g, it.id, c),
					() =>
						ops.setHeightMode(
							g,
							it.id,
							pick(rnd, ["fit", "cap", "fixed"] as const),
							c
						),
					() =>
						ops.setHeight(
							g,
							it.id,
							int(rnd, 0, 5000),
							c,
							pick(rnd, [
								null,
								"bottom",
								"height",
								"content",
							] as const)
						),
					() =>
						ops.stepHeight(
							g,
							it.id,
							pick(rnd, [-1, 1] as const),
							c
						),
					() => ops.togglePin(g, it.id, c),
					() => ops.makeTab(g, { item: it.id }, other, c),
					() => ops.takeOut(g, it.id, el, c),
					() => ops.split(g, it.id, c),
					() => ops.hide(g, it.id, el, c),
					() =>
						missing.length
							? ops.add(g, pick(rnd, missing), c)
							: ops.setGap(g, 12, c),
					() =>
						missing.length
							? ops.addAt(
									g,
									pick(rnd, missing),
									{
										x: int(rnd, 0, 24),
										y: int(rnd, 0, 2000),
										band: rnd() < 0.3,
									},
									c
								)
							: ops.setGap(g, 24, c),
					() => ops.setCols(g, int(rnd, 2, 26), c),
					() => ops.setGap(g, pick(rnd, GAPS), c),
					() => ops.setActive(g, it.id, el, c),
				];
				const next = pick(rnd, steps)().layout;
				// the input is never changed: undo is the previous layout
				expect(g).toEqual(before);
				// always valid: normalising changes nothing
				expect(normaliseLayout(next)).toEqual(next);
				expect(
					next.items.some((i) => i.els.includes("production"))
				).toBe(true);
				g = next;
			}
		};
		it.each([1, 2, 3, 4, 5])("seed %i stays valid", run);
	});

	it.each(PRESET_KEYS)("every op keeps %s valid", (key) => {
		const g = presetLayout(key);
		const c = packed(g);
		for (const it of g.items)
			for (const change of [
				ops.moveX(g, it.id, 1, c),
				ops.moveY(g, it.id, 1, c),
				ops.setWidth(g, it.id, it.w + 1, c),
				ops.stepHeight(g, it.id, 1, c),
				ops.togglePin(g, it.id, c),
				ops.split(g, it.id, c),
				ops.hide(g, it.id, it.els[0], c),
			])
				expect(normaliseLayout(change.layout)).toEqual(change.layout);
	});
});
