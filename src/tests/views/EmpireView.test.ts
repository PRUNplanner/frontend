import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import EmpireView from "@/views/EmpireView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const {
	stub,
	passThrough,
	calculatePlan,
	createContext,
	queries,
	toast,
	replace,
} = vi.hoisted(() => ({
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
	calculatePlan: vi.fn(() => ({
		result: {
			profit: 0,
			revenue: 0,
			cost: 0,
			area: { areaUsed: 0 },
			materialio: [],
			storage: {},
		},
	})),
	createContext: vi.fn(async () => ({})),
	queries: [] as string[],
	toast: vi.fn(),
	replace: vi.fn(),
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
vi.mock("@/features/planning/util/materialIO.util", () => ({
	useMaterialIOUtil: () => ({
		// its result only feeds the stubbed EmpireCostOverview
		calculateEmpireCostOverview: () => ({}),
		combineEmpireMaterialIO: () => [],
		empireMaterialIOState: async () => ({ state: true }),
	}),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		execute: async () => {
			queries.push(name);
		},
	}),
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
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock("vue-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-router")>()),
	useRouter: () => ({ replace }),
}));

// the planning loader hands over the empire and its plans
async function mountView(
	props: Record<string, unknown> = {}
): Promise<VueWrapper> {
	const { wrapper } = await mountComponent(EmpireView, props);
	await vi.waitFor(() =>
		expect(wrapper.findComponent(WrapperPlanningDataLoader).exists()).toBe(
			true
		)
	);
	const loader = wrapper.findComponent(WrapperPlanningDataLoader);
	loader.vm.$emit("data:empire:list", [
		{ uuid: "E1", empire_name: "one", plans: [] },
	]);
	loader.vm.$emit("data:empire:plans", [
		{ uuid: "P1", planet_natural_id: "OT-580b" },
	]);
	loader.vm.$emit("update:cx-uuid", "CX1");
	await nextTick();

	await vi.waitFor(() =>
		expect(wrapper.findComponent(WrapperGameDataLoader).exists()).toBe(true)
	);
	wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
	await vi.waitFor(() =>
		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false)
	);
	return wrapper;
}

describe("EmpireView", () => {
	beforeEach(() => {
		queries.length = 0;
		toast.mockClear();
		replace.mockClear();
		calculatePlan.mockClear();
		createContext.mockReset().mockResolvedValue({});
	});

	it("calculates the empire and stores its state", async () => {
		await mountView();

		expect(calculatePlan).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(queries).toContain("PatchEmpireState"));
	});

	it("hides the progress and stores no state when the calculation fails", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		createContext.mockRejectedValue(
			new Error("Planet OT-580b not available.")
		);

		const wrapper = await mountView();
		await nextTick();

		expect(wrapper.findComponent(ComputingProgress).exists()).toBe(false);
		expect(calculatePlan).not.toHaveBeenCalled();
		expect(queries).not.toContain("PatchEmpireState");
		expect(error).toHaveBeenCalledWith(
			new Error("Planet OT-580b not available.")
		);
		error.mockRestore();
	});

	describe("changes from another tab", () => {
		const loader = (wrapper: VueWrapper) =>
			wrapper.findComponent(WrapperPlanningDataLoader);

		it("no notice when the first load picks an empire", async () => {
			const { wrapper } = await mountComponent(EmpireView);
			await vi.waitFor(() => expect(loader(wrapper).exists()).toBe(true));

			loader(wrapper).vm.$emit("update:empire-uuid", "E1");
			await nextTick();

			expect(toast).not.toHaveBeenCalled();
		});

		it.each([
			["the selected empire", {}, false],
			["the route's empire", { empireUuid: "E1" }, true],
		])("deleted: %s says so and switches", async (_, props, leaves) => {
			const wrapper = await mountView(props);

			// the refreshed list lost E1, the loader picks another
			loader(wrapper).vm.$emit("update:empire-uuid", "E2");
			await nextTick();

			expect(toast).toHaveBeenCalledWith(
				"save_conflict.notice.deleted_elsewhere",
				expect.anything()
			);
			if (leaves) expect(replace).toHaveBeenCalledWith("/empire/E2");
			else expect(replace).not.toHaveBeenCalled();
		});

		it("recalculates a refresh without the progress screen", async () => {
			const wrapper = await mountView();
			let finish!: (value: object) => void;
			createContext.mockImplementationOnce(
				() => new Promise((resolve) => (finish = resolve))
			);

			loader(wrapper).vm.$emit("refreshed");
			await vi.waitFor(() =>
				expect(createContext).toHaveBeenCalledTimes(2)
			);

			// the page, and an open form with its edits, stays
			expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
				false
			);
			finish({});
			await vi.waitFor(() =>
				expect(calculatePlan).toHaveBeenCalledTimes(2)
			);
			expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
				false
			);
		});
	});
});
