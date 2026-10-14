import { describe, it, expect } from "vitest";

import {
	niceTicks,
	paretoFrontier,
	placeLabels,
} from "@/ui/charts/scatter.util";

// Types & Interfaces
import type { IScatterDot } from "@/ui/charts/scatter.types";

// the homepage Planet Search: H2O ≥ 21, Agriculture, fertile, Distance CI1
const HOMEPAGE = [
	{ key: "Pyrgos", x: 7, y: 45.23 },
	{ key: "Saladin", x: 20, y: 44.86 },
	{ key: "Poseidon", x: 9, y: 38.27 },
	{ key: "Verdant", x: 11, y: 36.67 },
	{ key: "Promitor", x: 12, y: 36.4 },
	{ key: "Demeter", x: 13, y: 30.32 },
	{ key: "Nemesis", x: 4, y: 30.19 },
	{ key: "Cantium", x: 10, y: 29.91 },
	{ key: "Harmonia", x: 8, y: 25.71 },
];

describe("paretoFrontier", () => {
	it("finds Nemesis and Pyrgos in the homepage search", () => {
		expect(paretoFrontier(HOMEPAGE)).toEqual(["Nemesis", "Pyrgos"]);
	});

	it("keeps equal points and drops ones beaten on one axis only", () => {
		expect(
			paretoFrontier([
				{ key: "a", x: 1, y: 5 },
				{ key: "b", x: 1, y: 5 },
				{ key: "c", x: 2, y: 5 },
				{ key: "d", x: 1, y: 4 },
				{ key: "e", x: 3, y: 6 },
			])
		).toEqual(["a", "b", "e"]);
		expect(paretoFrontier([])).toEqual([]);
	});
});

describe("niceTicks", () => {
	it("covers the range in round steps", () => {
		expect(niceTicks(0, 20)).toEqual([0, 5, 10, 15, 20]);
		expect(niceTicks(25.71, 45.23)).toEqual([25, 30, 35, 40, 45, 50]);
		expect(niceTicks(0, 1)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
	});

	it("widens a single value", () => {
		const ticks = niceTicks(3, 3);
		expect(ticks[0]).toBeLessThan(3);
		expect(ticks.at(-1)).toBeGreaterThan(3);
	});
});

describe("placeLabels", () => {
	const box = { x: 0, y: 0, w: 400, h: 300 };
	const dot = (key: string, cx: number, cy: number): IScatterDot => ({
		key,
		cx,
		cy,
		r: 6,
	});

	it("puts a label right of its dot when that is free", () => {
		expect(
			placeLabels([dot("a", 100, 100)], [{ key: "a", width: 40 }], [], box)
		).toEqual({ a: "right" });
	});

	it("tries left, then below, then above, then hides it", () => {
		// a dot right of a: left
		expect(
			placeLabels(
				[dot("a", 100, 100), dot("b", 125, 100)],
				[{ key: "a", width: 40 }],
				[],
				box
			)
		).toEqual({ a: "left" });
		// dots on both sides: below
		expect(
			placeLabels(
				[dot("a", 100, 100), dot("b", 125, 100), dot("c", 75, 100)],
				[{ key: "a", width: 40 }],
				[],
				box
			)
		).toEqual({ a: "below" });
		// and one below too: above
		expect(
			placeLabels(
				[
					dot("a", 100, 100),
					dot("b", 125, 100),
					dot("c", 75, 100),
					dot("d", 100, 118),
				],
				[{ key: "a", width: 40 }],
				[],
				box
			)
		).toEqual({ a: "above" });
		// and one above too: hidden
		expect(
			placeLabels(
				[
					dot("a", 100, 100),
					dot("b", 125, 100),
					dot("c", 75, 100),
					dot("d", 100, 118),
					dot("e", 100, 82),
				],
				[{ key: "a", width: 40 }],
				[],
				box
			)
		).toEqual({ a: null });
	});

	it("keeps labels off the edges, lines and earlier labels", () => {
		// right edge: left
		expect(
			placeLabels([dot("a", 390, 100)], [{ key: "a", width: 40 }], [], box)
		).toEqual({ a: "left" });
		// a horizontal line through the dot blocks both sides
		expect(
			placeLabels(
				[dot("a", 100, 100)],
				[{ key: "a", width: 40 }],
				[[0, 100, 400, 100]],
				box
			)
		).toEqual({ a: "below" });
		// at the right edge on a line: below, shifted inside the box
		expect(
			placeLabels(
				[dot("a", 395, 100)],
				[{ key: "a", width: 40 }],
				[[0, 100, 400, 100]],
				box
			)
		).toEqual({ a: "below" });
		// b's label would cover a's: b goes left
		expect(
			placeLabels(
				[dot("a", 100, 100), dot("b", 100, 110)],
				[
					{ key: "a", width: 40 },
					{ key: "b", width: 40 },
				],
				[],
				box
			)
		).toEqual({ a: "right", b: "left" });
	});

	it("lets a crossLines label sit on a line rather than hide", () => {
		// lines through the dot both ways, dots below and above
		const dots = [dot("a", 100, 100), dot("d", 100, 118), dot("e", 100, 82)];
		const lines: [number, number, number, number][] = [
			[0, 100, 400, 100],
		];
		expect(
			placeLabels(dots, [{ key: "a", width: 40 }], lines, box)
		).toEqual({ a: null });
		expect(
			placeLabels(
				dots,
				[{ key: "a", width: 40, crossLines: true }],
				lines,
				box
			)
		).toEqual({ a: "right" });
	});
});
