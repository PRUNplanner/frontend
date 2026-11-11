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
import {
	ELEMENT_IDS,
	ELEMENTS,
	minHeightOf,
} from "@/features/planning/layout/elements";
import { partsOf, tabsOf } from "@/features/planning/layout/tabs";
import { GAPS } from "@/features/planning/layout/planLayout.constants";
import {
	ctx,
	int,
	pick,
	prng,
	randomHeights,
	randomLayout,
	wideLayout,
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
	const today = () => presetLayout("standard");

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
			const c = ops.setWidth(g, "i-production", 6, packed(g));
			expect(item(c.layout, "production").w).toBe(6);
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

		// Production 2–7, Material I/O and its totals 7–12, Base 0–2
		const roomy = () => {
			const g = today();
			item(g, "production").w = 5;
			for (const el of ["material-io", "material-io-totals"] as const)
				Object.assign(item(g, el), { x: 7, w: 5 });
			return g;
		};

		it("takes columns from the parts beside it, stopping at their minimum", () => {
			const g = roomy();
			const c = ops.setWidth(g, "i-production", 6, packed(g));
			expect(item(c.layout, "production")).toMatchObject({ x: 2, w: 6 });
			// both are beside it, and nothing moves below
			expect(item(c.layout, "material-io")).toMatchObject({ x: 8, w: 4 });
			expect(item(c.layout, "material-io-totals")).toMatchObject({
				x: 8,
				w: 4,
			});
			expect(ann(c)).toBe("width");
			// Material I/O needs 3 columns: Production stops at 7
			const far = ops.setWidth(g, "i-production", 10, packed(g));
			expect(item(far.layout, "production").w).toBe(7);
			expect(item(far.layout, "material-io")).toMatchObject({
				x: 9,
				w: 3,
			});
			expect(ann(far)).toBe("width_neighbour");
			expect(far.announcement.params).toMatchObject({
				n: 7,
				name: "material-io",
			});
			expect(
				ops.edgeRoom(g, "i-production", "right", packed(g))
			).toMatchObject({ edge: 9, by: { id: "i-material-io" } });
			// with nothing beside it, to the grid's edge
			expect(
				ops.edgeRoom(g, "i-material-io", "right", packed(g))
			).toEqual({ edge: 12, by: null });
			expect(ops.edgeRoom(g, "nope", "left", packed(g))).toEqual({
				edge: 0,
				by: null,
			});
		});

		it("never squeezes without knowing where things are", () => {
			const g = roomy();
			const c = ops.setWidth(g, "i-production", 6, ctx());
			expect(item(c.layout, "material-io")).toMatchObject({ x: 7, w: 5 });
		});

		it("moves the left edge, the right one stays", () => {
			const g = roomy();
			// Base's parts are at their minimum of 2 columns
			const blocked = ops.setLeft(g, "i-production", 0, packed(g));
			expect(item(blocked.layout, "production")).toMatchObject({
				x: 2,
				w: 5,
			});
			expect(ann(blocked)).toBe("width_neighbour");
			const h = today();
			for (const el of ["empire", "planet"] as const) item(h, el).w = 3;
			Object.assign(item(h, "production"), { x: 3, w: 6 });
			const c = ops.setLeft(h, "i-production", 2, packed(h));
			expect(item(c.layout, "production")).toMatchObject({ x: 2, w: 7 });
			expect(item(c.layout, "empire").w).toBe(2);
			expect(item(c.layout, "planet").w).toBe(2);
			// narrower from the left: never below its 5 columns
			const min = ops.setLeft(
				c.layout,
				"i-production",
				6,
				packed(c.layout)
			);
			expect(item(min.layout, "production")).toMatchObject({
				x: 4,
				w: 5,
			});
			expect(ann(min)).toBe("width_min");
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

		it("keeps a height set by hand: fixed, also below the content; 'at most' stays 'at most'", () => {
			const p = packed(g, 1440, heights);
			const tall = ops.setHeight(g, "i-production", 1003, p);
			expect(item(tall.layout, "production")).toMatchObject({
				hm: "fixed",
				h: 1000,
			});
			// shorter than the content: still exactly that height, scrolling
			const short = ops.setHeight(g, "i-production", 480, p);
			expect(item(short.layout, "production")).toMatchObject({
				hm: "fixed",
				h: 480,
			});
			expect(short.announcement.params).toEqual({
				item: expect.any(String),
				h: 480,
			});
			// set to "at most" in the menu: a drag changes its limit only
			const capped = ops.setHeightMode(
				g,
				"i-production",
				"cap",
				p
			).layout;
			for (const h of [304, 1504])
				expect(
					item(
						ops.setHeight(capped, "i-production", h, p).layout,
						"production"
					)
				).toMatchObject({ hm: "cap", h });
			// and the packed height is the set one, however short the content
			const fixed = short.layout;
			expect(
				packLayout(fixed, 1440, { "i-production": 120 }).items[
					"i-production"
				].height
			).toBe(480);
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
				hm: "fixed",
				h: 904,
			});
			// shorter than the content: fixed too
			const below = ops.stepHeight(g, "i-production", -1, p);
			expect(item(below.layout, "production")).toMatchObject({
				hm: "fixed",
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
			const g = wideLayout();
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
				wideLayout(),
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

		it("follows while scrolling, and never together with pinned", () => {
			const g = today();
			const on = ops.toggleFollow(g, "i-material-io", ctx());
			expect(item(on.layout, "material-io").follow).toBe(true);
			expect(ann(on)).toBe("followed");
			const off = ops.toggleFollow(on.layout, "i-material-io", ctx());
			expect(item(off.layout, "material-io").follow).toBeUndefined();
			expect(ann(off)).toBe("unfollowed");
			// a pinned results tile comes back to the page to follow
			const tile = ops.toggleFollow(g, "i-kpi-profit", ctx());
			expect(item(tile.layout, "kpi-profit")).toMatchObject({
				pin: false,
				follow: true,
			});
			// pinning, or a drop into the band, ends following
			expect(
				item(
					ops.togglePin(on.layout, "i-material-io", ctx()).layout,
					"material-io"
				).follow
			).toBeUndefined();
			expect(
				item(
					ops.moveTo(
						on.layout,
						"i-material-io",
						{ x: 0, y: 0, band: true },
						ctx()
					).layout,
					"material-io"
				).follow
			).toBeUndefined();
		});

		it("shows an element as a table or as cards", () => {
			const g = today();
			const tbl = ops.setView(g, "workforce", "table", ctx());
			expect(tbl.layout.table).toEqual(["workforce"]);
			expect(ann(tbl)).toBe("view_table");
			// already so, or an element without a table: nothing
			expect(
				ann(ops.setView(tbl.layout, "workforce", "table", ctx()))
			).toBe("nothing");
			expect(ann(ops.setView(g, "experts", "table", ctx()))).toBe(
				"nothing"
			);
			const cards = ops.setView(tbl.layout, "workforce", "cards", ctx());
			expect(cards.layout.table).toBeUndefined();
			expect(ann(cards)).toBe("view_cards");
		});

		it("opens an element that hides parts, and closes it again", () => {
			const g = today();
			const on = ops.toggleOpen(g, "workforce", ctx());
			expect(on.layout.open).toEqual(["workforce"]);
			expect(ann(on)).toBe("open");
			const off = ops.toggleOpen(on.layout, "workforce", ctx());
			expect(off.layout.open).toBeUndefined();
			expect(ann(off)).toBe("closed");
			expect(ann(ops.toggleOpen(g, "production", ctx()))).toBe("nothing");
			// kept by the other ops
			expect(
				ops.moveX(on.layout, "i-planet", 1, ctx()).layout.open
			).toEqual(["workforce"]);
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

	describe("two parts in one tab", () => {
		// Material I/O with its totals below, in one item
		const paired = () =>
			ops.joinTab(
				today(),
				{ item: "i-material-io-totals" },
				"i-material-io",
				"below",
				packed(today())
			);

		it("sizes the two: columns beside, px below, auto again; kept to the item", () => {
			// below: the first part's height, at least its minimum, 64–4000
			const c = paired();
			const h = ops.setJoinSize(
				c.layout,
				"i-material-io",
				"material-io-totals",
				300,
				ctx()
			);
			expect(item(h.layout, "material-io").joinSize).toEqual({
				"material-io-totals": 300,
			});
			expect(ann(h)).toBe("share_height");
			expect(h.announcement.params).toMatchObject({
				name: "material-io",
				h: 300,
			});
			const low = ops.setJoinSize(
				c.layout,
				"i-material-io",
				"material-io-totals",
				1,
				ctx()
			);
			expect(
				item(low.layout, "material-io").joinSize!["material-io-totals"]
			).toBe(Math.max(64, ELEMENTS["material-io"].minH));
			// the same again changes nothing
			expect(
				ann(
					ops.setJoinSize(
						h.layout,
						"i-material-io",
						"material-io-totals",
						300,
						ctx()
					)
				)
			).toBe("nothing");
			// beside: columns of the first, 1 to w − 1
			const side = ops.setSide(
				h.layout,
				"i-material-io",
				"material-io-totals",
				"beside",
				ctx()
			);
			// a px size means nothing beside: gone with the switch
			expect(item(side.layout, "material-io").joinSize).toBeUndefined();
			const w = item(side.layout, "material-io").w;
			const cols = ops.setJoinSize(
				side.layout,
				"i-material-io",
				"material-io-totals",
				99,
				ctx()
			);
			expect(
				item(cols.layout, "material-io").joinSize!["material-io-totals"]
			).toBe(w - 1);
			expect(ann(cols)).toBe("share_cols");
			// narrower: the columns follow
			const narrow = ops.setWidth(cols.layout, "i-material-io", 2, ctx());
			expect(
				item(narrow.layout, "material-io").joinSize?.[
					"material-io-totals"
				] ?? 1
			).toBeLessThanOrEqual(item(narrow.layout, "material-io").w - 1);
			// auto again
			const auto = ops.setJoinSize(
				cols.layout,
				"i-material-io",
				"material-io-totals",
				null,
				ctx()
			);
			expect(item(auto.layout, "material-io").joinSize).toBeUndefined();
			expect(ann(auto)).toBe("share_auto");
			// not a joined element: nothing
			expect(
				ann(
					ops.setJoinSize(
						auto.layout,
						"i-material-io",
						"material-io",
						2,
						ctx()
					)
				)
			).toBe("nothing");
		});

		it("drops the size with the join, keeps it when the tab is split off", () => {
			const c = ops.setJoinSize(
				paired().layout,
				"i-material-io",
				"material-io-totals",
				300,
				ctx()
			);
			const out = ops.takeOut(
				c.layout,
				"i-material-io",
				"material-io-totals",
				ctx()
			);
			expect(item(out.layout, "material-io").joinSize).toBeUndefined();
		});

		it("puts an item of one element below or beside the tab another shows", () => {
			const c = paired();
			const io = item(c.layout, "material-io");
			expect(io.els).toEqual(["material-io", "material-io-totals"]);
			expect(io.join).toEqual({ "material-io-totals": "below" });
			expect(io.active).toBe("material-io");
			expect(c.layout.items).toHaveLength(today().items.length - 1);
			expect(ann(c)).toBe("joined_below");
			expect(c.announcement.params).toEqual({
				el: "material-io-totals",
				name: "material-io",
			});
			// in a group: right after the tab shown, which stays shown
			const g = today();
			const p = ops.setActive(g, "i-production", "supply-cart", ctx());
			const b = ops.joinTab(
				p.layout,
				{ item: "i-experts" },
				"i-production",
				"beside",
				ctx()
			).layout;
			const prod = item(b, "production");
			expect(prod.els.indexOf("experts")).toBe(
				prod.els.indexOf("supply-cart") + 1
			);
			expect(prod.join).toEqual({ experts: "beside" });
			expect(prod.active).toBe("supply-cart");
			expect(tabsOf(prod)).not.toContain("experts");
		});

		it("adds an element from Elements next to a tab", () => {
			const g = ops.hide(today(), "i-experts", "experts", ctx()).layout;
			const c = ops.joinTab(
				g,
				{ el: "experts" },
				"i-workforce",
				"beside",
				ctx()
			);
			expect(item(c.layout, "workforce").join).toEqual({
				experts: "beside",
			});
			// not one already on the page
			expect(
				ann(
					ops.joinTab(
						today(),
						{ el: "planet" },
						"i-workforce",
						"below",
						ctx()
					)
				)
			).toBe("nothing");
		});

		it("takes more only on its side, joined one at a time; says why not", () => {
			const g = paired().layout;
			expect(ops.joinBlocked(g, ["planet"], "i-material-io")).toBeNull();
			expect(
				ops.joinBlocked(g, ["planet"], "i-material-io", "below")
			).toBeNull();
			expect(
				ops.joinBlocked(g, ["planet"], "i-material-io", "beside")
			).toBe("plan.layout.why.join_side");
			expect(
				ann(
					ops.joinTab(
						g,
						{ item: "i-planet" },
						"i-material-io",
						"beside",
						ctx()
					)
				)
			).toBe("nothing");
			// a pair, or a group, joins nothing
			expect(
				ops.joinBlocked(
					g,
					["material-io", "material-io-totals"],
					"i-planet"
				)
			).toBe("plan.layout.why.join_one");
			expect(
				ann(
					ops.joinTab(
						g,
						{ item: "i-material-io" },
						"i-planet",
						"below",
						ctx()
					)
				)
			).toBe("nothing");
			expect(ops.joinBlocked(g, ["planet"], "i-empire")).toBeNull();
		});

		it("switches below and beside", () => {
			const g = paired().layout;
			const c = ops.setSide(
				g,
				"i-material-io",
				"material-io-totals",
				"beside",
				ctx()
			);
			expect(item(c.layout, "material-io").join).toEqual({
				"material-io-totals": "beside",
			});
			expect(ann(c)).toBe("joined_beside");
			expect(
				ann(
					ops.setSide(
						c.layout,
						"i-material-io",
						"material-io-totals",
						"beside",
						ctx()
					)
				)
			).toBe("nothing");
			expect(
				ann(
					ops.setSide(
						g,
						"i-material-io",
						"material-io",
						"beside",
						ctx()
					)
				)
			).toBe("nothing");
		});

		it("takes the one shown with another out; a tab goes with its partner", () => {
			const g = paired().layout;
			const out = ops.takeOut(
				g,
				"i-material-io",
				"material-io-totals",
				ctx()
			);
			expect(item(out.layout, "material-io").els).toEqual([
				"material-io",
			]);
			expect(item(out.layout, "material-io").join).toBeUndefined();
			expect(item(out.layout, "material-io-totals").els).toEqual([
				"material-io-totals",
			]);
			// Material I/O and its totals as a tab of Production, then out again
			const grouped = ops.makeTab(
				g,
				{ item: "i-material-io" },
				"i-production",
				ctx()
			).layout;
			const prod = item(grouped, "production");
			expect(prod.join).toEqual({ "material-io-totals": "below" });
			expect(prod.active).toBe("material-io");
			const back = ops.takeOut(
				grouped,
				prod.id,
				"material-io",
				ctx()
			).layout;
			const io = item(back, "material-io");
			expect(io.els).toEqual(["material-io", "material-io-totals"]);
			expect(io.join).toEqual({ "material-io-totals": "below" });
			expect(item(back, "production").join).toBeUndefined();
			// split keeps each pair together
			const split = ops.split(grouped, prod.id, ctx()).layout;
			expect(item(split, "material-io-totals").id).toBe(
				item(split, "material-io").id
			);
		});

		it("drags a tab out of a group next to the tab another item shows", () => {
			const g = today();
			const c = ops.takeOutTo(
				g,
				"i-production",
				"supply-cart",
				{ tab: "i-planet", side: "beside" },
				ctx()
			);
			expect(item(c.layout, "planet").join).toEqual({
				"supply-cart": "beside",
			});
			expect(item(c.layout, "production").els).not.toContain(
				"supply-cart"
			);
		});

		it("hides a tab with the one shown with it, or only that one", () => {
			const g = paired().layout;
			const one = ops.hide(
				g,
				"i-material-io",
				"material-io-totals",
				ctx()
			);
			expect(item(one.layout, "material-io").els).toEqual([
				"material-io",
			]);
			expect(one.announcement.params).toEqual({
				el: "material-io-totals",
			});
			const both = ops.hide(g, "i-material-io", "material-io", ctx());
			expect(
				both.layout.items.some((i) =>
					i.els.includes("material-io-totals")
				)
			).toBe(false);
			expect(both.announcement.params).toEqual({
				el: "material-io+material-io-totals",
			});
			// a tab whose partner always stays: neither goes
			const withProd = ops.joinTab(
				today(),
				{ item: "i-experts" },
				"i-production",
				"below",
				ctx()
			).layout;
			const prod = item(withProd, "production");
			expect(ops.hideTabBlocked(prod, "production")).toBe(
				"plan.layout.why.required"
			);
			expect(ops.hideTabBlocked(prod, "experts")).toBeNull();
			// Production always stays, so its tab does with what is shown with it
			const gone = ops.hide(
				ops.joinTab(
					today(),
					{ item: "i-experts" },
					"i-production",
					"beside",
					ctx()
				).layout,
				"i-production",
				"production",
				ctx()
			);
			expect(ann(gone)).toBe("nothing");
		});

		it("needs the height of two below each other", () => {
			const g = paired().layout;
			const io = item(g, "material-io");
			expect(minHeightOf(io)).toBe(
				ELEMENTS["material-io"].minH +
					ELEMENTS["material-io-totals"].minH
			);
			const beside = ops.setSide(
				g,
				io.id,
				"material-io-totals",
				"beside",
				ctx()
			).layout;
			expect(minHeightOf(item(beside, "material-io"))).toBe(
				Math.max(
					ELEMENTS["material-io"].minH,
					ELEMENTS["material-io-totals"].minH
				)
			);
		});
	});

	describe("several parts in one tab", () => {
		// Material I/O, its totals and Planet below each other, in one item
		const three = () => {
			const g = today();
			const a = ops.joinTab(
				g,
				{ item: "i-material-io-totals" },
				"i-material-io",
				"below",
				packed(g)
			).layout;
			return ops.joinTab(
				a,
				{ item: "i-planet" },
				"i-material-io",
				"below",
				packed(a)
			).layout;
		};

		it("joins any number on one side, last by default", () => {
			const g = three();
			const io = item(g, "material-io");
			expect(io.els.slice(0, 3)).toEqual([
				"material-io",
				"material-io-totals",
				"planet",
			]);
			expect(io.join).toEqual({
				"material-io-totals": "below",
				planet: "below",
			});
			expect(tabsOf(io)).toEqual(["material-io"]);
			expect(minHeightOf(io)).toBe(
				ELEMENTS["material-io"].minH +
					ELEMENTS["material-io-totals"].minH +
					ELEMENTS.planet.minH
			);
			// a fourth, on the same side; the other is blocked
			const four = ops.joinTab(
				g,
				{ item: "i-empire" },
				"i-material-io",
				"below",
				ctx()
			);
			expect(partsOf(item(four.layout, "empire"), "material-io")).toEqual(
				["material-io-totals", "planet", "empire"]
			);
		});

		it("drops a part at a place among them; at 0 it becomes the tab's own", () => {
			const g = three();
			const mid = ops.joinTab(
				g,
				{ item: "i-empire" },
				"i-material-io",
				"below",
				ctx(),
				1
			).layout;
			expect(item(mid, "empire").els.slice(0, 4)).toEqual([
				"material-io",
				"empire",
				"material-io-totals",
				"planet",
			]);
			const first = ops.joinTab(
				g,
				{ item: "i-empire" },
				"i-material-io",
				"below",
				ctx(),
				0
			).layout;
			const io = item(first, "empire");
			expect(io.els.slice(0, 4)).toEqual([
				"empire",
				"material-io",
				"material-io-totals",
				"planet",
			]);
			expect(io.join).toEqual({
				"material-io": "below",
				"material-io-totals": "below",
				planet: "below",
			});
			expect(io.active).toBe("empire");
		});

		it("moves a part within its tab, each part keeping its height", () => {
			const g = ops.setJoinSize(
				three(),
				"i-material-io",
				"material-io-totals",
				320,
				ctx()
			).layout;
			// Material I/O (320 px) goes last
			const c = ops.moveInTab(
				g,
				"i-material-io",
				"material-io",
				3,
				ctx()
			);
			expect(ann(c)).toBe("moved_in_tab");
			const io = item(c.layout, "material-io");
			expect(io.els.slice(0, 3)).toEqual([
				"material-io-totals",
				"planet",
				"material-io",
			]);
			expect(io.join).toEqual({
				planet: "below",
				"material-io": "below",
			});
			expect(io.active).toBe("material-io-totals");
			// the last part's height has no line after it: dropped
			expect(io.joinSize).toBeUndefined();
			// the totals (300 px) after Planet: their height on the line after them
			const back = ops.moveInTab(
				ops.setJoinSize(c.layout, io.id, "planet", 300, ctx()).layout,
				io.id,
				"material-io-totals",
				2,
				ctx()
			).layout;
			const b = item(back, "material-io");
			expect(b.els.slice(0, 3)).toEqual([
				"planet",
				"material-io-totals",
				"material-io",
			]);
			expect(b.joinSize).toEqual({ "material-io": 300 });
			// where it is already: nothing
			expect(
				ann(ops.moveInTab(g, "i-material-io", "planet", 2, ctx()))
			).toBe("nothing");
			expect(
				ann(ops.moveInTab(g, "i-material-io", "planet", 3, ctx()))
			).toBe("nothing");
		});

		it("switches the whole tab to the other side", () => {
			const c = ops.setSide(
				three(),
				"i-material-io",
				"planet",
				"beside",
				ctx()
			);
			expect(item(c.layout, "planet").join).toEqual({
				"material-io-totals": "beside",
				planet: "beside",
			});
			expect(
				ops.joinBlocked(c.layout, ["empire"], "i-material-io", "below")
			).toBe("plan.layout.why.join_side");
		});

		it("resizes only the pair at a line beside; the others stay", () => {
			const g = ops.fullWidth(
				ops.setSide(three(), "i-material-io", "planet", "beside", ctx())
					.layout,
				"i-material-io",
				ctx()
			).layout;
			const id = item(g, "planet").id;
			const now = (l: GridLayout) =>
				ops.besideNow(item(l, "planet"), "material-io", l, ctx())!;
			const s0 = now(g);
			expect(s0.cols).not.toBeNull();
			const [a, b] = s0.cols!;
			// a column more for the totals: Planet gives it, Material I/O stays
			const c = ops.setJoinSize(g, id, "planet", b + 1, ctx());
			expect(ann(c)).toBe("share_cols");
			expect(item(c.layout, "planet").joinSize).toEqual({
				"material-io-totals": a,
				planet: b + 1,
			});
			expect(now(c.layout).cols).toEqual([a, b + 1]);
			// and again: the first line stays where it is
			const c2 = ops.setJoinSize(c.layout, id, "planet", b, ctx());
			const s2 = now(c2.layout);
			expect(s2.cols).toEqual([a, b]);
			expect(s2.px[0]).toBeCloseTo(now(c.layout).px[0]);
			// held to the neighbours' minimums
			const far = ops.setJoinSize(g, id, "planet", 99, ctx());
			expect(item(far.layout, "planet").joinSize!.planet).toBe(
				s0.range[1]![1]
			);
			// Auto: shared by their minimums again, all lines
			// the line between the first two: both named, Planet keeps its columns
			const first = ops.setJoinSize(
				c.layout,
				id,
				"material-io-totals",
				a + 1,
				ctx()
			);
			expect(ann(first)).toBe("share_cols_pair");
			expect(first.announcement.params).toMatchObject({
				name: "material-io",
				el: "material-io-totals",
				n: a + 1,
				m: b,
			});
			const auto = ops.setJoinSize(c.layout, id, "planet", null, ctx());
			expect(item(auto.layout, "planet").joinSize).toBeUndefined();
			expect(ann(auto)).toBe("share_auto_all");
			// an auto split already sits on the columns: a first drag moves
			// only its own line
			const fresh = ops.setJoinSize(g, id, "planet", b + 1, ctx());
			expect(now(fresh.layout).px[0]).toBeCloseTo(s0.px[0]);
		});

		it("takes a part out and leaves the rest; the first alone makes the next the tab's own", () => {
			const g = three();
			const mid = ops.takeOut(
				g,
				"i-material-io",
				"material-io-totals",
				ctx()
			);
			expect(item(mid.layout, "material-io").join).toEqual({
				planet: "below",
			});
			const first = ops.takeOut(
				g,
				"i-material-io",
				"material-io",
				ctx(),
				true
			);
			expect(item(first.layout, "material-io").els).toEqual([
				"material-io",
			]);
			const io = item(first.layout, "material-io-totals");
			expect(io.join).toEqual({ planet: "below" });
			expect(io.els[0]).toBe("material-io-totals");
			expect(tabsOf(io)).toContain("material-io-totals");
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

		it("hides a whole item with its tabs, unless one of them stays", () => {
			const g = ops.makeTab(
				today(),
				{ item: "i-planet" },
				"i-empire",
				ctx()
			).layout;
			const c = ops.hideItem(g, "i-empire", ctx());
			expect(
				c.layout.items.some((i) =>
					i.els.some((e) => e === "empire" || e === "planet")
				)
			).toBe(false);
			expect(c.announcement.params).toEqual({ el: "empire+planet" });
			expect(ann(ops.hideItem(g, "i-production", ctx()))).toBe("nothing");
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
		const SIDES = ["below", "beside"] as const;
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
					() => ops.setLeft(g, it.id, int(rnd, -2, 26), c),
					() => ops.hideItem(g, it.id, c),
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
					() =>
						ops.joinTab(
							g,
							{ item: it.id },
							other,
							pick(rnd, SIDES),
							c
						),
					() =>
						missing.length
							? ops.joinTab(
									g,
									{ el: pick(rnd, missing) },
									other,
									pick(rnd, SIDES),
									c
								)
							: ops.setGap(g, 8, c),
					() => ops.setSide(g, it.id, el, pick(rnd, SIDES), c),
					() =>
						ops.takeOutTo(
							g,
							it.id,
							el,
							{ tab: other, side: pick(rnd, SIDES) },
							c
						),
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
				ops.setLeft(g, it.id, it.x - 1, c),
				ops.stepHeight(g, it.id, 1, c),
				ops.togglePin(g, it.id, c),
				ops.split(g, it.id, c),
				ops.hide(g, it.id, it.els[0], c),
				ops.joinTab(g, { item: it.id }, "i-production", "below", c),
				ops.joinTab(g, { item: "i-experts" }, it.id, "beside", c),
			])
				expect(normaliseLayout(change.layout)).toEqual(change.layout);
	});
});
