import { describe, expect, it } from "vitest";

// Util
import {
	addNewElements,
	cloneLayout,
	freeItemId,
	normaliseCustom,
	normaliseFoldedBy,
	normaliseLayout,
	renumber,
} from "@/features/planning/layout/normaliseLayout";
import {
	ELEMENT_IDS,
	LAUNCH_ELEMENTS,
} from "@/features/planning/layout/elements";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	prng,
	randomLayout,
} from "@/tests/features/planning/layout/layout.fixtures";

const prod = { id: "p", els: ["production"], x: 0, w: 12, y: 0 };

describe("normaliseLayout", () => {
	it("turns nothing into a grid with Production", () => {
		for (const input of [undefined, null, {}, "x", { items: "no" }])
			expect(normaliseLayout(input)).toEqual({
				cols: 12,
				gap: 16,
				items: [
					{
						id: "i-production",
						els: ["production"],
						active: "production",
						x: 0,
						w: 12,
						y: 0,
						hm: "fit",
						h: 0,
						pin: false,
					},
				],
			});
	});

	it("keeps parts shown in one tab as stored, all on the first part's side, never the first", () => {
		const g = normaliseLayout({
			items: [
				{
					...prod,
					els: [
						"production",
						"planet",
						"experts",
						"housing",
						"empire",
					],
					// the first can't join; a part after a joined one takes
					// its side; an unknown side or element is dropped
					join: {
						production: "below",
						planet: "beside",
						experts: "below",
						housing: "sideways",
						popr: "below",
					},
					active: "planet",
				},
			],
		});
		const it = g.items[0];
		expect(it.join).toEqual({ planet: "beside", experts: "beside" });
		// the tab shown is the one Planet is shown in
		expect(it.active).toBe("production");
		expect(normaliseLayout(g)).toEqual(g);
		// none left: no join at all
		expect(
			normaliseLayout({ items: [{ ...prod, join: { x: "below" } }] })
				.items[0]
		).not.toHaveProperty("join");
	});

	it("fits a tab's beside sizes in its width, the last part keeping a column", () => {
		const g = normaliseLayout({
			cols: 12,
			items: [
				{
					...prod,
					w: 6,
					els: ["production", "planet", "workforce", "experts"],
					join: {
						planet: "beside",
						workforce: "below",
						experts: "beside",
					},
					joinSize: { planet: 3, workforce: 4, experts: 9 },
				},
			],
		});
		const it = g.items[0];
		// one side for the tab, its first part's
		expect(it.join).toEqual({
			planet: "beside",
			workforce: "beside",
			experts: "beside",
		});
		// 3 + 2 of the 5 a 6-column tab can give; nothing left for the third
		expect(it.joinSize).toEqual({ planet: 3, workforce: 2 });
		expect(normaliseLayout(g)).toEqual(g);
	});

	it("keeps a pair's size: columns within the item, px within limits", () => {
		const pair = (
			side: "below" | "beside",
			joinSize: unknown,
			w: number = 6
		) =>
			normaliseLayout({
				cols: 12,
				items: [
					{
						...prod,
						w,
						els: ["production", "planet", "workforce"],
						join: { planet: side },
						joinSize,
					},
				],
			}).items[0];
		expect(pair("beside", { planet: 4 }).joinSize).toEqual({ planet: 4 });
		// held to 1 … w − 1
		expect(pair("beside", { planet: 9 }).joinSize).toEqual({ planet: 5 });
		expect(pair("beside", { planet: 0 }).joinSize).toEqual({ planet: 1 });
		// one column: no columns to share
		expect(pair("beside", { planet: 1 }, 1)).not.toHaveProperty("joinSize");
		expect(pair("below", { planet: 299.6 }).joinSize).toEqual({
			planet: 300,
		});
		expect(pair("below", { planet: 9000 }).joinSize).toEqual({
			planet: 4000,
		});
		// not a joined element, not a number, not an object: dropped
		expect(
			pair("below", { workforce: 300, planet: "tall" })
		).not.toHaveProperty("joinSize");
		expect(pair("below", 5)).not.toHaveProperty("joinSize");
		const g = normaliseLayout({
			items: [
				{
					...prod,
					els: ["production", "planet"],
					join: { planet: "below" },
					joinSize: { planet: 200 },
				},
			],
		});
		expect(normaliseLayout(g)).toEqual(g);
		expect(cloneLayout(g).items[0].joinSize).not.toBe(g.items[0].joinSize);
	});

	it("drops unknown and duplicate elements and empty items", () => {
		const out = normaliseLayout({
			cols: 12,
			gap: 16,
			items: [
				prod,
				{
					id: "a",
					els: ["nope", "empire", "empire"],
					x: 0,
					w: 3,
					y: 1,
				},
				{ id: "b", els: ["empire"], x: 0, w: 3, y: 2 },
				{ id: "c", els: [], x: 0, w: 3, y: 3 },
				null,
			],
		});
		expect(out.items.map((i) => [i.id, i.els])).toEqual([
			["p", ["production"]],
			["a", ["empire"]],
		]);
	});

	it("keeps Production when it is missing", () => {
		const out = normaliseLayout({
			cols: 8,
			gap: 8,
			items: [{ id: "a", els: ["empire"], x: 0, w: 3, y: 0 }],
		});
		expect(out.items.map((i) => i.els[0])).toEqual([
			"empire",
			"production",
		]);
		expect(out.items[1]).toMatchObject({ x: 0, w: 8 });
	});

	it("clamps columns, gap, widths and heights to the limits", () => {
		expect(normaliseLayout({ cols: 2, gap: 15 })).toMatchObject({
			cols: 4,
			gap: 16,
		});
		expect(normaliseLayout({ cols: 99, gap: 1 })).toMatchObject({
			cols: 24,
			gap: 8,
		});
		const out = normaliseLayout({
			cols: 12,
			gap: 16,
			items: [
				{ ...prod, x: 10, w: 9, hm: "cap", h: 10 },
				{
					id: "e",
					els: ["empire"],
					x: -3,
					w: 0,
					y: 1,
					h: 9000,
					hm: "x",
				},
				{ id: "f", els: ["planet"], x: 11, w: 4, y: 2, h: -4 },
			],
		});
		expect(out.items.map(({ x, w, hm, h }) => ({ x, w, hm, h }))).toEqual([
			// x + w too big: x moves left
			{ x: 3, w: 9, hm: "cap", h: 64 },
			{ x: 0, w: 1, hm: "fit", h: 4000 },
			{ x: 8, w: 4, hm: "fit", h: 0 },
		]);
	});

	it("fits cap and fixed without a height, as the backend needs", () => {
		const out = normaliseLayout({
			cols: 12,
			gap: 16,
			items: [
				{ ...prod, hm: "cap", h: 0 },
				{ id: "e", els: ["empire"], x: 0, w: 4, y: 1, hm: "fixed" },
			],
		});
		expect(out.items.map(({ hm, h }) => ({ hm, h }))).toEqual([
			{ hm: "fit", h: 0 },
			{ hm: "fit", h: 0 },
		]);
	});

	it("falls back to the first tab when `active` isn't one", () => {
		const out = normaliseLayout({
			items: [{ ...prod, els: ["production", "popr"], active: "empire" }],
		});
		expect(out.items[0].active).toBe("production");
	});

	it("renumbers y in reading order and fixes ids", () => {
		const out = normaliseLayout({
			items: [
				{ id: "z", els: ["planet"], x: 6, w: 3, y: 10 },
				{ id: "z", els: ["empire"], x: 0, w: 3, y: 10 },
				{ id: 7, els: ["production"], x: 0, w: 12, y: 2.5 },
				{ els: ["housing"], x: 0, w: 3 },
			],
		});
		expect(out.items.map((i) => [i.id, i.y])).toEqual([
			["i-production", 0],
			["i-empire", 1],
			["z", 2],
			["i-housing", 3],
		]);
	});

	it("keeps `pin` only when it is true", () => {
		const out = normaliseLayout({ items: [{ ...prod, pin: "yes" }] });
		expect(out.items[0].pin).toBe(false);
	});

	it("keeps the elements shown everything open that can be, once", () => {
		const out = normaliseLayout({
			items: [prod],
			open: ["workforce", "workforce", "production", "nope", "experts"],
		});
		expect(out.open).toEqual(["workforce", "experts"]);
		expect(
			normaliseLayout({ items: [prod], table: ["workforce", "planet"] })
				.table
		).toEqual(["workforce"]);
		expect(
			normaliseLayout({ items: [prod], open: "x" })
		).not.toHaveProperty("open");
		expect(normaliseLayout(out)).toEqual(out);
	});

	it("keeps `follow` only when true and not pinned", () => {
		const out = normaliseLayout({
			items: [
				{ ...prod, follow: true },
				{ ...prod, id: "b", els: ["planet"], follow: true, pin: true },
				{ ...prod, id: "c", els: ["experts"], follow: "yes" },
			],
		});
		const follow = (el: string) =>
			out.items.find((i) => i.els[0] === el)!.follow;
		expect(follow("production")).toBe(true);
		expect(follow("planet")).toBeUndefined();
		expect(follow("experts")).toBeUndefined();
	});

	it("keeps `bare` only when true on a card of one tab", () => {
		const out = normaliseLayout({
			items: [
				{ ...prod, bare: true },
				// parts shown in one tab count as one
				{
					...prod,
					id: "b",
					els: ["workforce", "experts"],
					join: { experts: "beside" },
					bare: true,
				},
				// its tabs live in the title bar
				{ ...prod, id: "c", els: ["planet", "housing"], bare: true },
				{ ...prod, id: "d", els: ["empire"], bare: false },
			],
		});
		const bare = (el: string) =>
			out.items.find((i) => i.els[0] === el)!.bare;
		expect(bare("production")).toBe(true);
		expect(bare("workforce")).toBe(true);
		expect(bare("planet")).toBeUndefined();
		expect(bare("empire")).toBeUndefined();
		expect(normaliseLayout(out)).toEqual(out);
	});

	it("keeps at most 40 element ids", () => {
		// the registry has fewer, so all of them survive
		const items = presetLayout("standard").items;
		expect(
			normaliseLayout({ items }).items.flatMap((i) => i.els)
		).toHaveLength(20);
	});

	it("is idempotent on random layouts", () => {
		const rnd = prng(7);
		for (let i = 0; i < 300; i++) {
			const once = normaliseLayout(randomLayout(rnd));
			expect(normaliseLayout(once)).toEqual(once);
		}
	});
});

describe("normaliseFoldedBy", () => {
	it("keeps known ids once, per arrangement", () => {
		expect(
			normaliseFoldedBy({
				wide: ["planet", "x", "planet", 3, "experts"],
				phone: ["workforce", "workforce"],
			})
		).toEqual({ wide: ["planet", "experts"], phone: ["workforce"] });
		expect(normaliseFoldedBy({ wide: "planet" })).toEqual({
			wide: [],
			phone: [],
		});
		expect(normaliseFoldedBy(null)).toEqual({ wide: [], phone: [] });
	});

	it("reads a plain list (before the phone arrangement) as Wide's", () => {
		expect(normaliseFoldedBy(["planet", "nope"])).toEqual({
			wide: ["planet"],
			phone: [],
		});
	});
});

describe("phone arrangement", () => {
	it("has two columns and nothing follows", () => {
		const g = normaliseLayout(
			{
				cols: 12,
				items: [
					{ ...prod, id: "i-production", w: 12 },
					{
						id: "i-planet",
						els: ["planet"],
						x: 7,
						w: 5,
						y: 1,
						follow: true,
					},
				],
			},
			"phone"
		);
		expect(g.cols).toBe(2);
		expect(g.items.every((i) => i.w <= 2 && i.x + i.w <= 2)).toBe(true);
		expect(g.items.some((i) => i.follow)).toBe(false);
	});
});

describe("normaliseCustom", () => {
	it("reads the shape before the phone arrangement as Wide", () => {
		const wide = presetLayout("standard");
		expect(normaliseCustom(wide)).toEqual({ wide });
		expect(normaliseCustom(null)).toEqual({ wide: normaliseLayout({}) });
	});

	it("normalises Wide and Phone and keeps `known`", () => {
		const c = normaliseCustom({
			wide: presetLayout("standard"),
			phone: { cols: 12, items: [prod] },
			known: ["planet", "nope", "planet"],
		});
		expect(c.wide).toEqual(presetLayout("standard"));
		expect(c.phone?.cols).toBe(2);
		expect(c.known).toEqual(["planet"]);
		const noPhone = normaliseCustom({
			wide: presetLayout("standard"),
			phone: null,
			known: "x",
		});
		expect(noPhone).toEqual({ wide: presetLayout("standard") });
	});
});

describe("addNewElements", () => {
	const without = (g: ReturnType<typeof presetLayout>, el: string) => ({
		...g,
		items: g.items
			.map((i) => ({ ...i, els: i.els.filter((e) => e !== el) }))
			.filter((i) => i.els.length)
			.map((i) => ({
				...i,
				active: i.els.includes(i.active) ? i.active : i.els[0],
			})),
	});

	it("adds nothing for the elements there were at launch", () => {
		// a layout saved before `known`: every element then is known
		const wide = without(presetLayout("standard"), "experts");
		const { custom, added } = addNewElements({ wide });
		expect(added).toEqual(
			ELEMENT_IDS.filter((e) => !LAUNCH_ELEMENTS.includes(e))
		);
		expect(custom.wide).toEqual(wide);
		expect(custom.known).toEqual(ELEMENT_IDS);
	});

	it("adds an element it hasn't seen at the bottom of both, full width", () => {
		const wide = normaliseLayout(
			without(presetLayout("standard"), "experts")
		);
		const phone = normaliseLayout(wide, "phone");
		const known = ELEMENT_IDS.filter((e) => e !== "experts");
		const { custom, added } = addNewElements({ wide, phone, known });
		expect(added).toEqual(["experts"]);
		for (const g of [custom.wide, custom.phone!]) {
			const last = g.items.at(-1)!;
			expect(last.els).toEqual(["experts"]);
			expect(last).toMatchObject({
				x: 0,
				w: g.cols,
				hm: "fit",
				pin: false,
			});
		}
		expect(custom.known).toEqual(ELEMENT_IDS);
	});

	it("leaves an unseen element that is placed already where it is", () => {
		const wide = presetLayout("standard");
		const known = ELEMENT_IDS.filter((e) => e !== "experts");
		const { custom, added } = addNewElements({ wide, known });
		expect(added).toEqual(["experts"]);
		expect(custom.wide).toEqual(wide);
		expect(custom.phone).toBeUndefined();
	});
});

describe("helpers", () => {
	it("finds a free item id", () => {
		const items = normaliseLayout({
			items: [{ ...prod, id: "i-production" }],
		}).items;
		expect(freeItemId(items, "empire")).toBe("i-empire");
		expect(freeItemId(items, "production")).toBe("i-production-2");
	});

	it("keeps ties in their order", () => {
		const items = normaliseLayout({}).items;
		const two = [
			{ ...items[0], id: "a" },
			{ ...items[0], id: "b" },
		];
		expect(renumber(two).map((i) => i.id)).toEqual(["a", "b"]);
	});
});
