import { describe, expect, it } from "vitest";

import { buttonConfig, tagConfig, toastConfig } from "@/ui/styles";

// raw sources, so the check sees the class strings as written
const kit = import.meta.glob(["/src/ui/components/*.vue", "/src/ui/styles.ts"], {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const app = import.meta.glob(["/src/**/*.vue", "!/src/ui/**"], {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

describe("kit colours come from the tokens in style.css", () => {
	it("has no hex or rgb literals in the kit", () => {
		expect(Object.keys(kit).length).toBeGreaterThan(20);
		for (const [file, source] of Object.entries(kit)) {
			expect(source.match(/#[0-9a-f]{3,8}\b/gi), file).toBeNull();
			expect(source.match(/\brgba?\(/gi), file).toBeNull();
		}
	});

	it("has no raw red, orange or green utilities in the app", () => {
		expect(Object.keys(app).length).toBeGreaterThan(100);
		const raw =
			/\b(text|bg|border|ring|fill|stroke|outline|from|via|to|divide|decoration)-(red|orange|green)-\d{2,3}\b/g;
		for (const [file, source] of Object.entries(app))
			expect(source.match(raw), file).toBeNull();
	});

	// the palette swaps --color-negative, so these follow it without a reload
	it("puts destructive buttons, error tags and error toasts on negative", () => {
		expect(buttonConfig.colors.error.base).toContain("bg-negative");
		expect(tagConfig.colors.error).toContain("bg-negative");
		expect(toastConfig.types.error).toContain("border-l-negative");
	});

	it("puts warning buttons and tags on the amber warning token", () => {
		expect(buttonConfig.colors.warning.base).toContain("bg-warning");
		expect(tagConfig.colors.warning).toContain("bg-warning");
	});
});

describe("one overlay system", () => {
	it("leaves no select-only hatch in the code", () => {
		const sources = import.meta.glob(["/src/**/*.{ts,vue}", "!/src/tests/**"], {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>;

		for (const [file, source] of Object.entries(sources))
			expect(source.match(/data-pselect-dropdown|currentlyOpenId/g), file).toBeNull();
	});
});
