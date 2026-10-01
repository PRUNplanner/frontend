import { describe, it, expect } from "vitest";

import homepage from "@/locales/en_US/homepage.json";

describe("homepage copy", () => {
	it("has no filler words", () => {
		const text = JSON.stringify(homepage).toLowerCase();
		for (const word of [
			"effortless",
			"seamless",
			"powerful",
			"strategic edge",
			"stay ahead",
			"say goodbye",
		])
			expect(text).not.toContain(word);
	});
});
