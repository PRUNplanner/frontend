import { describe, it, expect, beforeEach, vi } from "vitest";
import { h, ref, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import ResourceROIOverviewView from "@/views/tools/ResourceROIOverviewView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PButton, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

// vi.mock factories are hoisted, so are their helpers
const { stub, passThrough, calculate, state } = vi.hoisted(() => ({
	stub: (name: string, props: string[] = []) => ({
		default: { name, props, render: () => null },
	}),
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
	state: { results: [] as unknown[], searching: false },
}));

vi.mock("@/features/resource_roi_overview/useResourceROIOverview", () => ({
	useResourceROIOverview: () => ({
		resultData: ref(state.results),
		calculate,
		progress: ref({ current: 0, total: 0 }),
		progressSearchingPlanets: ref(state.searching),
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
	stub("CXPreferenceSelector", ["cxUuid"])
);
vi.mock(
	"@/features/resource_roi_overview/components/ResourceROITable.vue",
	() => ({
		default: {
			name: "ResourceROITable",
			props: ["searchedMaterial", "resultData", "active"],
			emits: ["filtered"],
			// the real table marks its rows by key, the view scrolls to them
			render: () =>
				h("table", [
					h("tr", { "data-row-key": "A" }),
					h("tr", { "data-row-key": "B" }),
				]),
		},
	})
);
vi.mock(
	"@/features/resource_roi_overview/components/ResourceROIChartDrawer.vue",
	() => ({
		default: { name: "ResourceROIChartDrawer", render: () => h("div") },
	})
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
		state.searching = false;
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

describe("ResourceROIOverviewView search", () => {
	beforeEach(() => {
		state.results = [];
		state.searching = false;
		vi.stubGlobal("localStorage", memoryStorage());
		calculate.mockReset();
	});

	it("asks to pick a resource before the first search", async () => {
		const { wrapper } = await mountComponent(ResourceROIOverviewView);

		expect(wrapper.text()).toContain("resource_roi.info");
		// nothing to calculate without a resource
		expect(wrapper.findAllComponents(PButton)[0].props("disabled")).toBe(
			true
		);
	});

	it("searches planets, then calculates, while loading", async () => {
		calculate.mockReturnValue(new Promise(() => {}));
		state.searching = true;
		const searching = await search("FEO");
		expect(searching.text()).toContain("resource_roi.searching");
		expect(searching.text()).not.toContain("resource_roi.calculating");
		expect(searching.find(".text-center").exists()).toBe(true);

		state.searching = false;
		const calculating = await search("FEO");
		expect(calculating.text()).toContain("resource_roi.calculating");
		expect(calculating.text()).not.toContain("resource_roi.searching");
	});

	it("drops the table when the resource is cleared afterwards", async () => {
		state.results = [{ planetNaturalId: "A" }];
		calculate.mockResolvedValue(undefined);
		const wrapper = await search("ALO");
		await flushPromises();
		const table = () => wrapper.findComponent({ name: "ResourceROITable" });
		expect(table().exists()).toBe(true);

		wrapper.findComponent(PSelect).vm.$emit("update:value", undefined);
		await flushPromises();

		expect(table().exists()).toBe(false);
	});

	it("shows the table with the searched resource after loading", async () => {
		state.results = [{ planetNaturalId: "A" }];
		calculate.mockResolvedValue(undefined);
		const wrapper = await search("ALO");
		await flushPromises();

		const table = wrapper.findComponent({ name: "ResourceROITable" });
		expect(table.props()).toMatchObject({
			searchedMaterial: "ALO",
			resultData: [{ planetNaturalId: "A" }],
			active: null,
		});
	});

	it("hands the CX chosen by the data loader to the selector", async () => {
		const { wrapper } = await mountComponent(ResourceROIOverviewView);
		const selector = () =>
			wrapper.findComponent({ name: "CXPreferenceSelector" });
		expect(selector().props("cxUuid")).toBeUndefined();

		wrapper
			.findComponent({ name: "WrapperPlanningDataLoader" })
			.vm.$emit("update:cx-uuid", "cx-1");
		await flushPromises();
		expect(selector().props("cxUuid")).toBe("cx-1");

		selector().vm.$emit("update:cxUuid", "cx-2");
		await flushPromises();
		expect(selector().props("cxUuid")).toBe("cx-2");
	});

	it("closed when the stored value cannot be read, and still toggles", async () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
		});
		state.results = [{ planetNaturalId: "A" }];
		calculate.mockResolvedValue(undefined);
		const wrapper = await search("ALO");
		await flushPromises();
		expect(
			wrapper.findComponent({ name: "ResourceROIChartDrawer" }).exists()
		).toBe(false);

		await wrapper.findAllComponents(PButton)[1].trigger("click");

		expect(
			wrapper.findComponent({ name: "ResourceROIChartDrawer" }).exists()
		).toBe(true);
		vi.restoreAllMocks();
	});
});

describe("ResourceROIOverviewView active row", () => {
	const rowRect = (top: number, height = 20) => ({
		top,
		bottom: top + height,
		height,
	});

	/** opens the drawer and hovers a chart dot of row `key` */
	async function activate(
		key: string | null,
		rows: Record<string, ReturnType<typeof rowRect>>,
		drawerTop?: number | null
	) {
		vi.stubGlobal("CSS", { escape: (v: string) => v });
		state.results = [{ planetNaturalId: "A" }];
		localStorage.setItem(CHART_KEY, "1");
		calculate.mockResolvedValue(undefined);
		const { wrapper } = await mountComponent(
			ResourceROIOverviewView,
			{},
			{ attach: true }
		);
		wrapper.findComponent(PSelect).vm.$emit("update:value", "ALO");
		await flushPromises();
		await wrapper.findComponent(PButton).trigger("click");
		await flushPromises();

		for (const tr of wrapper.findAll("tr[data-row-key]")) {
			const rect = rows[tr.attributes("data-row-key")!];
			if (rect)
				vi.spyOn(tr.element, "getBoundingClientRect").mockReturnValue(
					rect as DOMRect
				);
		}
		const drawerEl = document.querySelector("[data-roi-chart]")!;
		// null: the drawer is gone from the page
		if (drawerTop === null) drawerEl.removeAttribute("data-roi-chart");
		else if (drawerTop !== undefined)
			vi.spyOn(drawerEl, "getBoundingClientRect").mockReturnValue(
				rowRect(drawerTop) as DOMRect
			);
		wrapper
			.findComponent({ name: "ResourceROIChartDrawer" })
			.vm.$emit("update:active", key);
		await flushPromises();
		return wrapper;
	}

	beforeEach(() => {
		state.results = [];
		state.searching = false;
		vi.stubGlobal("localStorage", memoryStorage());
		calculate.mockReset();
		window.scrollBy = vi.fn();
	});

	it("leaves the page alone when the row is already visible", async () => {
		await activate("A", { A: rowRect(100) }, 500);

		expect(window.scrollBy).not.toHaveBeenCalled();
	});

	it("centres a row hidden behind the drawer in the space above it", async () => {
		await activate("B", { B: rowRect(480, 40) }, 500);

		// row middle 500 against the middle 250 of the visible area
		expect(window.scrollBy).toHaveBeenCalledWith({ top: 250 });
	});

	it("scrolls up to a row above the viewport", async () => {
		await activate("A", { A: rowRect(-300) }, 400);

		expect(window.scrollBy).toHaveBeenCalledWith({ top: -490 });
	});

	it("measures against the window when there is no drawer", async () => {
		await activate("A", { A: rowRect(100) }, null);
		expect(window.scrollBy).not.toHaveBeenCalled();

		await activate("B", { B: rowRect(1000) }, null);
		// row middle 1010 against the middle 384 of the window
		expect(window.scrollBy).toHaveBeenCalledWith({ top: 626 });
	});

	it("ignores a hover that ends or names an unknown row", async () => {
		const wrapper = await activate("A", { A: rowRect(-300) }, 400);
		vi.mocked(window.scrollBy).mockClear();
		const drawer = wrapper.findComponent({
			name: "ResourceROIChartDrawer",
		});

		drawer.vm.$emit("update:active", null);
		await flushPromises();
		drawer.vm.$emit("update:active", "GONE");
		await flushPromises();

		expect(window.scrollBy).not.toHaveBeenCalled();
	});
});
