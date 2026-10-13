import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { ChartData } from "chart.js";
import type { Context } from "chartjs-plugin-datalabels";

import PlanRepairProfitChart from "@/ui/charts/PlanRepairProfitChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// chart.js has no canvas in jsdom, the stub only keeps the data
vi.mock("vue-chartjs", () => ({
	Chart: {
		name: "Chart",
		props: { data: Object, options: Object },
		render: () => h("div"),
	},
}));

/** optimal point label align with the star at pixel x, chart area 50 to 550 */
async function alignAt(x: number) {
	const { wrapper } = await mountComponent(PlanRepairProfitChart, {
		profitData: [1, 2, 3],
		optimalPoint: { x: 2, y: 3 },
	});
	const data = wrapper
		.findComponent({ name: "Chart" })
		.props("data") as ChartData<"line" | "scatter">;
	const align = (
		data.datasets[1] as unknown as {
			datalabels: { align: (ctx: Context) => number | string };
		}
	).datalabels.align;

	return align({
		chart: {
			chartArea: { left: 50, right: 550 },
			scales: { x: { getPixelForValue: () => x } },
		},
	} as unknown as Context);
}

describe("PlanRepairProfitChart", () => {
	// useChartTheme reads the tokens on the first mount
	beforeAll(() =>
		document.documentElement.style.setProperty("--color-positive", "#00ff00")
	);
	afterEach(() => switchPalette("default", { "--color-positive": "#00ff00" }));

	it("keeps the optimal point label inside the chart", async () => {
		// day 180 sits on the right edge: label goes bottom left
		expect(await alignAt(550)).toBe(135);
		// day 0 on the left edge: bottom right
		expect(await alignAt(50)).toBe(45);
		expect(await alignAt(300)).toBe("bottom");
	});

	it("draws the curve in the positive colour and follows the palette", async () => {
		const { wrapper } = await mountComponent(PlanRepairProfitChart, {
			profitData: [1, 2, 3],
			optimalPoint: { x: 2, y: 3 },
		});
		const curve = () =>
			(
				wrapper.findComponent({ name: "Chart" }).props("data") as ChartData<
					"line" | "scatter"
				>
			).datasets[0].borderColor;

		expect(curve()).toBe("#00ff00");
		await switchPalette("colorblind", { "--color-positive": "#0000ff" });
		expect(curve()).toBe("#0000ff");
	});
});
