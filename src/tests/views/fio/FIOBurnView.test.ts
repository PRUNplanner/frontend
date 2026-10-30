import { describe, it, expect, beforeEach, vi } from "vitest";
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import { nextTick, ref, type Slots } from "vue";
import { RouterLinkStub, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import FIOBurnView from "@/views/fio/FIOBurnView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import { useUserStore } from "@/stores/userStore";
import fio from "@/locales/en_US/fio.json";
import empire from "@/locales/en_US/empire.json";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { stub, passThrough, calculatePlan, createContext, burn } = vi.hoisted(() => ({
	stub: (name: string) => ({
		__esModule: true,
		default: { name, render: () => null },
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
	calculatePlan: vi.fn(() => ({ result: {} })),
	createContext: vi.fn(async () => ({})),
	// the results the view hands to the burn tables
	burn: { data: undefined as undefined | { value: object } },
}));

// the loaders fetch data, here they only hand through their slot
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/planning/engine/calculatePlan", () => ({ calculatePlan }));
vi.mock("@/features/planning/usePlanContext", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/features/planning/usePlanContext")
	>()),
	usePlanContext: () => ({ loadGameData: async () => ({}), createContext }),
}));
vi.mock("@/features/preferences/usePreferences", () => ({
	usePreferences: () => ({
		defaultEmpireUuid: ref("E1"),
		burnDaysRed: ref(3),
		burnDaysYellow: ref(7),
	}),
}));
vi.mock("@/features/fio/useFIOBurn", () => ({
	useFIOBurn: (_: unknown, data: { value: object }) => {
		burn.data = data;
		return { burnTable: ref([]), planTable: ref([]) };
	},
}));
vi.mock("@/features/fio/components/FIOBurnPlanTable.vue", () =>
	stub("FIOBurnPlanTable")
);
vi.mock("@/features/fio/components/FIOBurnTable.vue", () =>
	stub("FIOBurnTable")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));

const empires = [
	{ uuid: "E1", empire_name: "one" },
	{ uuid: "E2", empire_name: "two" },
];

// the planning loader hands over the empires, the shared plan and the CX
async function mountView(
	empireList: typeof empires = empires,
	withFIO: boolean = true
) {
	const pinia = createPinia();
	setActivePinia(pinia);
	if (withFIO)
		// @ts-expect-error partial profile
		useUserStore().profile = { fio_apikey: "key", prun_username: "user" };
	const { wrapper } = await mountComponent(FIOBurnView, {}, {
		pinia,
		messages: { fio, empire },
	});
	const loader = wrapper.findComponent(WrapperPlanningDataLoader);
	loader.vm.$emit("data:empire:list", empireList);
	loader.vm.$emit("data:empire:plans", [
		{ uuid: "P1", planet_natural_id: "OT-580b" },
	]);
	loader.vm.$emit("update:cx-uuid", "CX1");
	return wrapper;
}

// the game data loader of the selected empire is done, the view calculates
async function complete(wrapper: VueWrapper) {
	await vi.waitFor(() =>
		expect(wrapper.findComponent(WrapperGameDataLoader).exists()).toBe(true)
	);
	wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
	await nextTick();
	await vi.waitFor(() =>
		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false)
	);
}

async function selectEmpire(wrapper: VueWrapper, uuid: string) {
	wrapper.findComponent(PSelect).vm.$emit("update:value", uuid);
	await nextTick();
	await complete(wrapper);
}

const calculatedEmpires = () =>
	calculatePlan.mock.calls.map(
		// @ts-expect-error mock call arguments
		(c) => (c[0] as { empire?: { uuid: string } }).empire?.uuid
	);

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

describe("FIOBurnView", () => {
	beforeEach(() => {
		calculatePlan.mockClear();
		vi.mocked(trackEvent).mockClear();
		createContext.mockReset().mockResolvedValue({});
	});

	it("without an empire: a card linking to Management, no colon", async () => {
		const wrapper = await mountView([]);
		await complete(wrapper);

		expect(wrapper.find("h1").text()).toBe("FIO Burn");
		const card = wrapper.find("[data-testid=fio-burn-no-empire]");
		expect(card.text()).toContain("No empire yet");
		const link = card.findComponent(RouterLinkStub);
		expect(link.props("to")).toBe("/manage");
		expect(link.text()).toBe("Create empire");
		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
	});

	it("without FIO: a notice linking to the Profile FIO section", async () => {
		const wrapper = await mountView(empires, false);
		await complete(wrapper);

		expect(wrapper.find("h1").text()).toBe("FIO Burn: one");
		const notice = wrapper.find("[data-testid=fio-burn-no-fio]");
		expect(notice.text()).toContain("Connect FIO to see your burn");
		expect(notice.findComponent(RouterLinkStub).props("to")).toBe(
			"/profile#fio"
		);
		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
	});

	it("calculates the plans of the selected empire", async () => {
		const wrapper = await mountView();
		await complete(wrapper);

		expect(calculatedEmpires()).toEqual(["E1"]);
		expect(createContext).toHaveBeenCalledWith({}, "OT-580b", "CX1");
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "fio_burn",
		});
	});

	it("recalculates a shared plan for another empire", async () => {
		const wrapper = await mountView();
		await complete(wrapper);

		await selectEmpire(wrapper, "E2");
		expect(calculatedEmpires()).toEqual(["E1", "E2"]);

		// back again, the result of the first empire is cached
		await selectEmpire(wrapper, "E1");
		expect(calculatedEmpires()).toEqual(["E1", "E2"]);
	});

	it("hides the progress when the calculation fails", async () => {
		createContext.mockRejectedValue(new Error("no context"));

		const wrapper = await mountView();
		await complete(wrapper);

		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false);
		expect(calculatePlan).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
		expect(reportError).toHaveBeenCalledWith(new Error("no context"));
	});

	describe("another tab changed the plans", () => {
		const loader = (wrapper: VueWrapper) =>
			wrapper.findComponent(WrapperPlanningDataLoader);

		it("a refresh from another tab recalculates quietly", async () => {
			const wrapper = await mountView();
			await complete(wrapper);
			expect(calculatePlan).toHaveBeenCalledTimes(1);

			loader(wrapper).vm.$emit("data:empire:plans", [
				{ uuid: "P2", planet_natural_id: "OT-580b" },
			]);
			loader(wrapper).vm.$emit("refreshed");

			await vi.waitFor(() =>
				expect(Object.keys(burn.data!.value)).toEqual(["P2"])
			);
			expect(calculatePlan).toHaveBeenCalledTimes(2);
			// the page stays
			expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
				false
			);
		});

		it("an older run finishing last keeps the newer results", async () => {
			const wrapper = await mountView();
			await complete(wrapper);
			let finish!: (value: object) => void;
			createContext.mockImplementationOnce(
				() => new Promise((resolve) => (finish = resolve))
			);

			loader(wrapper).vm.$emit("refreshed");
			await vi.waitFor(() =>
				expect(createContext).toHaveBeenCalledTimes(2)
			);
			// the plans changed again while the first refresh calculates
			loader(wrapper).vm.$emit("data:empire:plans", [
				{ uuid: "P3", planet_natural_id: "OT-580b" },
			]);
			loader(wrapper).vm.$emit("refreshed");
			await vi.waitFor(() =>
				expect(Object.keys(burn.data!.value)).toEqual(["P3"])
			);

			finish({});
			await new Promise((r) => setTimeout(r, 10));

			expect(Object.keys(burn.data!.value)).toEqual(["P3"]);
			// the stale run never calculated
			expect(calculatePlan).toHaveBeenCalledTimes(2);
		});
	});
});
