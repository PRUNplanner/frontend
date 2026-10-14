import { describe, it, expect } from "vitest";

import PRunwayBar from "@/ui/charts/PRunwayBar.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountBar(value: number, note?: string) {
	const { wrapper } = await mountComponent(PRunwayBar, {
		value,
		axis: 30,
		red: 5,
		yellow: 10,
		label: "C",
		note,
	});
	const [fill, redLine, yellowLine] = wrapper.findAll(
		"[role=img] > div > div"
	);
	return { wrapper, fill, redLine, yellowLine };
}

describe("PRunwayBar", () => {
	it("fills to days / axis with the zone colour and draws the thresholds", async () => {
		const { wrapper, fill, redLine, yellowLine } = await mountBar(3);

		expect(fill.attributes("style")).toBe("width: 10%;");
		expect(fill.classes()).toContain("bg-negative");
		expect(redLine.attributes("style")).toContain("left: 16.666");
		expect(yellowLine.attributes("style")).toContain("left: 33.333");
		expect(wrapper.text()).not.toContain("›");
	});

	it("is amber in the yellow zone and neutral beyond it", async () => {
		expect((await mountBar(8)).fill.classes()).toContain("bg-warning");
		expect((await mountBar(12)).fill.classes()).toContain(
			"bg-(--chart-ink)/72"
		);
	});

	it("stops at the axis with › beyond it", async () => {
		const { wrapper, fill } = await mountBar(58);

		expect(fill.attributes("style")).toBe("width: 100%;");
		expect(wrapper.text()).toContain("›");
		expect(wrapper.find("[role=img]").attributes("aria-label")).toBe(
			"C, common.ui.runway.beyond"
		);
	});

	it("shows the note instead of a bar", async () => {
		const { wrapper, fill } = await mountBar(Infinity, "produced here");

		expect(fill).toBeUndefined();
		expect(wrapper.text()).toBe("produced here");
		expect(wrapper.find("[role=img]").attributes("aria-label")).toBe(
			"C: produced here"
		);
	});
});
