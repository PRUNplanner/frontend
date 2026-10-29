import {
	SAVED_AT,
	SHARE_EMPIRE,
	buildingAmounts,
	cxs,
	debugMeta,
	dialog,
	dialogButton,
	draftPlan,
	emitFrom,
	empires,
	lastToast,
	mocks,
	mountView,
	newPlan,
	openDebug,
	press,
	queryCalls,
	respond,
	setupPlanViewSuite,
} from "@/tests/views/PlanView.harness";
import { describe, it, expect, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
import { calcDebug } from "@/lib/debugMode";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { optimizeHabs } from "@/features/planning/calculations/habOptimization";
import {
	etherwindPlan,
	findRecipeSwap,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";

describe("PlanView shared plans, toasts and habs", () => {
	setupPlanViewSuite();

	// -- shared plans ----------------------------------------------------
	const sharedProps = () => ({
		planData: draftPlan(),
		shared: true,
		sharedPlanUuid: "shared-uuid",
	});

	it("prices a shared plan with the default empire of the viewer", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView(
			{ ...sharedProps(), empireList: empires() },
			{
				login: true,
				seed: ({ user, planning }) => {
					planning.setCXs(cxs());
					user.preferences.defaultEmpireUuid = SHARE_EMPIRE;
				},
			}
		);
		await openDebug(wrapper);

		const meta = debugMeta(wrapper);
		expect(meta).toMatchObject({ empire: "Share", cx: "Share CX" });
		expect(
			wrapper.findComponent(SharedPlanBanner).props("priceSource")
		).toBe("sharing.banner.price_cx");
	});

	it("prices a shared plan with universe prices until the viewer has an empire", async () => {
		calcDebug.value = true;
		const { wrapper, setProps } = await mountView(
			{ ...sharedProps(), empireList: [] },
			{ seed: ({ planning }) => planning.setCXs(cxs()) }
		);
		expect(
			wrapper.findComponent(SharedPlanBanner).props("priceSource")
		).toBe("sharing.banner.price_universe");
		await openDebug(wrapper);
		const empireName = () => debugMeta(wrapper).empire;

		// logging in on the page brings the empires, the first one prices
		await setProps({ empireList: empires() });
		expect(empireName()).toBe("PRUN REAL");

		// an empire that is gone is replaced by one of the new list
		await setProps({ empireList: empires().slice(1) });
		expect(empireName()).toBe("RFab Plan");
	});

	it("shows what changed in a shared plan and resets to the shared version", async () => {
		const { wrapper } = await mountView(sharedProps());
		const banner = () => wrapper.findComponent(SharedPlanBanner);
		const production = () => wrapper.findComponent(PlanProduction);
		const original = buildingAmounts(wrapper);

		expect(banner().props("changed")).toBe(false);
		expect(production().props("changes")).toBeUndefined();

		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 7);

		expect(banner().props("changed")).toBe(true);
		expect(production().props("changes")).toBeDefined();
		expect(
			wrapper.findComponent(PlanResultsBar).props("compare")
		).toMatchObject({
			before: expect.any(Object),
			after: expect.any(Object),
		});
		expect(buildingAmounts(wrapper).EXT).toBe(7);

		await emitFrom(wrapper, SharedPlanBanner, "reset");

		expect(buildingAmounts(wrapper)).toEqual(original);
		expect(banner().props("changed")).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("plan:shared_reset", {
			planet_natural_id: "KW-688c",
		});
	});

	function stubClipboard(writeText: (text: string) => Promise<void>) {
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
	}

	it("copies the changes of a shared plan as a summary", async () => {
		const writeText = vi.fn(async () => {});
		stubClipboard(writeText);
		const { wrapper } = await mountView(sharedProps());
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 7);

		await emitFrom(wrapper, SharedPlanBanner, "copy");

		expect(writeText).toHaveBeenCalledTimes(1);
		const text = (writeText.mock.calls as unknown as string[][])[0][0];
		expect(text).toContain("shared-uuid");
		expect(mocks.toast).toHaveBeenCalledWith("sharing.banner.copied");
		expect(trackEvent).toHaveBeenCalledWith("plan:shared_copy_changes", {
			planet_natural_id: "KW-688c",
			change_count: expect.any(Number),
		});
	});

	it("tells when the summary cannot be copied", async () => {
		stubClipboard(() => Promise.reject(new Error("denied")));
		const { wrapper } = await mountView({
			...sharedProps(),
			planData: { ...draftPlan(), plan_name: "Shared" },
		});
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 7);

		await emitFrom(wrapper, SharedPlanBanner, "copy");

		expect(mocks.toast).toHaveBeenCalledWith("sharing.banner.copy_failed", {
			type: "error",
		});
		expect(trackEvent).not.toHaveBeenCalledWith(
			"plan:shared_copy_changes",
			expect.anything()
		);
	});

	it("saves a copy of a shared plan and opens it in place", async () => {
		respond({
			CreatePlan: () => ({ uuid: "copy-uuid", modified_at: SAVED_AT }),
		});
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const mounted = await mountView(
			{ ...sharedProps(), empireList: empires() },
			{ login: true }
		);
		await emitFrom(
			mounted.wrapper,
			PlanProduction,
			"update:building:amount",
			0,
			7
		);
		await emitFrom(mounted.wrapper, SharedPlanBanner, "save");

		await dialog().find("input").setValue("Copy of shared");
		await dialogButton("common.buttons.create").trigger("click");
		await flushPromises();

		expect(queryCalls("CreatePlan")[0][1].data.plan_name).toBe(
			"Copy of shared"
		);
		expect(mocks.push).toHaveBeenCalledWith("/plan/KW-688c/copy-uuid");
		expect(open).not.toHaveBeenCalled();
		expect(trackEvent).toHaveBeenCalledWith("plan:shared_clone", {
			planet_natural_id: "KW-688c",
			modified: true,
		});
		expect(trackEvent).not.toHaveBeenCalledWith(
			"plan:save_as",
			expect.anything()
		);
	});

	it("saves a shared plan as a copy with the shortcut for logged in viewers only", async () => {
		const guest = await mountView(sharedProps());
		press({ key: "s", ctrlKey: true });
		await flushPromises();
		expect(dialog().exists()).toBe(false);
		guest.wrapper.unmount();

		await mountView(sharedProps(), { login: true });
		const event = press({ key: "s", ctrlKey: true });
		await flushPromises();

		expect(event.defaultPrevented).toBe(true);
		expect(dialog().exists()).toBe(true);
		expect(dialog().text()).toContain("sharing.banner.save");
		expect(queryCalls("PatchPlan")).toEqual([]);
	});

	it("copies the changes of an unnamed shared plan", async () => {
		const writeText = vi.fn(async () => {});
		stubClipboard(writeText);
		const { wrapper } = await mountView({
			...sharedProps(),
			planData: { ...draftPlan(), plan_name: undefined },
		});
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 7);

		await emitFrom(wrapper, SharedPlanBanner, "copy");

		expect(writeText).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining("plan.name.untitled")
		);
	});

	it("keeps the empire the viewer already has when the list is refreshed", async () => {
		calcDebug.value = true;
		const { wrapper, setProps } = await mountView(
			{ ...sharedProps(), empireList: empires() },
			{
				login: true,
				seed: ({ user }) => {
					user.preferences.defaultEmpireUuid = SHARE_EMPIRE;
				},
			}
		);
		await openDebug(wrapper);

		// a refreshed list that still holds the empire picks nothing new
		await setProps({ empireList: empires().reverse() });

		expect(debugMeta(wrapper).empire).toBe("Share");
	});

	// -- undo toasts -----------------------------------------------------
	const swap = findRecipeSwap(etherwindPlan());
	const recipeOf = (wrapper: VueWrapper, buildingIndex: number) => {
		const production = wrapper
			.findComponent(PlanProduction)
			.props("productionData") as {
			buildings: { activeRecipes: { recipeId: string }[] }[];
		};
		return production.buildings[buildingIndex].activeRecipes.map(
			(r) => r.recipeId
		);
	};

	it("takes back a deleted building with the toast", async () => {
		const { wrapper } = await mountView();
		const original = buildingAmounts(wrapper);

		await emitFrom(wrapper, PlanProduction, "delete:building", 0);

		expect(Object.keys(buildingAmounts(wrapper))).toHaveLength(
			Object.keys(original).length - 1
		);
		const [text, options] = lastToast();
		expect(text).toBe("plan.history.building_removed");
		expect(options.action.label).toBe("plan.history.undo");

		options.action.onClick();
		await flushPromises();

		expect(buildingAmounts(wrapper)).toEqual(original);
		expect(trackEvent).toHaveBeenCalledWith("plan:undo", {
			trigger: "button",
		});
		// undoing is a change of the history too, the toast is done
		expect(mocks.toast.mock.results[0].value.destroy).toHaveBeenCalled();
	});

	it("takes back a deleted recipe with the toast", async () => {
		const { wrapper } = await mountView();
		const before = recipeOf(wrapper, swap.index);

		await emitFrom(
			wrapper,
			PlanProduction,
			"delete:building:recipe",
			swap.index,
			0
		);

		expect(recipeOf(wrapper, swap.index)).toHaveLength(before.length - 1);
		const [text, options] = lastToast();
		expect(text).toBe("plan.history.recipe_removed");

		options.action.onClick();
		await flushPromises();
		expect(recipeOf(wrapper, swap.index)).toEqual(before);
	});

	it("announces a changed recipe and ignores picking the same one", async () => {
		const { wrapper } = await mountView();
		const before = recipeOf(wrapper, swap.index);

		// the recipe the building already has changes nothing
		await emitFrom(
			wrapper,
			PlanProduction,
			"update:building:recipe",
			swap.index,
			0,
			before[0]
		);
		expect(mocks.toast).not.toHaveBeenCalled();
		expect(recipeOf(wrapper, swap.index)).toEqual(before);

		await emitFrom(
			wrapper,
			PlanProduction,
			"update:building:recipe",
			swap.index,
			0,
			swap.recipeid
		);

		expect(recipeOf(wrapper, swap.index)[0]).toBe(swap.recipeid);
		// a status line under the row, not a toast
		expect(mocks.toast).not.toHaveBeenCalled();
		const status = () =>
			wrapper.findComponent(PlanProduction).props("status");
		expect(status()).toMatchObject({
			building: swap.index,
			recipe: 0,
			text: "plan.picker.replaced",
		});

		await emitFrom(wrapper, PlanProduction, "undo");
		expect(recipeOf(wrapper, swap.index)).toEqual(before);
		expect(trackEvent).toHaveBeenCalledWith("plan:recipe_picker_undo");
		expect(status()).toBeUndefined();
	});

	it("adds a picked recipe as one new order, which undo takes back", async () => {
		const { wrapper } = await mountView();
		const production = () =>
			wrapper.findComponent(PlanProduction).props("productionData") as {
				buildings: {
					activeRecipes: { recipeId: string; amount: number }[];
					recipeOptions: { recipe_id: string }[];
				}[];
			};
		const building = production().buildings[swap.index];
		const count = building.activeRecipes.length;
		const free = building.recipeOptions.find(
			(o) => !building.activeRecipes.some((r) => r.recipeId === o.recipe_id)
		)!.recipe_id;

		await emitFrom(
			wrapper,
			PlanProduction,
			"pick:building:recipe",
			swap.index,
			free
		);

		const added = production().buildings[swap.index].activeRecipes;
		expect(added).toHaveLength(count + 1);
		expect(added.at(-1)).toMatchObject({ recipeId: free, amount: 1 });
		expect(
			wrapper.findComponent(PlanProduction).props("status")
		).toMatchObject({ building: swap.index, recipe: count });

		press({ key: "z", ctrlKey: true });
		await flushPromises();
		expect(production().buildings[swap.index].activeRecipes).toHaveLength(
			count
		);
	});

	it("closes the toast with the next edit and replaces it with the next toast", async () => {
		const { wrapper } = await mountView();

		await emitFrom(wrapper, PlanProduction, "delete:building", 0);
		const first = mocks.toast.mock.results[0].value;
		await emitFrom(wrapper, PlanProduction, "delete:building", 0);
		expect(first.destroy).toHaveBeenCalled();
		expect(mocks.toast).toHaveBeenCalledTimes(2);

		const second = mocks.toast.mock.results[1].value;
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 3);
		expect(second.destroy).toHaveBeenCalled();

		// the last toast does not outlive the page
		await emitFrom(wrapper, PlanProduction, "delete:building", 0);
		const third = mocks.toast.mock.results[2].value;
		wrapper.unmount();
		expect(third.destroy).toHaveBeenCalled();
	});

	// -- starter setup ---------------------------------------------------
	it("builds the starter setup as one undo step and turns auto habs on", async () => {
		const { wrapper } = await mountView({ planData: newPlan() });
		const setup: IStarterSetup = {
			buildings: [
				{
					ticker: "HYF",
					amount: 4,
					recipes: [
						{ recipeid: "HYF#22xH2O 3xNS=>2xCAF", amount: 3 },
					],
				},
				{ ticker: "RIG", amount: 6, recipes: [] },
			],
			experts: [{ type: "Agriculture", amount: 2 }],
		};
		const infrastructure = () =>
			wrapper.findComponent(PlanInfrastructure).props("autoOptimizeHabs");
		expect(infrastructure()).toBe(true);

		await emitFrom(wrapper, PlanProduction, "apply:starter", setup, true);

		expect(buildingAmounts(wrapper)).toEqual({ HYF: 4, RIG: 6 });
		expect(trackEvent).toHaveBeenCalledWith("plan:hab_optimize", {
			goal: "auto",
		});
		expect(trackEvent).toHaveBeenCalledWith("plan:starter_apply", {
			planet_natural_id: "KW-688c",
			building_count: 2,
			expert_count: 2,
			is_selection_changed: true,
		});
		expect(lastToast()[0]).toBe("plan.tools.plan_starter.applied");

		// one undo takes the whole setup back, auto habs stays on
		lastToast()[1].action.onClick();
		await flushPromises();
		expect(buildingAmounts(wrapper)).toEqual({});
		expect(infrastructure()).toBe(true);
	});

	// -- habitation optimisation ----------------------------------------
	const infrastructureOf = (wrapper: VueWrapper) =>
		wrapper
			.findComponent(PlanInfrastructure)
			.props("infrastructureData") as Record<string, number>;
	// the optimizeHabs calls from here on, not those of earlier steps
	const optimizeCallsFromNow = () => {
		const from = vi.mocked(optimizeHabs).mock.calls.length;
		return () => vi.mocked(optimizeHabs).mock.calls.slice(from);
	};

	it("optimises the habs on request and changes only the ones that differ", async () => {
		const { wrapper } = await mountView();
		const before = infrastructureOf(wrapper);
		vi.mocked(optimizeHabs).mockReturnValueOnce({
			status: "optimal",
			result: 0,
			variables: [
				["HB1", before.HB1],
				["HB2", before.HB2 + 3],
			],
		} as never);

		await emitFrom(wrapper, PlanInfrastructure, "optimize-habs", "area");

		expect(optimizeHabs).toHaveBeenLastCalledWith(
			"area",
			expect.anything(),
			expect.anything(),
			expect.any(Number)
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:hab_optimize", {
			goal: "area",
		});
		expect(infrastructureOf(wrapper)).toEqual({
			...before,
			HB2: before.HB2 + 3,
		});
	});

	it("reports a failed optimisation and keeps the habs", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView();
		const before = infrastructureOf(wrapper);
		vi.mocked(optimizeHabs).mockReturnValueOnce({
			status: "infeasible",
			result: NaN,
			variables: [],
		} as never);

		await emitFrom(wrapper, PlanInfrastructure, "optimize-habs", "cost");

		expect(error).toHaveBeenCalledWith(
			"Unable to optimize habs: infeasible"
		);
		expect(infrastructureOf(wrapper)).toEqual(before);
	});

	it("optimises on the auto toggle only when it is turned on", async () => {
		const { wrapper } = await mountView();
		const calls = optimizeCallsFromNow();

		await emitFrom(
			wrapper,
			PlanInfrastructure,
			"update:auto-optimize-habs",
			false,
			"cost"
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:hab_auto_toggle", {
			is_active: false,
		});
		expect(calls()).toEqual([]);

		await emitFrom(
			wrapper,
			PlanInfrastructure,
			"update:auto-optimize-habs",
			true,
			"cost"
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:hab_auto_toggle", {
			is_active: true,
		});
		expect(calls()).toEqual([
			[
				"cost",
				expect.anything(),
				expect.anything(),
				expect.any(Number),
			],
		]);
		expect(
			wrapper.findComponent(PlanInfrastructure).props("autoOptimizeHabs")
		).toBe(true);
	});

	it("re-optimises the habs when the workforce changes, but not on undo", async () => {
		const { wrapper } = await mountView();
		await emitFrom(
			wrapper,
			PlanInfrastructure,
			"update:auto-optimize-habs",
			true,
			"auto"
		);
		const edit = optimizeCallsFromNow();

		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 9);
		// an edit may optimise more than once, the last one counts
		expect(edit()).not.toHaveLength(0);
		expect(optimizeHabs).toHaveBeenLastCalledWith(
			"auto",
			expect.anything(),
			expect.anything(),
			expect.any(Number)
		);

		const undo = optimizeCallsFromNow();
		press({ key: "z", ctrlKey: true });
		await flushPromises();
		expect(undo()).toEqual([]);
	});

	it("leaves the habs alone while auto optimisation is off", async () => {
		const { wrapper } = await mountView();
		const calls = optimizeCallsFromNow();

		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 9);

		expect(calls()).toEqual([]);
	});
});
