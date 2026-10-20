import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { callCXSparklines } from "@/features/api/gameData.api";
import MarketWorkforce from "@/features/market_report/components/MarketWorkforce.vue";
import PLineChart from "@/ui/charts/PLineChart.vue";
import { WORKFORCE_TICKERS } from "@/features/market_report/marketReport.util";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callCXSparklines: vi.fn(),
}));

// every ticker at 100 ȼ, RAT rising to 150 on the last day; AI1 is the
// cheapest exchange, NC1 has no RAT trades
function sparks(exchange: string) {
	const factor = { UNIVERSE: 1, AI1: 0.9, CI1: 1, IC1: 1.1, NC1: 1.2 }[
		exchange
	]!;
	const series = Object.fromEntries(
		WORKFORCE_TICKERS.map((t) => [
			t,
			Array.from({ length: 90 }, (_, i) =>
				t === "RAT" && i === 89 ? 150 * factor : 100 * factor
			),
		])
	);
	if (exchange === "NC1") delete series.RAT;
	return { exchange, days: 90, series };
}

describe("MarketWorkforce", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("shows the ALL cost, the cheapest exchange and the drivers", async () => {
		vi.mocked(callCXSparklines).mockImplementation(async (exchange) =>
			sparks(exchange)
		);
		const { wrapper, setProps } = await mountComponent(MarketWorkforce, {
			tier: "pioneer",
		});

		// 9.2 units a day × 100 ȼ, RAT + 4 × 50
		expect(wrapper.text()).toContain("1,120 ȼ");
		expect(wrapper.text()).toContain("market_report.workforce.cheapest");
		expect(wrapper.text()).toContain("market_report.workforce.driver");
		expect(callCXSparklines).toHaveBeenCalledTimes(5);
		const chart = wrapper.findComponent(PLineChart);
		expect(
			chart.props("series").map((s: { key: string }) => s.key)
		).toEqual(["AI1", "CI1", "IC1", "NC1"]);
		// NC1 can't price the basket without RAT
		expect(
			chart.props("series")[3].values.every((v: unknown) => v === null)
		).toBe(true);

		await setProps({ tier: "settler" });
		expect(wrapper.text()).toContain("market_report.workforce.driver");
	});

	it("a failed request shows the error, retry loads again", async () => {
		vi.mocked(callCXSparklines).mockRejectedValue(new Error("down"));
		const { wrapper } = await mountComponent(MarketWorkforce, {
			tier: "pioneer",
		});
		expect(wrapper.find("[role=alert]").exists()).toBe(true);

		vi.mocked(callCXSparklines).mockImplementation(async (exchange) =>
			sparks(exchange)
		);
		await wrapper.find("[role=alert] button").trigger("click");
		await flushPromises();
		expect(wrapper.find("[role=alert]").exists()).toBe(false);
		expect(wrapper.findComponent(PLineChart).exists()).toBe(true);
	});

	it("without any price there is no headline", async () => {
		vi.mocked(callCXSparklines).mockImplementation(async (exchange) => ({
			exchange,
			days: 90,
			series: {},
		}));
		const { wrapper } = await mountComponent(MarketWorkforce, {
			tier: "pioneer",
		});
		expect(wrapper.text()).toContain("–");
		expect(wrapper.text()).not.toContain(
			"market_report.workforce.cheapest"
		);
		expect(wrapper.text()).not.toContain("market_report.workforce.drivers");
	});
});
