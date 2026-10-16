import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import ResourceROIOverviewView from "@/views/tools/ResourceROIOverviewView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PButton, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, passThrough, calculate, state } = vi.hoisted(() => ({
	stub: (name: string) => ({ default: { name, render: () => null } }),
	passThrough: (name: string) => ({
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.(),
		},
	}),
	calculate: vi.fn(),
	// the composable's results for the next mount
	state: { results: [] as unknown[] },
}));

vi.mock("@/features/resource_roi_overview/useResourceROIOverview", () => ({
	useResourceROIOverview: () => ({
		resultData: ref(state.results),
		calculate,
		progressCurrent: ref(0),
		progressTotal: ref(0),
		progressSearchingPlanets: ref(false),
	}),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () =>
	stub("CXPreferenceSelector")
);
vi.mock(
	"@/features/resource_roi_overview/components/ResourceROITable.vue",
	() => stub("ResourceROITable")
);
vi.mock(
	"@/features/resource_roi_overview/components/ResourceROIChartDrawer.vue",
	() => stub("ResourceROIChartDrawer")
);

async function search(material: string) {
	const { wrapper } = await mountComponent(ResourceROIOverviewView);
	wrapper.findComponent(PSelect).vm.$emit("update:value", material);
	await flushPromises();
	await wrapper.findComponent(PButton).trigger("click");
	return wrapper;
}

const CHART_KEY = "prunplanner_resource_roi_chart";

describe("ResourceROIOverviewView", () => {
	beforeEach(() => {
		state.results = [];
		vi.stubGlobal("localStorage", memoryStorage());
		vi.mocked(trackEvent).mockClear();
		calculate.mockReset();
	});

	it("reports a use once the search finished", async () => {
		let finish: () => void = () => {};
		calculate.mockReturnValue(
			new Promise<void>((resolve) => (finish = resolve))
		);

		await search("FEO");
		expect(calculate).toHaveBeenCalledWith("FEO");
		// asked for, no result yet
		expect(trackEvent).not.toHaveBeenCalled();

		finish();
		await flushPromises();
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "resource_roi",
			material_ticker: "FEO",
		});
	});

	it("reports nothing on open", async () => {
		await mountComponent(ResourceROIOverviewView);

		expect(calculate).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});
});

describe("ResourceROIOverviewView chart", () => {
	const drawer = (wrapper: VueWrapper) =>
		wrapper.findComponent({ name: "ResourceROIChartDrawer" });
	const chartButton = (wrapper: VueWrapper) =>
		wrapper.findAllComponents(PButton)[1];

	beforeEach(() => {
		state.results = [];
		vi.stubGlobal("localStorage", memoryStorage());
	});

	it("keeps the chart button off without results", async () => {
		const { wrapper } = await mountComponent(ResourceROIOverviewView);

		expect(chartButton(wrapper).text()).toBe("resource_roi.chart.button");
		expect(chartButton(wrapper).props("disabled")).toBe(true);
		expect(drawer(wrapper).exists()).toBe(false);
	});

	it("opens and closes the drawer, and remembers it", async () => {
		state.results = [{ planetNaturalId: "A" }];
		calculate.mockResolvedValue(undefined);
		const wrapper = await search("ALO");
		await flushPromises();

		await chartButton(wrapper).trigger("click");
		expect(chartButton(wrapper).props("pressed")).toBe(true);
		expect(drawer(wrapper).exists()).toBe(true);
		expect(localStorage.getItem(CHART_KEY)).toBe("1");
		expect(trackEvent).toHaveBeenCalledWith("resource_roi:chart_open");

		// the drawer gets what the table shows
		const rows = [{ planetNaturalId: "A" }];
		wrapper
			.findComponent({ name: "ResourceROITable" })
			.vm.$emit("filtered", rows);
		await flushPromises();
		// the stub declares no props
		expect(drawer(wrapper).vm.$attrs.rows).toEqual(rows);

		// its close button and Esc
		drawer(wrapper).vm.$emit("update:show", false);
		await flushPromises();
		expect(drawer(wrapper).exists()).toBe(false);
		expect(localStorage.getItem(CHART_KEY)).toBe("0");
		// closing is not reported
		expect(
			vi
				.mocked(trackEvent)
				.mock.calls.filter(([e]) => e === "resource_roi:chart_open")
		).toHaveLength(1);
	});

	it("reopens a drawer left open", async () => {
		state.results = [{ planetNaturalId: "A" }];
		localStorage.setItem(CHART_KEY, "1");
		const { wrapper } = await mountComponent(ResourceROIOverviewView);

		expect(drawer(wrapper).exists()).toBe(true);
	});
});
