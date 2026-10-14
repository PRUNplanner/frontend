import { describe, it, expect } from "vitest";

import PDivergingBar from "@/ui/charts/PDivergingBar.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountBar(props: Record<string, unknown>) {
	const { wrapper } = await mountComponent(PDivergingBar, props);
	return wrapper;
}

describe("PDivergingBar", () => {
	it("draws a positive value right of the centre, labelled inside when wide", async () => {
		const w = await mountBar({ value: 50, maxAbs: 100 });
		const bar = w.find(".bg-positive");

		expect(bar.attributes("style")).toContain("left: 50%");
		expect(bar.attributes("style")).toContain("width: 25%");
		expect(bar.text()).toBe("+50");
		expect(w.find(".bg-negative").exists()).toBe(false);
	});

	it("puts a short bar's label beside it", async () => {
		const w = await mountBar({ value: -10, maxAbs: 100 });

		expect(w.find(".bg-negative").attributes("style")).toContain(
			"right: 50%"
		);
		expect(w.find(".bg-negative").text()).toBe("");
		const label = w.find("span.text-negative");
		expect(label.text()).toBe("-10");
		expect(label.attributes("style")).toContain("calc(55% + 4px)");
	});

	it("mirrors a value to both sides", async () => {
		const w = await mountBar({
			value: 9483,
			maxAbs: 9483,
			mirror: true,
			format: (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v)}`,
		});

		expect(w.find(".bg-negative").text()).toBe("−9483");
		expect(w.find(".bg-positive").text()).toBe("+9483");
		expect(w.find("[role=img]").attributes("aria-label")).toBe(
			"−9483 / +9483"
		);
	});

	it("draws nothing for 0", async () => {
		const w = await mountBar({ value: 0, maxAbs: 0, mirror: true });
		expect(w.findAll(".bg-negative, .bg-positive")).toHaveLength(0);
	});
});
