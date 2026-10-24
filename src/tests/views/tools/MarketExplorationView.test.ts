import { describe, it, expect, beforeEach, vi } from "vitest";
import { computed, ref, type SetupContext } from "vue";
import { flushPromises } from "@vue/test-utils";

import MarketExplorationView from "@/views/tools/MarketExplorationView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PButton, PSelect } from "@/ui";
import PSparkline from "@/ui/charts/PSparkline.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// the route's query, e.g. ?material=RAT from a material tile
const route = { query: {} as Record<string, string> };
vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, chart, query, loader, health } = vi.hoisted(() => ({
	stub: (name: string, props: string[] = []) => ({
		default: { name, props, render: () => null },
	}),
	chart: {} as { fetchData: () => Promise<void>; failed: boolean },
	query: {
		execute: (() => {}) as (name: string, params: unknown) => unknown,
	},
	loader: { deferred: false, complete: () => {} },
	// the trend fields of the overview, changed per test
	health: {
		vwapTrend: 0.044 as number | undefined,
		weightedTrend: 0.044 as number | null | undefined,
		priceCohesion: 3 as number | null | undefined,
		delta: -10,
	},
}));

const materials = ref<{ ticker: string }[] | undefined>([]);

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: () => query.execute(name, params),
	}),
}));

vi.mock("@/database/services/useMaterialData", () => ({
	useMaterialData: () => ({
		get materialSelectOptions() {
			return computed(() =>
				(materials.value ?? []).map((m) => ({
					label: m.ticker,
					value: m.ticker,
				}))
			);
		},
		getMaterialClass: () => "",
		preload: async () => {},
		get materials() {
			return materials;
		},
	}),
}));
// the overview fields the view reads, per exchange
const universe = (value: number) => ({ UNIVERSE: value });
vi.mock("@/database/services/useExchangeData", () => ({
	useExchangeData: () => ({
		getMaterialExchangeOverview: async () => ({
			vwap_7d: universe(236),
			vwap_30d: universe(231),
			vwap_analysis: { UNIVERSE: { percentChange: health.vwapTrend } },
			sum_traded_7d: universe(52076),
			sum_traded_30d: universe(200000),
			supply: universe(10),
			demand: universe(20),
			delta_supply_demand: universe(health.delta),
			systemic_health: {
				weightedTrend: health.weightedTrend,
				priceCohesion: health.priceCohesion,
			},
		}),
	}),
}));
vi.mock("@/features/market_exploration/useMarketExplorationChart", () => ({
	useMarketExplorationChart: () => ({
		fetchData: () => chart.fetchData(),
		hasError: {
			get value() {
				return chart.failed;
			},
		},
		dataCandlestick: ref([]),
		selectedInterval: ref("daily"),
	}),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () => ({
	default: {
		name: "WrapperGameDataLoader",
		emits: ["complete"],
		setup(_: unknown, { slots, emit }: SetupContext<["complete"]>) {
			loader.complete = () => emit("complete");
			// a cached load completes during setup, as the real loader does
			if (!loader.deferred) emit("complete");
			return () => slots.default?.();
		},
	},
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/ui/charts/MarketExplorationChart.vue", () =>
	stub("MarketExplorationChart")
);
vi.mock("@/features/material_tile/components/MaterialTile.vue", () =>
	stub("MaterialTile", ["ticker"])
);
vi.mock("@/features/material_tile/components/MaterialExchangeTable.vue", () =>
	stub("MaterialExchangeTable", ["overview"])
);
vi.mock(
	"@/features/market_exploration/components/MarketExplorationExchanges.vue",
	() =>
		stub("MarketExplorationExchanges", [
			"materialTicker",
			"metric",
			"range",
		])
);

async function mountView() {
	const { wrapper } = await mountComponent(MarketExplorationView);
	await flushPromises();
	return wrapper;
}

/** the material select in the header */
async function choose(
	wrapper: Awaited<ReturnType<typeof mountView>>,
	value: string
) {
	wrapper.findComponent(PSelect).vm.$emit("update:value", value);
	await flushPromises();
}

describe("MarketExplorationView", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
		chart.fetchData = vi.fn(async () => {});
		chart.failed = false;
		query.execute = vi.fn(async () => ({
			exchange: "UNIVERSE",
			days: 30,
			series: { DW: [1, 2, 3] },
		}));
		materials.value = [];
		Object.assign(health, {
			vwapTrend: 0.044,
			weightedTrend: 0.044,
			priceCohesion: 3,
			delta: -10,
		});
		loader.deferred = false;
		route.query = {};
		sessionStorage.clear();
	});

	it("loads the default material on open without reporting a use", async () => {
		await mountView();

		expect(chart.fetchData).toHaveBeenCalledTimes(1);
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("reports a use once data for a chosen material loaded", async () => {
		const wrapper = await mountView();

		await choose(wrapper, "RAT");

		expect(chart.fetchData).toHaveBeenCalledTimes(2);
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "market_exploration",
			exchange: "AI1",
			material_ticker: "RAT",
		});
	});

	it("reports nothing when the data could not be loaded", async () => {
		const wrapper = await mountView();
		chart.failed = true;

		await choose(wrapper, "RAT");

		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("preselects a known material from the link, else keeps DW", async () => {
		materials.value = [{ ticker: "DW" }, { ticker: "RAT" }];
		route.query = { material: "RAT" };
		const wrapper = await mountView();
		expect(wrapper.findComponent(PSelect).props("value")).toBe("RAT");

		route.query = { material: "NOPE" };
		const other = await mountView();
		expect(other.findComponent(PSelect).props("value")).toBe("DW");
	});

	it("builds the overview once the game data arrives after mount", async () => {
		// first visit: IndexedDB is empty until the loader has fetched
		loader.deferred = true;
		const wrapper = await mountView();
		expect(chart.fetchData).not.toHaveBeenCalled();

		materials.value = [{ ticker: "DW" }];
		loader.complete();
		await flushPromises();

		expect(wrapper.text()).toContain("market_exploration.overview.title");
		expect(wrapper.findComponent(PSelect).props("options")).toEqual([
			{ label: "DW", value: "DW" },
		]);
		expect(chart.fetchData).toHaveBeenCalledTimes(1);
		expect(query.execute).toHaveBeenCalledTimes(1);
	});

	describe("with the overview loaded", () => {
		beforeEach(() => {
			materials.value = [{ ticker: "DW" }];
		});

		const viewButton = (
			wrapper: Awaited<ReturnType<typeof mountView>>,
			view: string
		) =>
			wrapper
				.findAllComponents(PButton)
				.find(
					(b) => b.text() === `market_exploration.chart.view.${view}`
				)!;

		const buttonByText = (
			wrapper: Awaited<ReturnType<typeof mountView>>,
			text: string
		) => wrapper.findAllComponents(PButton).find((b) => b.text() === text)!;

		it("loads the sparklines of the overview's exchange once", async () => {
			await mountView();

			expect(query.execute).toHaveBeenCalledTimes(1);
			expect(query.execute).toHaveBeenCalledWith("GetCXSparklines", {
				exchange: "UNIVERSE",
			});
		});

		it("gives each sparkline the row's Trend value", async () => {
			const wrapper = await mountView();

			const spark = wrapper.findComponent(PSparkline);
			expect(spark.props("points")).toEqual([1, 2, 3]);
			// the Trend column shows weighted_trend × 100 = 4.4 %
			expect(spark.props("trend")).toBeCloseTo(4.4);
		});

		it("switches to all exchanges and remembers it for the session", async () => {
			const wrapper = await mountView();
			expect(
				wrapper
					.findComponent({ name: "MarketExplorationChart" })
					.exists()
			).toBe(true);

			await viewButton(wrapper, "exchanges").trigger("click");
			expect(trackEvent).toHaveBeenCalledWith(
				"market_exploration:view_change",
				{ view: "exchanges" }
			);

			const exchanges = wrapper.findComponent({
				name: "MarketExplorationExchanges",
			});
			expect(exchanges.exists()).toBe(true);
			expect(exchanges.props()).toBeDefined();
			expect(
				wrapper
					.findComponent({ name: "MarketExplorationChart" })
					.exists()
			).toBe(false);
			expect(
				sessionStorage.getItem("market_exploration.chart_view")
			).toBe("exchanges");
			expect(wrapper.text()).toContain(
				"market_exploration.chart.metric.vwap"
			);
			expect(wrapper.text()).toContain(
				"market_exploration.chart.range.90"
			);

			const reopened = await mountView();
			expect(
				reopened
					.findComponent({ name: "MarketExplorationExchanges" })
					.exists()
			).toBe(true);
		});

		it("still opens when the session storage is blocked", async () => {
			vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			const wrapper = await mountView();

			await viewButton(wrapper, "exchanges").trigger("click");

			expect(
				wrapper
					.findComponent({ name: "MarketExplorationExchanges" })
					.exists()
			).toBe(true);
			vi.mocked(Storage.prototype.getItem).mockRestore();
			vi.mocked(Storage.prototype.setItem).mockRestore();
		});

		it("keeps the overview when the sparklines fail", async () => {
			query.execute = vi.fn(async () => {
				throw new Error("offline");
			});
			const wrapper = await mountView();

			expect(wrapper.text()).toContain(
				"market_exploration.overview.title"
			);
		});
		it("does not report a view change to the view already shown", async () => {
			const wrapper = await mountView();

			await viewButton(wrapper, "candles").trigger("click");

			expect(trackEvent).not.toHaveBeenCalled();
			expect(
				sessionStorage.getItem("market_exploration.chart_view")
			).toBe("candles");
		});

		it("toggles the chart between side-by-side and fullscreen", async () => {
			const wrapper = await mountView();
			const grid = () => wrapper.find(".grid.grid-cols-1.gap-3");
			expect(grid().classes()).toContain("xl:grid-cols-2");

			const toggle = wrapper.find(
				'button[aria-label="common.buttons.fullscreen"]'
			);
			await toggle.trigger("click");
			expect(grid().classes()).not.toContain("xl:grid-cols-2");

			await toggle.trigger("click");
			expect(grid().classes()).toContain("xl:grid-cols-2");
		});

		it("loads and reports the chart of a clicked exchange", async () => {
			const wrapper = await mountView();
			chart.fetchData = vi.fn(async () => {});

			await buttonByText(wrapper, "NC1").trigger("click");
			await flushPromises();

			expect(chart.fetchData).toHaveBeenCalledTimes(1);
			expect(trackEvent).toHaveBeenCalledWith("tool:use", {
				tool_name: "market_exploration",
				exchange: "NC1",
				material_ticker: "DW",
			});
			expect(
				buttonByText(wrapper, "NC1").attributes("aria-pressed")
			).toBe("true");
		});

		it("loads the chart of a clicked candle interval", async () => {
			const wrapper = await mountView();
			chart.fetchData = vi.fn(async () => {});

			await buttonByText(
				wrapper,
				"market_exploration.chart.intervals.weekly"
			).trigger("click");
			await flushPromises();

			expect(chart.fetchData).toHaveBeenCalledTimes(1);
			expect(
				buttonByText(
					wrapper,
					"market_exploration.chart.intervals.weekly"
				).attributes("aria-pressed")
			).toBe("true");
		});

		it("passes the chosen metric and range to the exchanges chart", async () => {
			const wrapper = await mountView();
			await viewButton(wrapper, "exchanges").trigger("click");
			const exchanges = () =>
				wrapper.findComponent({ name: "MarketExplorationExchanges" });
			expect(exchanges().props()).toMatchObject({
				materialTicker: "DW",
				metric: "vwap",
				range: 90,
			});

			await buttonByText(
				wrapper,
				"market_exploration.chart.metric.high"
			).trigger("click");
			await buttonByText(
				wrapper,
				"market_exploration.chart.range.all"
			).trigger("click");

			expect(exchanges().props()).toMatchObject({
				metric: "high",
				range: null,
			});
		});

		it("explores the material of a table row", async () => {
			materials.value = [{ ticker: "DW" }, { ticker: "RAT" }];
			const wrapper = await mountView();
			chart.fetchData = vi.fn(async () => {});
			const explore = wrapper
				.findAllComponents(PButton)
				.filter(
					(b) =>
						b.text() === "market_exploration.overview.table.explore"
				);

			await explore[1].trigger("click");
			await flushPromises();

			expect(wrapper.findComponent(PSelect).props("value")).toBe("RAT");
			expect(chart.fetchData).toHaveBeenCalledTimes(1);
			// the exchange table follows, without plan columns
			const table = wrapper.findComponent({ name: "MaterialExchangeTable" });
			expect(table.props("overview")).toMatchObject({
				vwap_7d: { UNIVERSE: 236 },
			});
			expect(table.attributes("daily")).toBeUndefined();
			expect(trackEvent).toHaveBeenCalledWith("tool:use", {
				tool_name: "market_exploration",
				exchange: "AI1",
				material_ticker: "RAT",
			});
		});

		it("lists the materials alphabetically", async () => {
			materials.value = [{ ticker: "RAT" }, { ticker: "DW" }];
			const wrapper = await mountView();

			const tickers = wrapper
				.findAllComponents({ name: "MaterialTile" })
				.map((tile) => tile.props("ticker"));
			expect(tickers).toEqual(["DW", "RAT"]);
		});

		it("explains the sparkline column when its header is hovered", async () => {
			const wrapper = await mountView();
			const hint = "market_exploration.overview.table.sparkline_hint";
			expect(document.body.textContent).not.toContain(hint);

			await wrapper.find(".ptooltip").trigger("mouseenter");
			await flushPromises();

			expect(document.body.textContent).toContain(hint);
			wrapper.unmount();
		});

		it("shows no sparkline for a material without a series", async () => {
			query.execute = vi.fn(async () => ({ series: {} }));
			const wrapper = await mountView();

			expect(wrapper.findComponent(PSparkline).exists()).toBe(false);
		});

		it("shows no table when there are no materials", async () => {
			materials.value = undefined;
			const wrapper = await mountView();

			expect(wrapper.findComponent(PSparkline).exists()).toBe(false);
			expect(wrapper.findComponent(PSelect).props("options")).toEqual([]);
		});

		describe("trend colours", () => {
			// the trend KPIs and table cells, not e.g. the supply delta
			const coloured = (wrapper: Awaited<ReturnType<typeof mountView>>) =>
				wrapper
					.findAll("span.text-positive, span.text-negative")
					.filter(
						(s) =>
							s.text().includes("%") ||
							s.text().includes("percent_trend")
					);

			it("colours rises green and falls red", async () => {
				health.weightedTrend = 0.05;
				health.vwapTrend = -0.05;
				const wrapper = await mountView();

				const classes = coloured(wrapper).map((s) => s.classes());
				// weighted trend (KPI and row) and cohesion rose, the vwap trend fell
				expect(
					classes.filter((c) => c.includes("text-positive"))
				).toHaveLength(3);
				expect(
					classes.filter((c) => c.includes("text-negative"))
				).toHaveLength(1);
			});

			it.each([
				["a flat trend", 0.001],
				["a missing trend", undefined],
				["a null trend", null],
			])("leaves %s uncoloured", async (_, value) => {
				health.weightedTrend = value;
				health.vwapTrend = 0;
				health.priceCohesion = value;
				const wrapper = await mountView();

				expect(coloured(wrapper)).toHaveLength(0);
			});
		});

		it("labels a shortage, a surplus, and nothing when balanced", async () => {
			health.delta = -10;
			const shortage = await mountView();
			expect(shortage.text()).toContain(
				"market_exploration.kpis.shortage"
			);

			health.delta = 10;
			const surplus = await mountView();
			expect(surplus.text()).toContain("market_exploration.kpis.surplus");

			health.delta = 0;
			const balanced = await mountView();
			expect(balanced.text()).not.toContain(
				"market_exploration.kpis.shortage"
			);
			expect(balanced.text()).not.toContain(
				"market_exploration.kpis.surplus"
			);
		});

		it("logs and renders empty KPIs for a material without overview data", async () => {
			const wrapper = await mountView();

			await choose(wrapper, "NOPE");

			expect(console.error).toHaveBeenCalledWith("Missing data for NOPE");
			expect(wrapper.text()).toContain("market_exploration.kpis.supply");
		});
	});
});
