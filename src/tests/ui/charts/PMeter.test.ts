import { describe, it, expect } from "vitest";

import PMeter from "@/ui/charts/PMeter.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountMeter(value: number, max: number) {
	const { wrapper } = await mountComponent(
		PMeter,
		{ value, max, label: "Area" },
		{
			messages: {
				common: { ui: { meter: { used: "{label} {pct} % used" } } },
			},
		}
	);
	const fill = wrapper.find("[role=img] > div");
	return { meter: wrapper.find("[role=img]"), fill };
}

describe("PMeter", () => {
	it("fills value / max with the ink colour", async () => {
		const { meter, fill } = await mountMeter(404, 750);

		// 404 / 750 = 53.87 %
		expect(fill.attributes("style")).toContain("width: 53.8666");
		expect(fill.classes()).not.toContain("bg-negative");
		expect(meter.attributes("aria-label")).toBe("Area 54 % used");
	});

	it("is full and negative when over", async () => {
		const { meter, fill } = await mountMeter(760, 750);
		// the label keeps the real share

		expect(fill.attributes("style")).toContain("width: 100%");
		expect(fill.classes()).toContain("bg-negative");
		expect(meter.attributes("aria-label")).toBe("Area 101 % used");
	});

	it("is full and negative for a need without any total", async () => {
		const { meter, fill } = await mountMeter(5, 0);

		expect(fill.attributes("style")).toContain("width: 100%");
		expect(fill.classes()).toContain("bg-negative");
		expect(meter.attributes("aria-label")).toBe("Area 100 % used");
	});

	it("is empty without a total", async () => {
		const { fill } = await mountMeter(0, 0);

		expect(fill.attributes("style")).toContain("width: 0%");
		expect(fill.classes()).not.toContain("bg-negative");
	});
});
