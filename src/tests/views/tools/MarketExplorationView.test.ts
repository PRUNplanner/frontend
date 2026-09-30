import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import MarketExplorationView from "@/views/tools/MarketExplorationView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, chart } = vi.hoisted(() => ({
	stub: (name: string) => ({ default: { name, render: () => null } }),
	chart: {} as { fetchData: () => Promise<void>; failed: boolean },
}));

vi.mock("@/database/services/useMaterialData", () => ({
	useMaterialData: () => ({
		materialSelectOptions: ref([]),
		getMaterialClass: () => "",
		preload: async () => {},
		materials: ref([]),
	}),
}));
vi.mock("@/database/services/useExchangeData", () => ({
	useExchangeData: () => ({ getMaterialExchangeOverview: vi.fn() }),
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
		setup:
			(_: unknown, { slots }: { slots: Slots }) =>
			() =>
				slots.default?.(),
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
});
