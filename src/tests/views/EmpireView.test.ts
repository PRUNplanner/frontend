import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import EmpireView from "@/views/EmpireView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { mountComponent } from "@/tests/mountComponent";
import { usePreferences } from "@/features/preferences/usePreferences";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const {
	stub,
	passThrough,
	calculatePlan,
	createContext,
	queries,
	patches,
	toast,
	replace,
	trackEvent,
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
			workforceMaterialIO: [],
			production: { buildings: [] },
			storage: {},
		},
		overview: { dailyDegradationCost: 0, profit: 0 },
	})),
	createContext: vi.fn(async () => ({})),
	queries: [] as string[],
	patches: [] as unknown[],
	toast: vi.fn(),
	replace: vi.fn(),
	trackEvent: vi.fn(),
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
vi.mock("@/features/preferences/usePreferences", () => {
	const defaultEmpireUuid = ref("E1");
	return { usePreferences: () => ({ defaultEmpireUuid }) };
});
vi.mock("@/features/planning/util/materialIO.util", () => ({
	useMaterialIOUtil: () => ({
		// its result only feeds the stubbed EmpireCostOverview
		calculateEmpireCostOverview: () => ({}),
		combineEmpireMaterialIO: () => [],
		empireMaterialIOState: async () => ({ state: true }),
	}),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			queries.push(name);
			if (name === "PatchEmpireState") patches.push(params);
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
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
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
		// one preference for the module, as the store keeps it
		usePreferences().defaultEmpireUuid.value = "E1";
		queries.length = 0;
		patches.length = 0;
		toast.mockClear();
		replace.mockClear();
		trackEvent.mockClear();
		calculatePlan.mockClear();
		createContext.mockReset().mockResolvedValue({});
	});

	it("tracks each switch between the views once", async () => {
		const wrapper = await mountView();
		const button = (key: string) =>
			wrapper.findAll("button").find((b) => b.text() === key)!;
		const views = () =>
			trackEvent.mock.calls
				.filter(([e]) => e === "empire:view_change")
				.map(([, p]) => p);

		await button("empire.views.analysis").trigger("click");
		await button("empire.views.analysis").trigger("click");
		await nextTick();
		expect(views()).toEqual([{ view: "analysis" }]);

		// e.g. a material picked in Analysis opens Material I/O
		wrapper
			.findComponent({ name: "EmpireMaterialIOFiltered" })
			.vm.$emit("update:content", "materialio");
		await nextTick();
		expect(views()).toEqual([{ view: "analysis" }, { view: "materialio" }]);
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

	it("follows the navigation's empire switch, also from a route empire", async () => {
		const { defaultEmpireUuid } = usePreferences();
		const { wrapper, setProps } = await mountComponent(EmpireView, {
			empireUuid: "E1",
		});
		const loader = () => wrapper.findComponent(WrapperPlanningDataLoader);
		await vi.waitFor(() => expect(loader().exists()).toBe(true));
		const selected = () => loader().vm.$attrs["empire-uuid"];
		expect(selected()).toBe("E1");

		// the switch sets the preference, then leaves /empire/E1
		defaultEmpireUuid.value = "E2";
		await nextTick();
		expect(selected()).toBe("E1");
		await setProps({ empireUuid: undefined });
		expect(selected()).toBe("E2");
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

	describe("overlapping calculations", () => {
		const loader = (wrapper: VueWrapper) =>
			wrapper.findComponent(WrapperPlanningDataLoader);
		const planUuids = (wrapper: VueWrapper) =>
			(
				wrapper.findComponent({ name: "EmpirePlanList" }).vm.$attrs[
					"plan-list-data"
				] as { uuid: string }[]
			).map((p) => p.uuid);

		/** Loads an empire's plans and lets the game data loader complete */
		async function load(wrapper: VueWrapper, empire: string, plan: string) {
			loader(wrapper).vm.$emit("update:empire-uuid", empire);
			loader(wrapper).vm.$emit("data:empire:plans", [
				{ uuid: plan, planet_natural_id: "OT-580b" },
			]);
			await nextTick();
			wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
		}

		it("switching empire mid-run ends with the selected one only", async () => {
			const wrapper = await mountView();
			loader(wrapper).vm.$emit("data:empire:list", [
				{ uuid: "E1", empire_name: "one", plans: [] },
				{ uuid: "E2", empire_name: "two", plans: [] },
			]);
			patches.length = 0;
			let finish!: (value: object) => void;
			createContext.mockImplementationOnce(
				() => new Promise((resolve) => (finish = resolve))
			);

			// E2 is still calculating when E1, cached, is picked again
			await load(wrapper, "E2", "P2");
			await vi.waitFor(() =>
				expect(createContext).toHaveBeenCalledTimes(2)
			);
			await load(wrapper, "E1", "P1");
			await vi.waitFor(() => expect(patches).toHaveLength(1));

			finish({});
			await new Promise((r) => setTimeout(r, 10));

			expect(patches).toEqual([
				expect.objectContaining({ empireUuid: "E1" }),
			]);
			expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
				false
			);
			expect(planUuids(wrapper)).toEqual(["P1"]);
			// the stale run never calculated
			expect(calculatePlan).toHaveBeenCalledTimes(1);
		});

		it("a refresh during a run leaves only the refresh's results", async () => {
			const wrapper = await mountView();
			patches.length = 0;
			let finish!: (value: object) => void;
			createContext.mockImplementationOnce(
				() => new Promise((resolve) => (finish = resolve))
			);

			loader(wrapper).vm.$emit("refreshed");
			await vi.waitFor(() =>
				expect(createContext).toHaveBeenCalledTimes(2)
			);
			// the plan changed again while the first refresh calculates
			loader(wrapper).vm.$emit("data:empire:plans", [
				{ uuid: "P3", planet_natural_id: "OT-580b" },
			]);
			loader(wrapper).vm.$emit("refreshed");
			await vi.waitFor(() => expect(patches).toHaveLength(1));
			finish({});
			await new Promise((r) => setTimeout(r, 10));

			expect(planUuids(wrapper)).toEqual(["P3"]);
			expect(patches).toHaveLength(1);
		});
	});
});
