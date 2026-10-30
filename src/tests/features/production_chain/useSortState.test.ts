import { describe, expect, it } from "vitest";

import { useSortState } from "@/features/production_chain/useSortState";

describe("useSortState", () => {
	it("starts on the initial key in its first direction", () => {
		const { sortKey, sortDir } = useSortState<"a" | "b">(
			"a",
			(k) => k === "a"
		);
		expect(sortKey.value).toBe("a");
		expect(sortDir.value).toBe(-1);
		expect(
			useSortState<"a" | "b">("b", (k) => k === "a").sortDir.value
		).toBe(1);
	});

	it("flips the sorted column, starts another in its first direction", () => {
		const { sortKey, sortDir, sortBy } = useSortState<"a" | "b">(
			"a",
			(k) => k === "a"
		);
		sortBy("a");
		expect(sortDir.value).toBe(1);
		sortBy("b");
		expect([sortKey.value, sortDir.value]).toEqual(["b", 1]);
		sortBy("b");
		expect(sortDir.value).toBe(-1);
		sortBy("a");
		expect([sortKey.value, sortDir.value]).toEqual(["a", -1]);
	});

	it("gives aria-sort for the sorted column only", () => {
		const { ariaSort, sortBy } = useSortState<"a" | "b">("a", () => false);
		expect(ariaSort("a")).toBe("ascending");
		expect(ariaSort("b")).toBeUndefined();
		sortBy("a");
		expect(ariaSort("a")).toBe("descending");
	});
});
