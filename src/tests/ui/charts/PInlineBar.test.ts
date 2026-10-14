import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import PInlineBar from "@/ui/charts/PInlineBar.vue";

const fill = (props: Record<string, unknown>) =>
	mount(PInlineBar, { props: { value: 0, max: 1, ...props } }).findAll("div")[1];

describe("PInlineBar", () => {
	it("fills value of max, clamped to 0..100 %", () => {
		expect(fill({ value: 0.25 }).attributes("style")).toContain("width: 25%");
		expect(fill({ value: 3 }).attributes("style")).toContain("width: 100%");
		expect(fill({ value: -1 }).attributes("style")).toContain("width: 0%");
		expect(fill({ value: 1, max: 0 }).attributes("style")).toContain(
			"width: 0%"
		);
	});

	it("is neutral by default and positive on request", () => {
		expect(fill({}).classes()).not.toContain("bg-positive");
		expect(fill({ tone: "positive" }).classes()).toContain("bg-positive");
	});
});
