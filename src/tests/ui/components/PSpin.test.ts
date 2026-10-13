import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PSpin from "@/ui/components/PSpin.vue";

describe("PSpin", () => {
	it("is brand coloured and 16 px by default", () => {
		const svg = mount(PSpin).find("svg");

		expect(svg.classes()).toContain("text-prunplanner");
		expect(svg.attributes("style")).toContain("width: 16px");
	});

	it.each([
		["white", "text-white"],
		["muted", "text-muted"],
	] as const)("takes the %s colour from a fixed map", (color, cls) => {
		expect(mount(PSpin, { props: { color } }).find("svg").classes()).toContain(
			cls
		);
	});

	it.each([
		["xs", 12],
		["lg", 24],
		["xl", 36],
	] as const)("is %s at %i px", (size, px) => {
		expect(
			mount(PSpin, { props: { size } }).find("svg").attributes("style")
		).toContain(`width: ${px}px`);
	});
});
