import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";
import type { ChartData } from "chart.js";

import EmpireBarChart from "@/ui/charts/EmpireBarChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// chart.js has no canvas in jsdom, the stub only keeps the data
vi.mock("vue-chartjs", () => ({
	Bar: {
		name: "Bar",
		props: { data: Object, options: Object },
		render: () => h("div"),
	},
}));

const POSITIVE = "#00ff00";
const NEGATIVE = "#ff0000";
const MUTED = "#888888";

async function chartData(props: Record<string, unknown>) {
	const { wrapper } = await mountComponent(EmpireBarChart, props);
	const bar = wrapper.findComponent({ name: "Bar" });
	return {
		wrapper,
		data: bar.exists()
			? (bar.props("data") as ChartData<"bar">)
			: undefined,
	};
}

describe("EmpireBarChart", () => {
	beforeEach(() => {
		const style = document.documentElement.style;
		style.setProperty("--color-positive", POSITIVE);
		style.setProperty("--color-negative", NEGATIVE);
		style.setProperty("--color-muted", MUTED);
	});

	it("renders the top 10 plus Other", async () => {
		const items = Array.from({ length: 15 }, (_, i) => ({
			name: `M${i}`,
			value: i + 1,
			color: "#123456",
		}));
		const { wrapper, data } = await chartData({ items });

		const labels = data!.labels as string[];
		expect(labels).toHaveLength(11);
		expect(labels.at(0)).toBe("M14");
		// mountComponent's i18n has no messages, keys render as is
		expect(labels.at(10)).toBe("common.charts.other");
		// 1 + 2 + 3 + 4 + 5
		expect(data!.datasets[0].data.at(10)).toBe(15);
		const colors = data!.datasets[0].backgroundColor as string[];
		expect(colors.at(0)).toBe("#123456");
		expect(colors.at(10)).toBe(MUTED);
		// values sit in a right-hand axis, one per bar
		const values = wrapper.findComponent({ name: "Bar" }).props("options")
			.scales.values.labels;
		expect(values).toHaveLength(11);
		expect(values.at(0)).toBe("15.00");
	});

	it("colours uncoloured bars by sign", async () => {
		const { data } = await chartData({
			items: [
				{ name: "A", value: 10 },
				{ name: "B", value: -20 },
			],
		});

		expect(data!.labels).toEqual(["B", "A"]);
		expect(data!.datasets[0].backgroundColor).toEqual([NEGATIVE, POSITIVE]);
	});

	it("keeps value labels short", async () => {
		const { wrapper } = await chartData({
			items: [
				{ name: "A", value: 663456.04 },
				{ name: "B", value: -99.5 },
			],
		});

		// no decimals from 100 up, no unit (it sits in the heading)
		expect(
			wrapper.findComponent({ name: "Bar" }).props("options").scales.values
				.labels
		).toEqual(["663,456", "-99.50"]);
	});

	it("shows a line instead of an empty chart", async () => {
		const { wrapper, data } = await chartData({ items: [] });

		expect(data).toBeUndefined();
		expect(wrapper.text()).toContain("common.charts.empty");
	});
});
