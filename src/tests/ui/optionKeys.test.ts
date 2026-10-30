import { describe, expect, it } from "vitest";

import { optionKeys } from "@/ui/optionKeys";

describe("optionKeys", () => {
	it("keys unique values by the value itself", () => {
		expect(
			optionKeys([{ value: "a" }, { value: 1 }, { value: "1" }])
		).toEqual(["a", 1, "1"]);
	});

	it("gives repeated and missing values keys of their own", () => {
		const keys = optionKeys([
			{ value: "x" },
			{ value: "x" },
			{ value: undefined },
			{ value: undefined },
			{ value: "x" },
		]);
		expect(keys[0]).toBe("x");
		expect(new Set(keys).size).toBe(5);
	});
});
