import { describe, it, expect } from "vitest";
import { h } from "vue";

import PStackedBar from "@/ui/charts/PStackedBar.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IStackedBarSegment } from "@/ui/charts/charts.types";

const SEGMENTS: IStackedBarSegment[] = [
	{ key: "inputs", value: 60, color: "rgb(1, 2, 3)" },
	{ key: "workforce", value: 0, color: "red" },
	{ key: "profit", value: 40, color: "green" },
];

async function mountBar(hatchFrom?: number) {
	const { wrapper } = await mountComponent(
		{
			setup: () => () =>
				h(
					PStackedBar,
					{ segments: SEGMENTS, label: "Split", hatchFrom },
					{ default: () => h("span", "tip") }
				),
		},
		{},
		{ attach: true }
	);
	return wrapper;
}

describe("PStackedBar", () => {
	it("draws the non-empty parts in proportion", async () => {
		const wrapper = await mountBar();
		const parts = wrapper.findAll("[data-key]");
		expect(parts.map((p) => p.attributes("data-key"))).toEqual([
			"inputs",
			"profit",
		]);
		expect(parts[0].attributes("style")).toContain("flex: 60 1 0%");
		expect(parts[0].attributes("style")).toContain("rgb(1, 2, 3)");
		expect(wrapper.find("[role=img]").attributes("aria-label")).toBe(
			"Split"
		);
	});

	it("hatches from hatchFrom to the end", async () => {
		const wrapper = await mountBar(75);
		const hatch = wrapper.find("[data-key=hatch]");
		expect(hatch.attributes("style")).toContain("left: 75%");
		expect(hatch.attributes("style")).toContain(
			"repeating-linear-gradient"
		);
	});

	it("has no hatch when covered", async () => {
		expect((await mountBar()).find("[data-key=hatch]").exists()).toBe(
			false
		);
		expect((await mountBar(100)).find("[data-key=hatch]").exists()).toBe(
			false
		);
	});

	it("shows the tooltip on hover", async () => {
		const wrapper = await mountBar();
		await wrapper.find(".ptooltip").trigger("mouseenter");
		expect(document.body.textContent).toContain("tip");
		wrapper.unmount();
	});
});
