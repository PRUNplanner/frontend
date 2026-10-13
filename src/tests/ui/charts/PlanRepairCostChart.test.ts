import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { ChartData } from "chart.js";

import PlanRepairCostChart from "@/ui/charts/PlanRepairCostChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// chart.js has no canvas in jsdom, the stub only keeps the data
vi.mock("vue-chartjs", () => ({
	Line: {
		name: "Line",
		props: { data: Object, options: Object },
		render: () => h("div"),
	},
}));

describe("PlanRepairCostChart", () => {
	it("draws the total cost in the negative colour and follows the palette", async () => {
		document.documentElement.style.setProperty("--color-negative", "#ff0000");
		const { wrapper } = await mountComponent(PlanRepairCostChart, {
			series: [
				{ name: "Total Cost", data: [1, 2, 3] },
				{ name: "MCG", data: [0, 1, 2] },
			],
		});
		const colors = () =>
			(
				wrapper.findComponent({ name: "Line" }).props("data") as ChartData<"line">
			).datasets.map((d) => d.borderColor);

		expect(colors()[0]).toBe("#ff0000");
		expect(colors()).toHaveLength(2);
		await switchPalette("colorblind", { "--color-negative": "#fb923c" });
		expect(colors()[0]).toBe("#fb923c");
	});
});
