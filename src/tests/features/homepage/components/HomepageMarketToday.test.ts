import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import {
	callCXSparklines,
	callMarketSummary,
} from "@/features/api/gameData.api";
import HomepageMarketToday from "@/features/homepage/components/HomepageMarketToday.vue";
import MarketMovers from "@/features/market_report/components/MarketMovers.vue";
import PLineChart from "@/ui/charts/PLineChart.vue";
import { WORKFORCE_TICKERS } from "@/features/market_report/marketReport.util";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";

import homepage from "@/locales/en_US/homepage.json";
import market_report from "@/locales/en_US/market_report.json";
import fixture from "@/tests/test_data/api_data_market_summary.json";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callMarketSummary: vi.fn(),
	callCXSparklines: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const summary = fixture as MarketSummary;
// every workforce ticker at 100 ȼ
const sparks = {
	exchange: "UNIVERSE",
	days: 90,
	series: Object.fromEntries(
		WORKFORCE_TICKERS.map((t) => [t, Array(90).fill(100)])
	),
};

const mount = () =>
	mountComponent(
		HomepageMarketToday,
		{},
		{ messages: { homepage, market_report } }
	);

describe("HomepageMarketToday", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(callCXSparklines).mockResolvedValue(sparks);
	});

	it("shows its skeleton while the summary loads", async () => {
		vi.mocked(callMarketSummary).mockReturnValue(new Promise(() => {}));
		const { wrapper } = await mount();
		expect(wrapper.find("[data-skeleton]").exists()).toBe(true);
		expect(wrapper.find("[data-market-today]").exists()).toBe(false);
	});

	it("renders nothing when the summary fails, so the frame keeps title and CTA", async () => {
		vi.mocked(callMarketSummary).mockRejectedValue(new Error("down"));
		const { wrapper } = await mount();
		await flushPromises();
		expect(wrapper.find("[data-skeleton]").exists()).toBe(false);
		expect(wrapper.find("[data-market-today]").exists()).toBe(false);
	});

	it("lead, index, movers and sectors from the summary", async () => {
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		const { wrapper } = await mount();
		await flushPromises();

		const lead = wrapper.find("[data-market-lead]").text();
		expect(lead).toMatch(/^Prices on the four exchanges moved [▲▼]/);
		expect(lead).toContain("since Jul 22, 2026");
		expect(lead).toContain("Feeding 100 pioneers costs 920 ȼ a day");
		expect(lead).toMatch(/Straight from FIO, no account needed\.$/);
		expect(lead).not.toMatch(/\{|homepage\./);

		expect(wrapper.find("[data-market-index]").text()).toMatch(/^\d+\.\d$/);
		expect(wrapper.findComponent(PLineChart).props("area")).toBe(true);
		expect(wrapper.text()).toContain("255 materials");
		expect(wrapper.text()).toContain("Daily data to Oct 19, 2026");

		const movers = wrapper.findComponent(MarketMovers);
		expect(movers.props()).toMatchObject({ count: 5, link: true });
		expect(wrapper.findAll("[data-market-sector]")).toHaveLength(8);
		expect(callCXSparklines).toHaveBeenCalledWith(
			"UNIVERSE",
			90,
			"vwap_7d",
			WORKFORCE_TICKERS
		);
	});

	it("leaves the pioneer cost out of the lead without its prices", async () => {
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		vi.mocked(callCXSparklines).mockRejectedValue(new Error("down"));
		const { wrapper } = await mount();
		await flushPromises();
		const lead = wrapper.find("[data-market-lead]").text();
		expect(lead).not.toContain("pioneers");
		expect(lead).toContain("Straight from FIO");
	});

	it("sends its events: movers direction, sector and mover clicks", async () => {
		vi.mocked(callMarketSummary).mockResolvedValue(summary);
		const { wrapper } = await mount();
		await flushPromises();

		const falling = wrapper
			.findAll("button")
			.find((b) => b.text() === "Falling")!;
		await falling.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("landing:market_view_change", {
			view: "falling",
		});
		expect(wrapper.findComponent(MarketMovers).props("direction")).toBe(
			"falling"
		);

		const sector = wrapper.find("[data-market-sector]");
		expect(sector.attributes("aria-label")).toMatch(
			/: [▲▼■].* in 90 days$/
		);
		await sector.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("landing:market_click", {
			target: "sector",
		});

		wrapper.findComponent(MarketMovers).vm.$emit("open", "RAT");
		expect(trackEvent).toHaveBeenCalledWith("landing:market_click", {
			target: "mover",
		});
		expect(
			wrapper
				.findAllComponents(RouterLinkStub)
				.every((l) => l.props("to") === "/market")
		).toBe(true);
	});
});
