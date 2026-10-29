import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref, type Slots } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import EmpireView from "@/views/EmpireView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import ComputingProgress from "@/layout/components/ComputingProgress.vue";
import { mountComponent } from "@/tests/mountComponent";
import PSelect from "@/ui/components/PSelect.vue";
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
	loadGameData,
	costOverview,
	materialIOState,
	reply,
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
			materialio: [] as {
				ticker: string;
				delta: number;
				price: number;
			}[],
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
	loadGameData: vi.fn(async () => ({})),
	costOverview: vi.fn(() => ({})),
	materialIOState: vi.fn(async () => ({ state: true }) as object | undefined),
	reply: { empires: [] as unknown[], patchFails: false },
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
	usePlanContext: () => ({ loadGameData, createContext }),
}));
vi.mock("@/features/preferences/usePreferences", () => {
	const defaultEmpireUuid = ref("E1");
	return { usePreferences: () => ({ defaultEmpireUuid }) };
});
vi.mock("@/features/planning/useMaterialIOUtil", () => ({
	useMaterialIOUtil: () => ({
		// its result only feeds the stubbed EmpireCostOverview
		calculateEmpireCostOverview: costOverview,
		combineEmpireMaterialIO: () => [],
		empireMaterialIOState: materialIOState,
	}),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			queries.push(name);
			if (name === "PatchEmpireState") {
				patches.push(params);
				if (reply.patchFails) throw new Error("patch failed");
			}
			if (name === "GetAllEmpires") return reply.empires;
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
vi.mock("@/features/empire/components/EmpireEmpty.vue", () =>
	stub("EmpireEmpty")
);
vi.mock("@/features/empire/components/EmpireOnboarding.vue", () =>
	stub("EmpireOnboarding")
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
		loadGameData.mockClear();
		costOverview.mockClear();
		materialIOState.mockClear();
		reply.empires = [];
		reply.patchFails = false;
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

	describe("empire states", () => {
		const E1 = { uuid: "E1", empire_name: "one", plans: [] };
		const E2 = { uuid: "E2", empire_name: "two", plans: [] };
		const loader = (wrapper: VueWrapper) =>
			wrapper.findComponent(WrapperPlanningDataLoader);

		/** Mounts and hands over the lists, without the plans by default */
		async function open(
			empires: object[],
			plans: object[] = [],
			props: Record<string, unknown> = {}
		): Promise<VueWrapper> {
			const { wrapper } = await mountComponent(EmpireView, props);
			await vi.waitFor(() => expect(loader(wrapper).exists()).toBe(true));
			loader(wrapper).vm.$emit("data:empire:list", empires);
			if (plans.length)
				loader(wrapper).vm.$emit("data:empire:plans", plans);
			await nextTick();
			await vi.waitFor(() =>
				expect(
					wrapper.findComponent(WrapperGameDataLoader).exists()
				).toBe(true)
			);
			wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
			await vi.waitFor(() =>
				expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
					false
				)
			);
			// the async children (onboarding, empty) resolve
			await flushPromises();
			return wrapper;
		}

		it("offers to create the first empire and selects it", async () => {
			const wrapper = await open([]);
			const empty = wrapper.findComponent({ name: "EmpireEmpty" });
			expect(empty.exists()).toBe(true);
			expect(
				wrapper.findComponent({ name: "EmpireOnboarding" }).exists()
			).toBe(false);

			empty.vm.$emit("created", "NEW");
			await nextTick();

			expect(loader(wrapper).vm.$attrs["empire-uuid"]).toBe("NEW");
			expect(usePreferences().defaultEmpireUuid.value).toBe("NEW");
		});

		it("onboards an empire without plans, switch only with several", async () => {
			const wrapper = await open([E1]);
			const onboarding = () =>
				wrapper.findComponent({ name: "EmpireOnboarding" });

			expect(onboarding().vm.$attrs.empire).toEqual(E1);
			expect(wrapper.findComponent(PSelect).exists()).toBe(false);
			expect(wrapper.text()).not.toContain("empire.switch_empire");

			loader(wrapper).vm.$emit("data:empire:list", [E1, E2]);
			await nextTick();
			const select = wrapper.findComponent(PSelect);
			expect(select.props("options")).toEqual([
				{ label: "one", value: "E1" },
				{ label: "two", value: "E2" },
			]);

			select.vm.$emit("update:value", "E2");
			await nextTick();
			expect(loader(wrapper).vm.$attrs["empire-uuid"]).toBe("E2");
			expect(usePreferences().defaultEmpireUuid.value).toBe("E2");
			expect(onboarding().vm.$attrs.empire).toEqual(E2);
		});

		it("onboarding saved reloads the empires and recalculates", async () => {
			const wrapper = await open([E1]);
			queries.length = 0;
			patches.length = 0;
			reply.empires = [{ ...E1, empire_name: "renamed" }];

			wrapper
				.findComponent({ name: "EmpireOnboarding" })
				.vm.$emit("reload:empires");

			await vi.waitFor(() => expect(patches).toHaveLength(1));
			expect(queries).toEqual(["GetAllEmpires", "PatchEmpireState"]);
			expect(
				wrapper.findComponent({ name: "EmpireOnboarding" }).vm.$attrs
					.empire
			).toEqual(reply.empires[0]);
		});

		it("an empty select does not clear the empire", async () => {
			const { defaultEmpireUuid } = usePreferences();
			const wrapper = await open([E1, E2]);

			defaultEmpireUuid.value = "";
			await nextTick();
			expect(loader(wrapper).vm.$attrs["empire-uuid"]).toBe("E1");

			wrapper.findComponent(PSelect).vm.$emit("update:value", "");
			await nextTick();
			expect(loader(wrapper).vm.$attrs["empire-uuid"]).toBe("E1");
			expect(defaultEmpireUuid.value).toBe("");
		});

		it("shows the empire's name, Unknown without a selected one", async () => {
			const wrapper = await open(
				[E1],
				[{ uuid: "P1", planet_natural_id: "OT-580b" }]
			);
			expect(wrapper.find("h1").text()).toBe("one");

			usePreferences().defaultEmpireUuid.value = "";
			await vi.waitFor(() => expect(patches).toHaveLength(1));
			patches.length = 0;
			const unknown = await open(
				[E1],
				[{ uuid: "P1", planet_natural_id: "OT-580b" }]
			);
			expect(unknown.find("h1").text()).toBe("Unknown");
			// no empire to store a state or profits for
			await vi.waitFor(() =>
				expect(materialIOState).toHaveBeenLastCalledWith(undefined, [])
			);
			expect(patches).toEqual([]);
			expect(
				unknown.findComponent({ name: "EmpireConfiguration" }).exists()
			).toBe(false);
		});

		it("a plan's material sold at a loss is taken off the cost", async () => {
			const material = (delta: number, price: number) => ({
				ticker: "RAT",
				delta,
				price,
			});
			calculatePlan.mockReturnValueOnce({
				result: {
					profit: 5,
					revenue: 0,
					cost: 100,
					area: { areaUsed: 7 },
					materialio: [material(-2, -10), material(3, 20)],
					workforceMaterialIO: [],
					production: { buildings: [] },
					storage: {},
				},
				overview: { dailyDegradationCost: 0, profit: 5 },
			});

			await open([E1], [{ uuid: "P1", planet_natural_id: "OT-580b" }]);

			// area used, and the cost minus what the shortfall costs back
			expect(costOverview).toHaveBeenLastCalledWith([], 7, 90);
		});

		it("a failing state patch is logged, a missing state is not sent", async () => {
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const plans = [{ uuid: "P1", planet_natural_id: "OT-580b" }];

			materialIOState.mockResolvedValueOnce(undefined);
			await open([E1], plans);
			await vi.waitFor(() => expect(materialIOState).toHaveBeenCalled());
			await new Promise((r) => setTimeout(r, 10));
			expect(patches).toEqual([]);

			reply.patchFails = true;
			await open([E1], plans);
			await vi.waitFor(() =>
				expect(error).toHaveBeenCalledWith(new Error("patch failed"))
			);
			error.mockRestore();
		});
	});

	describe("main view", () => {
		const loader = (wrapper: VueWrapper) =>
			wrapper.findComponent(WrapperPlanningDataLoader);
		const overview = (wrapper: VueWrapper) => wrapper.find(".min-h-screen");
		const toggle = (wrapper: VueWrapper) =>
			wrapper.find("button[aria-expanded]");

		it("hides and shows the overview column for the main content", async () => {
			const wrapper = await mountView();
			expect(toggle(wrapper).attributes("aria-label")).toBe(
				"empire.overview_hide"
			);
			expect(toggle(wrapper).attributes("aria-expanded")).toBe("true");
			expect(overview(wrapper).classes()).not.toContain("xl:hidden");

			await toggle(wrapper).trigger("click");

			expect(toggle(wrapper).attributes("aria-label")).toBe(
				"empire.overview_show"
			);
			expect(toggle(wrapper).attributes("title")).toBe(
				"empire.overview_show"
			);
			expect(toggle(wrapper).attributes("aria-expanded")).toBe("false");
			expect(overview(wrapper).classes()).toContain("xl:hidden");

			await toggle(wrapper).trigger("click");
			expect(overview(wrapper).classes()).not.toContain("xl:hidden");
		});

		it("opens the production opportunities view", async () => {
			const wrapper = await mountView();
			const io = () =>
				wrapper.findComponent({ name: "EmpireMaterialIOFiltered" });
			expect(io().vm.$attrs.content).toBe("materialio");

			await wrapper
				.findAll("button")
				.find(
					(b) => b.text() === "empire.views.production_opportunities"
				)!
				.trigger("click");

			expect(io().vm.$attrs.content).toBe("opportunities");
			expect(trackEvent).toHaveBeenCalledWith("empire:view_change", {
				view: "opportunities",
			});

			await wrapper
				.findAll("button")
				.find((b) => b.text() === "empire.views.material_io")!
				.trigger("click");
			expect(io().vm.$attrs.content).toBe("materialio");
		});

		it("the empire switch selects and remembers the empire", async () => {
			const wrapper = await mountView();
			wrapper.findComponent(PSelect).vm.$emit("update:value", "E2");
			await nextTick();

			expect(loader(wrapper).vm.$attrs["empire-uuid"]).toBe("E2");
			expect(usePreferences().defaultEmpireUuid.value).toBe("E2");
		});

		it("a changed configuration reloads the empires and recalculates", async () => {
			const wrapper = await mountView();
			queries.length = 0;
			reply.empires = [{ uuid: "E1", empire_name: "renamed", plans: [] }];

			wrapper
				.findComponent({ name: "EmpireConfiguration" })
				.vm.$emit("reload:empires");

			await vi.waitFor(() =>
				expect(calculatePlan).toHaveBeenCalledTimes(2)
			);
			expect(queries[0]).toBe("GetAllEmpires");
			await vi.waitFor(() =>
				expect(wrapper.find("h1").text()).toBe("renamed")
			);
		});

		describe("a run that is replaced meanwhile", () => {
			const gate = () => {
				let open!: (value: object) => void;
				let fail!: (reason: Error) => void;
				const promise = new Promise<object>((resolve, reject) => {
					open = resolve;
					fail = reject;
				});
				return { promise, open, fail };
			};

			it("stops after loading the game data", async () => {
				const wrapper = await mountView();
				patches.length = 0;
				const first = gate();
				loadGameData.mockReturnValueOnce(first.promise);
				const game = wrapper.findComponent(WrapperGameDataLoader);

				game.vm.$emit("complete");
				await vi.waitFor(() =>
					expect(loadGameData).toHaveBeenCalledTimes(2)
				);
				// the second run goes through while the first still waits
				game.vm.$emit("complete");
				await vi.waitFor(() => expect(patches).toHaveLength(1));
				const calls = calculatePlan.mock.calls.length;
				first.open({});
				await new Promise((r) => setTimeout(r, 10));

				expect(calculatePlan).toHaveBeenCalledTimes(calls);
				expect(patches).toHaveLength(1);
			});

			it("does not report the failure of a replaced run", async () => {
				const error = vi
					.spyOn(console, "error")
					.mockImplementation(() => {});
				const wrapper = await mountView();
				const first = gate();
				loadGameData.mockReturnValueOnce(first.promise);
				const game = wrapper.findComponent(WrapperGameDataLoader);

				game.vm.$emit("complete");
				await vi.waitFor(() =>
					expect(loadGameData).toHaveBeenCalledTimes(2)
				);
				game.vm.$emit("complete");
				await vi.waitFor(() =>
					expect(loadGameData).toHaveBeenCalledTimes(3)
				);
				await new Promise((r) => setTimeout(r, 10));
				// game data fails for the first run, long replaced
				first.fail(new Error("old failure"));
				await new Promise((r) => setTimeout(r, 10));

				expect(error).not.toHaveBeenCalled();
				expect(wrapper.findComponent(ComputingProgress).exists()).toBe(
					false
				);
				error.mockRestore();
			});

			it("stops after yielding to the page", async () => {
				const wrapper = await mountView();
				patches.length = 0;
				const game = wrapper.findComponent(WrapperGameDataLoader);

				// a second plan makes the first run calculate, then yield
				loader(wrapper).vm.$emit("data:empire:plans", [
					{ uuid: "P1", planet_natural_id: "OT-580b" },
					{ uuid: "P2", planet_natural_id: "OT-580b" },
				]);
				const result = calculatePlan.getMockImplementation()!();
				// replaced while the first run is in its yield
				calculatePlan.mockImplementationOnce(() => {
					game.vm.$emit("complete");
					return result;
				});
				game.vm.$emit("complete");
				await vi.waitFor(() => expect(patches).toHaveLength(1));
				await new Promise((r) => setTimeout(r, 10));

				expect(patches).toHaveLength(1);
			});
		});
	});
});
