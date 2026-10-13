import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { ChartData } from "chart.js";

import MarketHistoryChart from "@/ui/charts/MarketHistoryChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// chart.js has no canvas in jsdom, the stub only keeps the data
vi.mock("vue-chartjs", () => ({
	Bar: {
		name: "Bar",
		props: { data: Object, options: Object },
		render: () => h("div"),
	},
}));

describe("MarketHistoryChart", () => {
	it("gives every exchange its fixed colour", async () => {
		const style = document.documentElement.style;
		style.setProperty("--color-cx-ai1", "#3d8ce6");
		style.setProperty("--color-cx-ci1", "#d96a22");
		style.setProperty("--color-cx-ic1", "#1fa67a");
		style.setProperty("--color-cx-nc1", "#c85fd0");

		const { wrapper } = await mountComponent(MarketHistoryChart, {
			data: [{ date: "1", AI1: 1, CI1: 2, IC1: 3, NC1: 4 }],
		});
		const data = wrapper
			.findComponent({ name: "Bar" })
			.props("data") as ChartData<"bar">;

		expect(
			data.datasets.map((d) => [d.label, d.backgroundColor, d.data[0]])
		).toEqual([
			["AI1", "#3d8ce6", 1],
			["CI1", "#d96a22", 2],
			["IC1", "#1fa67a", 3],
			["NC1", "#c85fd0", 4],
		]);
	});
});
