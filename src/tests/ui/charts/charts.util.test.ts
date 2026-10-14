import { describe, it, expect } from "vitest";

import { chartZone, stripLayout, topWithOther } from "@/ui/charts/charts.util";

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
