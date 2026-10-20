import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import {
	callCXSparklines,
	callDataExchanges,
	callMarketSummary,
} from "@/features/api/gameData.api";
import MarketReportView from "@/views/tools/MarketReportView.vue";
import MarketIndexChart from "@/features/market_report/components/MarketIndexChart.vue";
import PLineChart from "@/ui/charts/PLineChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

import market_summary from "@/tests/test_data/api_data_market_summary.json";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callMarketSummary: vi.fn(),
	callCXSparklines: vi.fn(),
	callDataExchanges: vi.fn(),
}));

const summary = market_summary as MarketSummary;
let pinia: Pinia;

const mountView = () => mountComponent(MarketReportView, {}, { pinia });

describe("MarketReportView", () => {
	// the lazy sections import their chunks after the test's last await;
	// a slow run would tear the environment down under them
	afterEach(async () => {
		await vi.dynamicImportSettled();
		await flushPromises();
	});

	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
		pinia = createPinia();
		setActivePinia(pinia);
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(callCXSparklines).mockResolvedValue({
			exchange: "AI1",
			days: 91,
			series: {},
		});
		vi.mocked(callDataExchanges).mockResolvedValue([]);
	});

	it("paints the frame with skeletons before any data", async () => {
		vi.mocked(callMarketSummary).mockReturnValue(new Promise(() => {}));
		const { wrapper } = await mountView();

		expect(wrapper.find("h1").text()).toBe("market_report.title");
		// every section heading, and the method text
		expect(wrapper.findAll("h2").map((h) => h.attributes("id"))).toEqual([
			"mr-short",
			"mr-index",
			"mr-workforce",
			"mr-treemap",
			"mr-movers",
			"mr-leaders",
			"mr-exchanges",
		]);
		expect(wrapper.text()).toContain("market_report.method.flat");
		expect(
			wrapper.findAll("[data-skeleton]").length
		).toBeGreaterThanOrEqual(7);
		expect(wrapper.findComponent(MarketIndexChart).exists()).toBe(false);
		// one request up front
		expect(callMarketSummary).toHaveBeenCalledOnce();
	});

	it("a summary that fails validation shows the error with retry", async () => {
		vi.mocked(callMarketSummary).mockRejectedValue(
			new Error("Validation error: materials")
		);
		const { wrapper } = await mountView();

		const alerts = wrapper.findAll("[role=alert]");
		expect(alerts.length).toBeGreaterThan(0);
		expect(wrapper.findComponent(MarketIndexChart).exists()).toBe(false);

		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		await alerts[0].find("button").trigger("click");
		await flushPromises();

		expect(callMarketSummary).toHaveBeenCalledTimes(2);
		expect(wrapper.find("[role=alert]").exists()).toBe(false);
		expect(wrapper.findComponent(MarketIndexChart).exists()).toBe(true);
	});

	it("the index toggle switches 1, 4 and 8 lines and is tracked", async () => {
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		const { wrapper } = await mountView();

		const chart = () =>
			wrapper.findComponent(MarketIndexChart).findComponent(PLineChart);
		const toggle = (view: string) =>
			wrapper
				.findAll("button")
				.find((b) => b.text() === `market_report.index.view.${view}`)!;

		expect(chart().props("series")).toHaveLength(1);

		await toggle("exchange").trigger("click");
		expect(chart().props("series")).toHaveLength(4);

		await toggle("sector").trigger("click");
		expect(chart().props("series")).toHaveLength(8);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "index",
			view: "sector",
		});
	});

	it("workforce tabs and movers direction are tracked", async () => {
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		const { wrapper } = await mountView();
		const button = (label: string) =>
			wrapper.findAll("button").find((b) => b.text() === label)!;

		// the spark endpoint serves at most 90 days
		expect(callCXSparklines).toHaveBeenCalledTimes(5);
		vi.mocked(callCXSparklines).mock.calls.forEach(([, days, metric]) => {
			expect(days).toBeLessThanOrEqual(90);
			expect(metric).toBe("vwap_7d");
		});

		await button("game.workforce_type.engineer").trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "workforce",
			view: "engineer",
		});
		await button("market_report.movers.falling").trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "movers",
			view: "falling",
		});
	});
});
