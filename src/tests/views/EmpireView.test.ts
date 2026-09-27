import { describe, it, expect, vi } from "vitest";
import { h, nextTick, ref, Slots } from "vue";

import EmpireView from "@/views/EmpireView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
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
	usePreferences: () => ({ defaultEmpireUuid: ref("E1") }),
}));
vi.mock("@/features/empire/components/EmpireMaterialIOFiltered.vue", () =>
	stub("EmpireMaterialIOFiltered")
);
vi.mock("@/features/empire/components/EmpireCostOverview.vue", () =>
	stub("EmpireCostOverview")
);
vi.mock("@/features/empire/components/EmpirePlanList.vue", () =>
	stub("EmpirePlanList")
);
vi.mock("@/features/empire/components/EmpireConfiguration.vue", () =>
	stub("EmpireConfiguration")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
// renders an element, a lone comment node hides the loaders from VTU
vi.mock("@/features/wrapper/components/WrapperGenericError.vue", () => ({
	__esModule: true,
	default: { name: "WrapperGenericError", render: () => h("div") },
}));

describe("EmpireView", () => {
	it("hides the progress when the calculation fails", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		createContext.mockRejectedValue(new Error("no context"));

		const { wrapper } = await mountComponent(EmpireView);
		const loader = wrapper.findComponent(WrapperPlanningDataLoader);
		loader.vm.$emit("data:empire:list", [
			{ uuid: "E1", empire_name: "one" },
		]);
		loader.vm.$emit("data:empire:plans", [
			{ uuid: "P1", planet_natural_id: "OT-580b" },
		]);
		await nextTick();

		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(true);

		wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
		await vi.waitFor(() =>
			expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
				false
			)
		);

		expect(calculatePlan).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith(new Error("no context"));
		error.mockRestore();
	});
});
