import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

import BaseROIPage from "@/features/base_roi/components/BaseROIPage.vue";
import BaseROISettingsPanel from "@/features/base_roi/components/BaseROISettingsPanel.vue";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

const calculate = vi.hoisted(() => vi.fn());
vi.mock("@/features/base_roi/useBaseROI", () => ({
	useBaseROI: () => ({
		calculate,
		tryOnPlanet: vi.fn(),
		preferenceExchanges: () => ["AI1"],
		rows: ref([]),
		filtered: computed(() => ({
			rows: [],
			hidden: { maxJumps: 0, logistics: 0, marketCapacity: 0, negative: 0 },
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
vi.mock("@/features/base_roi/components/BaseROITable.vue", () =>
	stub("BaseROITable")
);
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
	});
	afterEach(() => vi.unstubAllGlobals());

	it("opens the setup on the first visit, not once settings are stored (criterion 13)", async () => {
		const first = await mountPage();
		expect(first.findComponent({ name: "BaseROISetup" }).exists()).toBe(true);

		storage.setItem("prunplanner_base_roi", "{}");
		const later = await mountPage();
		expect(later.findComponent({ name: "BaseROISetup" }).exists()).toBe(false);

		// "Run setup again"
		later.findComponent(BaseROISettingsPanel).vm.$emit("setup");
		await flushPromises();
		expect(later.findComponent({ name: "BaseROISetup" }).exists()).toBe(true);
	});

	it("mounts the CX selector and the setup once the CX list is in", async () => {
		const loading = await mountPage(false);
		expect(loading.findComponent({ name: "CXPreferenceSelector" }).exists()).toBe(false);
		expect(loading.findComponent({ name: "BaseROISetup" }).exists()).toBe(false);
		const ready = await mountPage(true);
		expect(ready.findComponent({ name: "CXPreferenceSelector" }).exists()).toBe(true);
		expect(ready.findComponent({ name: "BaseROISetup" }).exists()).toBe(true);
	});

	it("calculates once the data is in, again for engine settings only (criterion 3)", async () => {
		storage.setItem("prunplanner_base_roi", "{}");
		const page = await mountPage(false);
		expect(calculate).not.toHaveBeenCalled();

		const wrapper = await mountPage(true);
		expect(calculate).toHaveBeenCalledTimes(1);

		const panel = wrapper.findComponent(BaseROISettingsPanel);
		const settings = panel.props("settings");
		panel.vm.$emit("update:settings", { ...settings, minMarketCapacity: 0.2 });
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(1);

		panel.vm.$emit("update:settings", { ...settings, bufferDays: 14 });
		await flushPromises();
		expect(calculate).toHaveBeenCalledTimes(2);
		page.unmount();
	});
});
