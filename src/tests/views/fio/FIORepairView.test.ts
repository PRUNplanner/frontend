import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import type { Slots } from "vue";

import fio from "@/locales/en_US/fio.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

import FIORepairView from "@/views/fio/FIORepairView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import { usePlanningStore } from "@/stores/planningStore";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { stub, passThrough } = vi.hoisted(() => ({
	stub: (name: string) => ({
		__esModule: true,
		default: { name, props: ["plans", "empires"], render: () => null },
	}),
	passThrough: (name: string) => ({
		__esModule: true,
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.({ empirePlanetList: [] }),
		},
	}),
}));

vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/fio_repair/components/FIORepairOverview.vue", () =>
	stub("FIORepairOverview")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));

const messages = { fio };
let pinia: Pinia;

function connectFIO(lastModified: string = new Date().toISOString()) {
	// @ts-expect-error partial profile
	useUserStore().profile = { fio_apikey: "key", prun_username: "user" };
	usePlanningStore().setFIOStorageData({
		...fio_storage,
		last_modified: new Date(lastModified),
	} as never);
}

const mountView = () => mountComponent(FIORepairView, {}, { pinia, messages });

describe("FIORepairView", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it("without FIO: a notice linking to Profile, nothing loads", async () => {
		const { wrapper } = await mountView();
		const notice = wrapper.find("[data-testid=fio-repair-no-fio]");
		expect(notice.text()).toContain(
			"Connect FIO to see your bases' repair status"
		);
		expect(notice.text()).toContain("Profile");
		expect(wrapper.findComponent(WrapperPlanningDataLoader).exists()).toBe(
			false
		);
		expect(
			wrapper.find("[data-testid=fio-repair-last-update]").exists()
		).toBe(false);
	});

	it("FIO without sites: a notice", async () => {
		// @ts-expect-error partial profile
		useUserStore().profile = { fio_apikey: "key", prun_username: "user" };
		const { wrapper } = await mountView();
		expect(wrapper.find("[data-testid=fio-repair-no-sites]").exists()).toBe(
			true
		);
	});

	it("fresh data: the overview with plans and empires, no warning", async () => {
		connectFIO();
		const { wrapper } = await mountView();
		expect(wrapper.find("[data-testid=fio-repair-stale]").exists()).toBe(
			false
		);

		const loader = wrapper.findComponent(WrapperPlanningDataLoader);
		loader.vm.$emit("data:plan:list", [{ uuid: "P1" }]);
		loader.vm.$emit("data:empire:list", [{ uuid: "E1" }]);
		await vi.waitFor(() =>
			expect(
				wrapper.findComponent({ name: "FIORepairOverview" }).exists()
			).toBe(true)
		);
		const overview = wrapper.findComponent({ name: "FIORepairOverview" });
		expect(overview.props("plans")).toStrictEqual([{ uuid: "P1" }]);
		expect(overview.props("empires")).toStrictEqual([{ uuid: "E1" }]);
	});

	it("data older than a day: a warning and an amber timestamp", async () => {
		connectFIO("2026-02-27T07:28:45Z");
		const { wrapper } = await mountView();
		expect(wrapper.find("[data-testid=fio-repair-stale]").text()).toContain(
			"Buildings have aged since then"
		);
		expect(
			wrapper.find("[data-testid=fio-repair-last-update]").classes()
		).toContain("text-warning");
	});
});
