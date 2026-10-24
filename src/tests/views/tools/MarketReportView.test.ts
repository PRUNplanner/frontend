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
import { marketGapsDebug } from "@/lib/debugMode";
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
		marketGapsDebug.value = false;
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
		// one request up front, the books wait for the content
		expect(callMarketSummary).toHaveBeenCalledOnce();
		expect(callDataExchanges).not.toHaveBeenCalled();
		// the price gaps are hidden until ?debug=gaps
		expect(wrapper.find("#mr-gaps").exists()).toBe(false);
	});

	it("the books load once after the content, for In short, gaps and cards", async () => {
		marketGapsDebug.value = true;
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		const { wrapper } = await mountView();
		await new Promise((r) => setTimeout(r, 5));
		await flushPromises();

		expect(callDataExchanges).toHaveBeenCalledOnce();
		expect(wrapper.find("#mr-gaps").exists()).toBe(true);
		expect(wrapper.find("[data-gap-tile]").exists()).toBe(true);
		expect(wrapper.text()).toContain("market_report.method.gaps");
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

	it("the books start in an idle callback, once", async () => {
		const idle = vi.fn((cb: () => void) => cb());
		vi.stubGlobal("requestIdleCallback", idle);
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		await mountView();
		await flushPromises();
		expect(idle).toHaveBeenCalledOnce();
		expect(callDataExchanges).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
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

		// per exchange first, and the default
		const group = wrapper.find(
			"[role=group][aria-label='market_report.index.view.label']"
		);
		expect(group.findAll("button").map((b) => b.text())).toEqual([
			"market_report.index.view.exchange",
			"market_report.index.view.combined",
			"market_report.index.view.sector",
		]);
		expect(toggle("exchange").attributes("aria-pressed")).toBe("true");
		expect(chart().props("series")).toHaveLength(4);

		await toggle("combined").trigger("click");
		expect(chart().props("series")).toHaveLength(1);

		await toggle("sector").trigger("click");
		expect(chart().props("series")).toHaveLength(8);
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "index",
			view: "sector",
		});
	});

	it("workforce cards, movers and gaps switches are tracked", async () => {
		marketGapsDebug.value = true;
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

		await flushPromises();
		await wrapper
			.findAll("[aria-pressed]")
			.find((b) => b.text().includes("game.workforce_type.engineer"))!
			.trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "workforce",
			view: "engineer",
		});
		await button("market_report.movers.falling").trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "movers",
			view: "falling",
		});
		await button("market_report.gaps.basis.books").trigger("click");
		expect(trackEvent).toHaveBeenLastCalledWith("market:view_change", {
			chart: "gaps",
			view: "books",
		});
		expect(wrapper.text()).toContain("market_report.gaps.caption_books");
	});
});
