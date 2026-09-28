import { describe, it, expect } from "vitest";

import { topWithOther } from "@/ui/charts/charts.util";

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
