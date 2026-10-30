import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

import MarketExplorationExchanges from "@/features/market_exploration/components/MarketExplorationExchanges.vue";
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
const row = (code: string, day: number, vwap: number): Exploration => ({
	ticker: "RAT",
	exchange_code: code,
	date_epoch: D0 + day * DAY,
	open_p: vwap,
	close_p: vwap,
	high_p: vwap + 1,
	low_p: vwap - 1,
	volume: vwap * 10,
	traded: 10,
});

describe("MarketExplorationExchanges", () => {
	beforeEach(() => {
		load.mockReset();
		load.mockResolvedValue({
			AI1: [row("AI1", 0, 236), row("AI1", 1, 237)],
			CI1: [row("CI1", 1, 258)],
			IC1: [],
			NC1: [row("NC1", 0, 270)],
		});
	});

	it("draws a line per exchange in its fixed colour, with volume", async () => {
		const { wrapper } = await mountComponent(MarketExplorationExchanges, {
			materialTicker: "RAT",
			metric: "vwap",
			range: null,
		});
		await flushPromises();

		expect(load).toHaveBeenCalledWith("RAT");
		const chart = wrapper.findComponent(PLineChart);
		const series = chart.props("series") as {
			key: string;
			values: (number | null)[];
		}[];
		expect(series.map((s) => s.key)).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		expect(series[0].values).toEqual([236, 237]);
		expect(series[1].values).toEqual([null, 258]);
		expect(chart.props("volume")).toEqual([20, 20]);
	});

	it("reloads for a new material and switches the metric", async () => {
		const { wrapper, setProps } = await mountComponent(
			MarketExplorationExchanges,
			{ materialTicker: "RAT", metric: "vwap", range: 30 }
		);
		await flushPromises();

		await setProps({ metric: "high" });
		const series = wrapper.findComponent(PLineChart).props("series") as {
			values: (number | null)[];
		}[];
		expect(series[0].values.at(-1)).toBe(238);

		await setProps({ materialTicker: "DW" });
		expect(load).toHaveBeenLastCalledWith("DW");
	});

	it("says so when nothing traded", async () => {
		load.mockResolvedValue({ AI1: [], CI1: [], IC1: [], NC1: [] });
		const { wrapper } = await mountComponent(MarketExplorationExchanges, {
			materialTicker: "RAT",
			metric: "vwap",
			range: 30,
		});
		await flushPromises();

		expect(wrapper.findComponent(PLineChart).exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"market_exploration.chart.exchanges.empty"
		);
	});

	it("says the data failed instead of an empty range", async () => {
		load.mockRejectedValue(new Error("offline"));
		const { wrapper } = await mountComponent(MarketExplorationExchanges, {
			materialTicker: "RAT",
			metric: "vwap",
			range: 30,
		});
		await flushPromises();

		expect(wrapper.text()).toContain(
			"market_exploration.chart.exchanges.error"
		);
	});
});
