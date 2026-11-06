import { describe, expect, it } from "vitest";

// Util
import {
	freeItemId,
	normaliseFolded,
	normaliseLayout,
	renumber,
} from "@/features/planning/layout/normaliseLayout";
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

	it("keeps at most 40 element ids", () => {
		// the registry has fewer, so all of them survive
		const items = presetLayout("today").items;
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

describe("normaliseFolded", () => {
	it("keeps known ids once", () => {
		expect(
			normaliseFolded(["planet", "x", "planet", 3, "experts"])
		).toEqual(["planet", "experts"]);
		expect(normaliseFolded("planet")).toEqual([]);
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
