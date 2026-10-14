import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";

import MaterialDataChart from "@/features/market_exploration/components/MaterialDataChart.vue";
import PLineChart from "@/ui/charts/PLineChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

const { load } = vi.hoisted(() => ({
	load: vi.fn<(ticker: string) => Promise<Record<string, Exploration[]>>>(),
}));
vi.mock("@/features/market_exploration/useMarketExploration", () => ({
	useMarketExploration: () => ({ getMaterialExplorationData: load }),
}));
vi.mock("@/ui/charts/PLineChart.vue", () => ({
	default: {
		name: "PLineChart",
		props: ["days", "series", "volume", "label"],
		render: () => null,
	},
}));

const DAY = 86400000;
const D0 = 1790294400000;
const row = (
	code: string,
	day: number,
	vwap: number,
	traded = 10
): Exploration => ({
	ticker: "RAT",
	exchange_code: code,
	date_epoch: D0 + day * DAY,
	open_p: vwap,
	close_p: vwap,
	high_p: vwap + 1,
	low_p: vwap - 1,
	volume: vwap * traded,
	traded,
});

const series = (wrapper: Awaited<ReturnType<typeof mountChart>>) =>
	wrapper.findComponent(PLineChart).props("series") as {
		key: string;
		values: (number | null)[];
	}[];

async function mountChart(metric = "vwap") {
	const { wrapper } = await mountComponent(MaterialDataChart, {
		materialTicker: "RAT",
		metric,
	});
	await flushPromises();
	return wrapper;
}

describe("MaterialDataChart", () => {
	beforeEach(() => {
		load.mockReset();
		load.mockResolvedValue({
			// AI1's last trade is older than NC1's, it still counts
			AI1: [row("AI1", 0, 240), row("AI1", 2, 236)],
			CI1: [row("CI1", 1, 250), row("CI1", 3, 258, 4)],
			IC1: [],
			NC1: [row("NC1", 0, 262), row("NC1", 3, 270, 7)],
		});
	});

	it("draws a line per exchange, broken at days without trades", async () => {
		const wrapper = await mountChart();

		expect(load).toHaveBeenCalledWith("RAT");
		const lines = series(wrapper);
		expect(lines.map((s) => s.key)).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		// always the last 30 days, the data covers the last 4
		expect(lines[0].values).toHaveLength(30);
		expect(lines[0].values.slice(-4)).toEqual([240, null, 236, null]);
		expect(lines[2].values.every((v) => v === null)).toBe(true);
		// no volume panel: the volume is a view of its own
		expect(wrapper.findComponent(PLineChart).props("volume")).toBeUndefined();
		expect(wrapper.findComponent(PLineChart).props("label")).toBe(
			"material_tile.chart.label"
		);
	});

	it("shows traded units per exchange as lines in the volume view", async () => {
		const wrapper = await mountChart("traded");

		const lines = series(wrapper);
		expect(lines[1].values.slice(-4)).toEqual([null, 10, null, 4]);
		expect(lines[3].values.slice(-4)).toEqual([10, null, null, 7]);
	});

	it("names the exchange with the lowest latest VWAP, in every view", async () => {
		for (const metric of ["vwap", "traded"]) {
			const wrapper = await mountChart(metric);
			expect(wrapper.find(".material-chart-cheapest").text()).toBe(
				"material_tile.chart.cheapest AI1 236"
			);
		}
	});

	it("links to Market Exploration with the material", async () => {
		const wrapper = await mountChart();

		expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
			name: "market-exploration",
			query: { material: "RAT" },
		});
	});

	it("says so when nothing traded", async () => {
		load.mockResolvedValue({ AI1: [], CI1: [], IC1: [], NC1: [] });
		const wrapper = await mountChart();

		expect(wrapper.findComponent(PLineChart).exists()).toBe(false);
		expect(wrapper.find(".material-chart-cheapest").exists()).toBe(false);
		expect(wrapper.text()).toContain("material_tile.chart.empty");
	});

	it("says the data failed instead of an empty range", async () => {
		load.mockRejectedValue(new Error("offline"));
		const wrapper = await mountChart();

		expect(wrapper.text()).toContain("material_tile.chart.error");
	});
});
