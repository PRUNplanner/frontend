import { describe, it, expect } from "vitest";

import { planResultCacheKey } from "@/features/empire/empire.util";

describe("planResultCacheKey", () => {
	it("includes plan, empire and cx", () => {
		expect(planResultCacheKey("p", "e", "c")).toBe("p#e#c");
	});

	it("differs between empires on the same cx", () => {
		expect(planResultCacheKey("p", "e1", "c")).not.toBe(
			planResultCacheKey("p", "e2", "c")
		);
	});

	it("is stable for an undefined cx", () => {
		expect(planResultCacheKey("p", "e", undefined)).toBe(
			planResultCacheKey("p", "e", undefined)
		);
	});
});
