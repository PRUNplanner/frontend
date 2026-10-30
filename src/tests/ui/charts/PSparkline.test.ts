import { describe, it, expect, beforeAll } from "vitest";

import PSparkline from "@/ui/charts/PSparkline.vue";
import { mountComponent } from "@/tests/mountComponent";

async function mountSparkline(points: (number | null)[], trend: number) {
	const { wrapper } = await mountComponent(PSparkline, {
		points,
		trend,
		label: "RAT, 30 days",
	});
	return wrapper;
}

describe("PSparkline", () => {
	beforeAll(() => {
		const style = document.documentElement.style;
		style.setProperty("--color-positive", "#00ff00");
		style.setProperty("--color-negative", "#ff0000");
		style.setProperty("--color-muted", "#888888");
		style.setProperty("--chart-ink", "#ffffff");
	});

	it("draws one polyline per run and labels the chart", async () => {
		const wrapper = await mountSparkline([1, 2, null, 3, 4], 3);

		expect(wrapper.find("svg").attributes("aria-label")).toBe(
			"RAT, 30 days"
		);
		expect(wrapper.find("svg").attributes("width")).toBe("100");
		expect(wrapper.find("svg").attributes("height")).toBe("24");
		const lines = wrapper.findAll("polyline");
		expect(lines).toHaveLength(2);
		expect(lines[0].attributes("stroke-width")).toBe("1.5");
		expect(lines[0].attributes("stroke-opacity")).toBe("0.72");
	});

	it.each([
		[4.4, "#00ff00"],
		[0.6, "#00ff00"],
		[-6.5, "#ff0000"],
		[0.4, "#888888"],
		[-0.4, "#888888"],
		[Number.NaN, "#888888"],
	])(
		"colours the end dot of trend %s as the Trend column",
		async (trend, colour) => {
			const wrapper = await mountSparkline([1, 2, 3], trend);

			expect(wrapper.find("circle").attributes("fill")).toBe(colour);
		}
	);

	it("has no dot without values", async () => {
		const wrapper = await mountSparkline([null, null], 2);

		expect(wrapper.find("circle").exists()).toBe(false);
		expect(wrapper.findAll("polyline")).toHaveLength(0);
	});

	it("draws in one colour on a shared scale, with lone points", async () => {
		const { wrapper } = await mountComponent(PSparkline, {
			points: [1, null, 2, 3],
			trend: -5,
			label: "AI1",
			domain: [0, 10],
			color: "#3d8ce6",
			width: 72,
		});

		expect(wrapper.find("svg").attributes("width")).toBe("72");
		expect(wrapper.find("polyline").attributes("stroke")).toBe("#3d8ce6");
		const circles = wrapper.findAll("circle");
		// the lone first value and the end
		expect(circles).toHaveLength(2);
		expect(circles.map((c) => c.attributes("fill"))).toEqual([
			"#3d8ce6",
			"#3d8ce6",
		]);
	});
});
