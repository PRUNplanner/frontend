import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import FIOBurnView from "@/views/fio/FIOBurnView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { stub, passThrough, calculatePlan, createContext } = vi.hoisted(() => ({
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
	useFIOBurn: () => ({ burnTable: ref([]), planTable: ref([]) }),
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
async function mountView() {
	const { wrapper } = await mountComponent(FIOBurnView);
	const loader = wrapper.findComponent(WrapperPlanningDataLoader);
	loader.vm.$emit("data:empire:list", empires);
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

describe("FIOBurnView", () => {
	beforeEach(() => {
		calculatePlan.mockClear();
		createContext.mockReset().mockResolvedValue({});
	});

	it("calculates the plans of the selected empire", async () => {
		const wrapper = await mountView();
		await complete(wrapper);

		expect(calculatedEmpires()).toEqual(["E1"]);
		expect(createContext).toHaveBeenCalledWith({}, "OT-580b", "CX1");
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
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		createContext.mockRejectedValue(new Error("no context"));

		const wrapper = await mountView();
		await complete(wrapper);

		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false);
		expect(calculatePlan).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith(new Error("no context"));
		error.mockRestore();
	});
});
