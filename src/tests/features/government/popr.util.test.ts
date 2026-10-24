import { describe, it, expect } from "vitest";

import { poprAvailable, poprCovers } from "@/features/government/popr.util";

describe("popr.util", () => {
	it("leaves the open jobs of other bases out, never below 0", () => {
		expect(poprAvailable(500, 120)).toBe(380);
		expect(poprAvailable(100, 250)).toBe(0);
	});

	it("covers a need the free workers less open jobs can fill", () => {
		expect(poprCovers(500, 100, 400)).toBe(true);
		expect(poprCovers(500, 100, 401)).toBe(false);
		// nothing needed is always covered, even with no workers
		expect(poprCovers(0, 30, 0)).toBe(true);
	});
});
