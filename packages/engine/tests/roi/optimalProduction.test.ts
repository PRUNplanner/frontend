import { describe, expect, it } from "vitest";

import { optimalProduction } from "../../src/roi/optimalProduction";

describe("optimalProduction", async () => {
	it("should have all buildings", async () => {
		expect(optimalProduction.length).toBe(48);
	});
});
