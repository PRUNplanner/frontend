import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { callDataExchanges } from "@/features/api/gameData.api";
import MarketExchangeCards from "@/features/market_report/components/MarketExchangeCards.vue";
import MarketLeaders from "@/features/market_report/components/MarketLeaders.vue";
import MarketMovers from "@/features/market_report/components/MarketMovers.vue";
import MarketKpis from "@/features/market_report/components/MarketKpis.vue";
import MarketIndexChart from "@/features/market_report/components/MarketIndexChart.vue";
import PLineChart from "@/ui/charts/PLineChart.vue";
import { mountComponent } from "@/tests/mountComponent";

import fixture from "@/tests/test_data/api_data_market_summary.json";
import type { Exchange } from "@/features/api/schemas/gameData.schemas";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

vi.mock("@/features/api/gameData.api", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callDataExchanges: vi.fn(),
}));

const summary = fixture as MarketSummary;
// a thin summary: one cheap mover without a price, no exchange split
const thin: MarketSummary = {
	...summary,
	turnover_daily: {},
	index: {
		...summary.index,
		combined: [null],
		per_exchange: {},
		per_sector: {},
	},
	sectors: [{ key: "mystery", categories: [] }],
	materials: [
		{
			...summary.materials[0],
			ticker: "LOW",
			vwap_7d: null,
			change_pct: 4,
			is_flat: false,
			turnover_7d_by_exchange: {},
		},
		{
			...summary.materials[0],
			ticker: "CHP",
			vwap_7d: 12.5,
			change_pct: 3,
			is_flat: false,
			turnover_30d: 0,
		},
	],
};

const book = (exchange_code: string, bid: number, ask: number) =>
	({ exchange_code, bid, ask }) as Exchange;

describe("market report lists and cards", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("exchange cards show book stats once loaded", async () => {
		vi.mocked(callDataExchanges).mockResolvedValue([
			book("AI1", 90, 110),
			book("AI1", 0, 5),
			book("CI1", 1, 0),
		]);
		const { wrapper } = await mountComponent(MarketExchangeCards, {
			summary,
		});
		expect(wrapper.findAll("article")).toHaveLength(4);
		expect(wrapper.text()).toContain("20.0 %");
		// IC1 has no book with both sides
		expect(wrapper.findAll("article")[2].text()).toContain("–");
		expect(wrapper.find("[data-skeleton]").exists()).toBe(false);
	});

	it("exchange cards keep the turnover when the books fail, with retry", async () => {
		vi.mocked(callDataExchanges).mockRejectedValue(new Error("down"));
		const { wrapper } = await mountComponent(MarketExchangeCards, {
			summary,
		});
		expect(wrapper.text()).toContain("market_report.error");
		expect(wrapper.text()).toContain(
			"market_report.exchanges.turnover_30d"
		);

		vi.mocked(callDataExchanges).mockResolvedValue([book("AI1", 90, 110)]);
		await wrapper.find("article button").trigger("click");
		await flushPromises();
		expect(wrapper.text()).not.toContain("market_report.error");
	});

	it("movers: price, empty list", async () => {
		const { wrapper, setProps } = await mountComponent(MarketMovers, {
			summary: {
				...thin,
				materials: thin.materials.map((m) => ({
					...m,
					turnover_7d: 1e7,
					units_7d: 100,
				})),
			},
			direction: "rising",
		});
		expect(wrapper.findAll("li")).toHaveLength(2);
		expect(wrapper.findAll("svg[role=img]")).toHaveLength(2);

		await setProps({ direction: "falling" });
		expect(wrapper.text()).toContain("market_report.movers.empty");
	});

	it("movers on the landing page: fewer rows, each a link, readable names", async () => {
		const movers = thin.materials.map((m, i) => ({
			...m,
			ticker: `M${i}`,
			name: i ? "reinforcedDeckElements" : "workstationBlank",
			turnover_7d: 1e7,
			units_7d: 100,
		}));
		const { wrapper } = await mountComponent(MarketMovers, {
			summary: { ...thin, materials: movers },
			direction: "rising",
			count: 1,
			link: true,
		});
		expect(wrapper.find("ol").attributes("style")).toContain(
			"height: 3rem"
		);
		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links).toHaveLength(1);
		expect(links[0].props("to")).toBe("/market");
		expect(wrapper.text()).toContain("Workstation Blank");

		await wrapper.find("ol a").trigger("click");
		expect(wrapper.findComponent(MarketMovers).emitted("open")).toEqual([
			["M0"],
		]);

		const all = await mountComponent(MarketMovers, {
			summary: { ...thin, materials: movers },
			direction: "rising",
		});
		expect(all.wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
		expect(all.wrapper.text()).toContain("Reinforced Deck Elements");
	});

	it("leaders and KPIs on a thin summary", async () => {
		const leaders = await mountComponent(MarketLeaders, { summary: thin });
		expect(leaders.wrapper.findAll("li")).toHaveLength(2);

		const kpis = await mountComponent(MarketKpis, { summary: thin });
		expect(kpis.wrapper.text()).toContain("–");
	});

	it("the index chart has no line for a missing exchange or sector", async () => {
		const { wrapper, setProps } = await mountComponent(MarketIndexChart, {
			summary: thin,
			view: "exchange",
		});
		const chart = () => wrapper.findComponent(PLineChart);
		expect(chart().props("series")[0].values).toEqual([]);
		await setProps({ view: "sector" });
		expect(chart().props("series")[0].values).toEqual([]);
	});
});
