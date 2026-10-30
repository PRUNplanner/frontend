import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, h, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

import BaseROIPage from "@/features/base_roi/components/BaseROIPage.vue";
import BaseROISettingsPanel from "@/features/base_roi/components/BaseROISettingsPanel.vue";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

const calculate = vi.hoisted(() => vi.fn());
// the rows the mocked composable returns for the next mount
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("@/features/base_roi/useBaseROI", () => ({
	useBaseROI: () => ({
		calculate,
		tryOnPlanet: vi.fn(),
		preferenceExchanges: () => ["AI1"],
		rows: ref(state.rows),
		filtered: computed(() => ({
			rows: state.rows,
			hidden: {
				maxJumps: 0,
				logistics: 0,
				marketCapacity: 0,
				negative: 0,
			},
		})),
		step: ref("idle"),
		progress: ref({ current: 0, total: 0 }),
		planetRowsPending: ref(false),
		firstLoad: ref(true),
		series: ref(null),
		historyFailed: ref(false),
	}),
}));
const stub = vi.hoisted(() => (name: string) => ({
	default: { name, render: () => null },
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () =>
	stub("CXPreferenceSelector")
);
vi.mock("@/features/base_roi/components/BaseROITable.vue", () => ({
	default: {
		name: "BaseROITable",
		props: ["rows", "step", "cxUuid"],
		emits: ["update:settings"],
		// the real table marks its rows by key, the page scrolls to them
		render() {
			return h("table", [
				h(
					"tbody",
					(this as unknown as { rows: { key: string }[] }).rows.map(
						(r) => h("tr", { "data-row-key": r.key })
					)
				),
			]);
		},
	},
}));
vi.mock("@/features/base_roi/components/BaseROIChartDrawer.vue", () => ({
	__esModule: true,
	default: {
		name: "BaseROIChartDrawer",
		props: ["show", "active", "rows"],
		render: () => null,
	},
}));
// loaded with defineAsyncComponent: an ES module
vi.mock("@/features/base_roi/components/BaseROISetup.vue", () => ({
	__esModule: true,
	default: { name: "BaseROISetup", props: ["show"], render: () => null },
}));

async function mountPage(ready = true) {
	const { wrapper } = await mountComponent(BaseROIPage, {
		ready,
		cxUuid: undefined,
	});
	await flushPromises();
	return wrapper;
}

describe("BaseROIPage", () => {
	let storage: Storage;
	beforeEach(() => {
		storage = memoryStorage();
		vi.stubGlobal("localStorage", storage);
		calculate.mockReset();
		state.rows = [];
	});
	afterEach(() => vi.unstubAllGlobals());

	it("opens the setup on the first visit, not once settings are stored (criterion 13)", async () => {
		const first = await mountPage();
		expect(first.findComponent({ name: "BaseROISetup" }).exists()).toBe(
			true
		);

		storage.setItem("prunplanner_base_roi", "{}");
		const later = await mountPage();
		expect(later.findComponent({ name: "BaseROISetup" }).exists()).toBe(
			false
		);

		// "Run setup again"
		later.findComponent(BaseROISettingsPanel).vm.$emit("setup");
		await flushPromises();
		expect(later.findComponent({ name: "BaseROISetup" }).exists()).toBe(
			true
		);
	});

	it("mounts the CX selector and the setup once the CX list is in", async () => {
		const loading = await mountPage(false);
		expect(
			loading.findComponent({ name: "CXPreferenceSelector" }).exists()
		).toBe(false);
		expect(loading.findComponent({ name: "BaseROISetup" }).exists()).toBe(
			false
		);
		const ready = await mountPage(true);
		expect(
			ready.findComponent({ name: "CXPreferenceSelector" }).exists()
		).toBe(true);
		expect(ready.findComponent({ name: "BaseROISetup" }).exists()).toBe(
			true
		);
	});

	it("calculates once the data is in, again for engine settings only (criterion 3)", async () => {
		storage.setItem("prunplanner_base_roi", "{}");
		const page = await mountPage(false);
		expect(calculate).not.toHaveBeenCalled();

		const wrapper = await mountPage(true);
		expect(calculate).toHaveBeenCalledTimes(1);

		const panel = wrapper.findComponent(BaseROISettingsPanel);
		const settings = panel.props("settings");
		panel.vm.$emit("update:settings", {
			...settings,
			minMarketCapacity: 0.2,
		});
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(1);

		panel.vm.$emit("update:settings", { ...settings, bufferDays: 14 });
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(2);
		page.unmount();
	});

	it("filter options come from the rows, buildings narrowed by the expertise", async () => {
		state.rows = [
			{ key: "a", expertise: "CHEMISTRY", building: "CHP" },
			{ key: "b", expertise: "MANUFACTURING", building: "PP1" },
			{ key: "c", expertise: null, building: "RIG" },
		];
		storage.setItem(
			"prunplanner_base_roi",
			JSON.stringify({ expertise: "CHEMISTRY" })
		);
		const wrapper = await mountPage();
		const panel = wrapper.findComponent(BaseROISettingsPanel);
		expect(panel.props("expertiseOptions")).toEqual([
			"CHEMISTRY",
			"MANUFACTURING",
		]);
		expect(panel.props("buildingOptions")).toEqual(["CHP"]);
		expect(panel.props("exchanges")).toEqual(["AI1"]);
	});

	it("the Chart button opens the drawer, a hovered dot scrolls to its row (criterion 23)", async () => {
		state.rows = [{ key: "a", expertise: "CHEMISTRY", building: "CHP" }];
		storage.setItem("prunplanner_base_roi", "{}");
		const scroll = vi.fn();
		Element.prototype.scrollIntoView = scroll;
		const wrapper = await mountPage();

		const chart = wrapper
			.findAll("button")
			.find((b) => b.text().includes("base_roi.chart_button"))!;
		await chart.trigger("click");
		await flushPromises();
		const drawer = wrapper.findComponent({ name: "BaseROIChartDrawer" });
		expect(drawer.exists()).toBe(true);
		expect(
			JSON.parse(storage.getItem("prunplanner_base_roi")!).chartOpen
		).toBe(true);

		drawer.vm.$emit("update:active", "a");
		await flushPromises();
		expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
		drawer.vm.$emit("update:active", null);
		drawer.vm.$emit("update:show", false);
		await flushPromises();
		expect(
			wrapper.findComponent({ name: "BaseROIChartDrawer" }).exists()
		).toBe(false);
	});

	it("a CX chosen in the header or the setup recalculates", async () => {
		const wrapper = await mountPage();
		calculate.mockReset();
		wrapper
			.findComponent({ name: "CXPreferenceSelector" })
			.vm.$emit("update:cxUuid", "cx-2");
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(1);
		wrapper
			.findComponent({ name: "BaseROISetup" })
			.vm.$emit("update:cxUuid", "cx-3");
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(2);
		expect(
			wrapper.findComponent({ name: "BaseROITable" }).props("cxUuid")
		).toBe("cx-3");
	});
});
