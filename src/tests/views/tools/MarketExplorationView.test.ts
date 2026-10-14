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
const { stub, chart, query, loader } = vi.hoisted(() => ({
	stub: (name: string) => ({ default: { name, render: () => null } }),
	chart: {} as { fetchData: () => Promise<void>; failed: boolean },
	query: {
		execute: (() => {}) as (name: string, params: unknown) => unknown,
	},
	loader: { deferred: false, complete: () => {} },
}));

const materials = ref<{ ticker: string }[]>([]);

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: () => query.execute(name, params),
	}),
}));

vi.mock("@/database/services/useMaterialData", () => ({
	useMaterialData: () => ({
		get materialSelectOptions() {
			return computed(() =>
				materials.value.map((m) => ({
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
			vwap_analysis: { UNIVERSE: { percentChange: 0.044 } },
			sum_traded_7d: universe(52076),
			sum_traded_30d: universe(200000),
			supply: universe(10),
			demand: universe(20),
			delta_supply_demand: universe(-10),
			systemic_health: { weightedTrend: 0.044, priceCohesion: 3 },
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
	stub("MaterialTile")
);
vi.mock("@/features/cx/components/MaterialCXOverviewTable.vue", () =>
	stub("MaterialCXOverviewTable")
);
vi.mock(
	"@/features/market_exploration/components/MarketExplorationExchanges.vue",
	() => stub("MarketExplorationExchanges")
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
	});
});
