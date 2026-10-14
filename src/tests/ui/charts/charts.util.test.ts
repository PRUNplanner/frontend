import { describe, it, expect } from "vitest";

import {
	chartZone,
	compactNumber,
	stripLayout,
	topWithOther,
	waterfallLayout,
} from "@/ui/charts/charts.util";

// Types & Interfaces
import type { IWaterfallColumn } from "@/ui/charts/charts.types";

const label = (n: number) => `Other (${n})`;
const item = (name: string, value: number) => ({ name, value });

describe("topWithOther", () => {
	it("sorts by absolute value, largest first", () => {
		expect(
			topWithOther([item("A", 1), item("B", -5), item("C", 3)], 10, label)
		).toEqual([item("B", -5), item("C", 3), item("A", 1)]);
	});

	it("adds no Other item up to top items", () => {
		const items = [item("A", 2), item("B", 1)];
		expect(topWithOther(items, 2, label)).toEqual(items);
		expect(topWithOther([], 2, label)).toEqual([]);
	});

	it("sums the rest into Other, keeping signs", () => {
		const result = topWithOther(
			[
				item("A", 100),
				item("B", -50),
				item("C", 10),
				item("D", -4),
				item("E", 1),
			],
			2,
			label
		);

		expect(result).toEqual([
			item("A", 100),
			item("B", -50),
			// 10 - 4 + 1
			{ name: "Other (3)", value: 7 },
		]);
	});

	it("does not mutate the input", () => {
		const items = [item("A", 1), item("B", 2)];
		topWithOther(items, 1, label);
		expect(items.map((i) => i.name)).toEqual(["A", "B"]);
	});
});

describe("stripLayout", () => {
	const items = (...values: number[]) =>
		values.map((value, i) => ({ key: `M${i}`, value }));

	it("has one dot per finite value on the axis and counts the rest as over", () => {
		const { dots, over } = stripLayout(
			items(3, 40, 12, Infinity, 30, 31),
			30
		);

		expect(dots.map((d) => d.value)).toEqual([3, 12, 30]);
		expect(dots.map((d) => d.pct)).toEqual([10, 40, 100]);
		expect(over.map((o) => o.value)).toEqual([31, 40]);
	});

	it("splits values closer than 1.2 d into an upper and a lower lane", () => {
		const { dots } = stripLayout(items(8, 3, 3.5, 20, 4.2, 9.1), 30);

		expect(dots.map((d) => [d.value, d.lane])).toEqual([
			[3, "up"],
			[3.5, "down"],
			[4.2, "up"],
			[8, "up"],
			[9.1, "down"],
			[20, "mid"],
		]);
		// neighbours closer than 1.2 d never share a lane
		dots.slice(1).forEach((d, i) => {
			if (d.value - dots[i].value < 1.2)
				expect(d.lane).not.toBe(dots[i].lane);
		});
	});

	it("keeps values 1.2 d apart in the middle lane", () => {
		const { dots } = stripLayout(items(1, 2.2), 30);

		expect(dots.map((d) => d.lane)).toEqual(["mid", "mid"]);
	});
});

describe("chartZone", () => {
	it("is red up to red, yellow up to yellow, inclusive", () => {
		expect([5, 5.1, 10, 10.1].map((v) => chartZone(v, 5, 10))).toEqual([
			"red",
			"yellow",
			"yellow",
			"none",
		]);
	});
});

describe("stripLayout gap", () => {
	it("scales the lane gap with the axis, about one dot wide", () => {
		const values = [
			{ key: "A", value: 10 },
			{ key: "B", value: 13 },
		];

		// 3 d apart: far enough on 30 d, a dot apart on 90 d
		expect(stripLayout(values, 30).dots.map((d) => d.lane)).toEqual([
			"mid",
			"mid",
		]);
		expect(stripLayout(values, 90).dots.map((d) => d.lane)).toEqual([
			"up",
			"down",
		]);
	});
});

describe("stripLayout overlap", () => {
	// two dots touch when they share a lane (a middle dot blocks both) and
	// sit less than one gap apart
	function touching(values: number[], axis = 30, gap = 1.2) {
		const { dots } = stripLayout(
			values.map((value, i) => ({ key: `M${i}`, value })),
			axis,
			gap
		);
		const at = (pct: number) => (pct / 100) * axis;
		return dots.flatMap((a, i) =>
			dots
				.slice(i + 1)
				.filter(
					(b) =>
						(a.lane === b.lane ||
							a.lane === "mid" ||
							b.lane === "mid") &&
						Math.abs(at(a.pct) - at(b.pct)) < gap - 1e-9
				)
				.map((b) => `${a.key}/${b.key}`)
		);
	}

	it("dodges many equal values instead of stacking them", () => {
		const { dots } = stripLayout(
			Array.from({ length: 8 }, (_, i) => ({ key: `Z${i}`, value: 0 })),
			30
		);

		expect(new Set(dots.map((d) => `${d.lane}@${d.pct}`)).size).toBe(8);
		expect(touching(Array(8).fill(0))).toEqual([]);
	});

	it("never lets dots touch, whatever the values", () => {
		expect(
			touching([0, 0, 0, 0, 0.5, 1.4, 1.5, 3, 3.1, 3.2, 3.3, 7, 20, 21.8])
		).toEqual([]);
	});
});

describe("compactNumber", () => {
	it("shortens to k and M with one decimal", () => {
		expect(compactNumber(950)).toBe("950");
		expect(compactNumber(13_400)).toBe("13.4k");
		expect(compactNumber(-15_729)).toBe("−15.7k");
		expect(compactNumber(1_250_000)).toBe("1.3M");
		expect(compactNumber(0)).toBe("0");
	});
});

describe("waterfallLayout", () => {
	const seg = (key: string, value: number) => ({ key, label: key, value });
	// 100 − 30 − 20 = 50 on a 300 px plot, domain 0..110
	const COLUMNS: IWaterfallColumn[] = [
		{
			key: "out",
			label: "Out",
			kind: "total",
			value: 100,
			tone: "neutral",
			segments: [seg("FE", 97), seg("LST", 2), seg("FLX", 1)],
		},
		{
			key: "in",
			label: "In",
			kind: "step",
			value: -30,
			tone: "negative",
			segments: [seg("C", 30)],
		},
		{
			key: "wf",
			label: "Wf",
			kind: "step",
			value: -20,
			tone: "negative",
			segments: [],
		},
		{
			key: "profit",
			label: "Profit",
			kind: "total",
			value: 50,
			tone: "positive",
			segments: [],
		},
	];
	const px = (v: number) => ((110 - v) / 110) * 300;

	it("stands totals on 0 and floats steps from the running total", () => {
		const { columns, zeroY } = waterfallLayout(COLUMNS, 300);

		expect(zeroY).toBe(300);
		expect(columns.map((c) => [c.top, c.height, c.endY])).toEqual([
			[px(100), px(0) - px(100), px(100)],
			[px(100), px(70) - px(100), px(70)],
			[px(70), px(50) - px(70), px(50)],
			[px(50), px(0) - px(50), px(50)],
		]);
	});

	it("stacks a total's segments up from 0 and a cost's down from its start", () => {
		const [out, cost] = waterfallLayout(COLUMNS, 300).columns;

		expect(out.segments[0].top).toBeCloseTo(px(97));
		expect(out.segments[2].top).toBeCloseTo(px(100));
		expect(cost.segments[0].top).toBeCloseTo(px(100));
		expect(cost.segments[0].height).toBeCloseTo(px(70) - px(100));
	});

	it("puts a label inside from 22 px, else beside and off the connector", () => {
		const [out, cost, wf] = waterfallLayout(COLUMNS, 300).columns;

		expect(out.segments.map((s) => s.labelAt)).toEqual([
			"inside",
			"beside",
			"beside",
		]);
		expect(cost.segments[0].labelAt).toBe("inside");
		// a column without segments has no label
		expect(wf.segments[0].labelAt).toBe("hidden");

		// the connector runs at the top of "Out"; labels sit below it and
		// below each other
		const [, lst, flx] = out.segments;
		const label = (s: { labelTop: number }) => [
			s.labelTop,
			s.labelTop + 14,
		];
		for (const s of [lst, flx]) {
			const [a, b] = label(s);
			expect(a > out.endY + 2 || b < out.endY - 2).toBe(true);
		}
		expect(lst.labelTop).toBeGreaterThanOrEqual(flx.labelTop + 14);
	});

	it("hides labels beside a bar on narrow charts, or with no room left", () => {
		const narrow = waterfallLayout(COLUMNS, 300, false).columns[0];
		expect(narrow.segments.map((s) => s.labelAt)).toEqual([
			"inside",
			"hidden",
			"hidden",
		]);

		const column = (segments: ReturnType<typeof seg>[]) => [
			{
				key: "x",
				label: "X",
				kind: "total" as const,
				value: 100,
				tone: "neutral" as const,
				segments,
			},
		];

		// tiny segments at the plot bottom move up instead, still apart
		const [a, b] = waterfallLayout(
			column([seg("A", 1), seg("B", 1), seg("C", 98)]),
			300
		).columns[0].segments;
		expect([a.labelAt, b.labelAt]).toEqual(["beside", "beside"]);
		expect(Math.abs(a.labelTop - b.labelTop)).toBeGreaterThanOrEqual(14);
		for (const s of [a, b])
			expect(s.labelTop + 14).toBeLessThanOrEqual(300);

		// a plot lower than a label: nowhere to go
		const tiny = waterfallLayout(column([seg("A", 50), seg("B", 50)]), 10)
			.columns[0];
		expect(tiny.segments.map((s) => s.labelAt)).toEqual([
			"hidden",
			"hidden",
		]);
	});

	it("draws a loss below 0 with room under it, and ticks every nice step", () => {
		const { ticks, columns, zeroY } = waterfallLayout(
			[
				{
					key: "out",
					label: "Out",
					kind: "total",
					value: 100,
					tone: "neutral",
					segments: [],
				},
				{
					key: "cost",
					label: "Cost",
					kind: "step",
					value: -150,
					tone: "negative",
					segments: [],
				},
				{
					key: "profit",
					label: "Profit",
					kind: "total",
					value: -50,
					tone: "negative",
					segments: [],
				},
			],
			300
		);

		// domain −50..100, 10 % of 150 each side: −65..115
		expect(zeroY).toBeCloseTo((115 / 180) * 300);
		expect(columns[2].top).toBeCloseTo(zeroY);
		expect(columns[2].height).toBeCloseTo((50 / 180) * 300);
		expect(ticks.map((t) => t.value)).toEqual([-50, 0, 50, 100]);
	});
});
