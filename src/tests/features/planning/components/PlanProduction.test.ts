import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h, ref } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import { buildingsStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import PlanStarterSetup from "@/features/plan_analytics/components/PlanStarterSetup.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PCheckbox from "@/ui/components/PCheckbox.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuilding,
	IProductionBuildingRecipe,
} from "@/features/planning/usePlanCalculation.types";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";

const insights = vi.hoisted(() => ({
	available: { value: false },
	mostPlanned: undefined as string | undefined,
}));
vi.mock("@/features/plan_analytics/usePlanetInsights", () => ({
	usePlanetInsights: () => ({
		isAvailable: insights.available,
		totalPlans: ref(24),
		popularBuildings: ref([
			{ ticker: "PP1", percentage: 58.4 },
			{ ticker: "SME", percentage: 40 },
		]),
		mostPlannedRecipe: () => insights.mostPlanned,
	}),
}));
const trackPlanEdit = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackPlanEdit,
	trackEvent,
}));

// PlanStarterSetup has its own test
vi.mock("@/features/plan_analytics/components/PlanStarterSetup.vue", () => ({
	default: {
		name: "PlanStarterSetup",
		props: { planetId: String, planetResources: Array },
		emits: ["apply", "dismiss"],
		render: () => h("div"),
	},
}));

// PlanProductionBuilding has its own test, the stub only keeps the props
vi.mock("@/features/planning/components/PlanProductionBuilding.vue", () => ({
	default: {
		name: "PlanProductionBuilding",
		props: {
			disabled: Boolean,
			buildingData: Object,
			buildingIndex: Number,
			cxUuid: String,
			planetId: String,
			change: Object,
			folded: Boolean,
			experts: Number,
			picker: { type: [Number, null], default: undefined },
			status: Object,
			materialIO: Array,
			buildings: Array,
		},
		render: () => h("div"),
	},
}));

function building(
	name: string,
	overrides: Partial<IProductionBuilding> = {}
): IProductionBuilding {
	return {
		name,
		amount: 1,
		areaUsed: 0,
		activeRecipes: [],
		recipeOptions: [],
		totalEfficiency: 1,
		efficiencyElements: [],
		totalBatchTime: 0,
		constructionMaterials: [],
		constructionCost: 0,
		workforceMaterials: [],
		workforceDailyCost: 0,
		dailyRevenue: 0,
		expertise: null,
		...overrides,
	};
}

async function mountProduction(
	props: Record<string, unknown> = {},
	messages?: Record<string, unknown>
) {
	return mountComponent(
		PlanProduction,
		{
			disabled: false,
			productionData: {
				buildings: [building("SME"), building("FP")],
				materialio: [],
			},
			cogc: "METALLURGY",
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
			planetResources: [],
			...props,
		},
		{ messages }
	);
}

const children = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PlanProductionBuilding);

const buildingOptions = (wrapper: VueWrapper) =>
	(wrapper.findComponent(PSelect).props("options") as { value: string }[])
		.map((o) => o.value)
		.sort();

describe("PlanProduction", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await useBuildingData().preloadBuildings();
	});

	beforeEach(() => {
		insights.available = ref(false);
		insights.mostPlanned = undefined;
		trackPlanEdit.mockReset();
		trackEvent.mockReset();
	});

	describe("recipe columns", () => {
		// the observer that measures again once the list shows or resizes
		let observed: () => void;
		let target: Element | undefined;
		// the list's own width: 0 while a tool hides it (v-show)
		let shown: number;
		beforeEach(() => {
			shown = 800;
			target = undefined;
			vi.stubGlobal(
				"ResizeObserver",
				class {
					constructor(cb: () => void) {
						observed = cb;
					}
					observe(el: Element) {
						target = el;
					}
					disconnect() {}
				}
			);
		});

		async function mountColumns() {
			const mounted = await mountProduction();
			const root = mounted.wrapper.find('[class~="@container/prod"]')
				.element as HTMLElement;
			Object.defineProperty(root, "offsetWidth", { get: () => shown });
			// tile groups as the recipe rows render them; jsdom lays out
			// nothing, so their tiles get a width of their own
			const group = (attr: string, widths: number[]) => {
				const el = document.createElement("span");
				el.setAttribute(attr, "");
				el.style.columnGap = "6px";
				for (const w of widths) {
					const tile = document.createElement("span");
					Object.defineProperty(tile, "offsetWidth", { value: w });
					el.append(tile);
				}
				root.append(el);
			};
			const column = (side: "in" | "out") =>
				root.style.getPropertyValue(`--recipe-${side}`);
			// a recalculation, as an edit anywhere in the plan brings
			const recalculate = async () => {
				await mounted.setProps({
					productionData: { buildings: [building("SME")], materialio: [] },
				});
				await flushPromises();
			};
			return { ...mounted, root, group, column, recalculate };
		}

		it("sizes them after the plan's widest inputs and outputs", async () => {
			const { group, column, recalculate } = await mountColumns();
			group("data-recipe-inputs", [40, 50]);
			group("data-recipe-inputs", [60, 60, 60]);
			group("data-recipe-outputs", [16, 70]);
			await recalculate();

			// tiles and gaps in one line, plus 2px slack: 3 × 60 + 2 × 6 + 2
			expect(column("in")).toBe("194px");
			// 16 + 6 + 70 + 2
			expect(column("out")).toBe("94px");
		});

		it("keeps them while hidden under a tool, measures once shown", async () => {
			const { root, group, column, recalculate } = await mountColumns();
			group("data-recipe-outputs", [16, 70]);
			await recalculate();

			// hidden, every tile would measure 0
			shown = 0;
			group("data-recipe-outputs", [100, 100]);
			await recalculate();
			expect(column("out")).toBe("94px");

			// the observer watches the list: shown again, 100 + 6 + 100 + 2
			expect(target).toBe(root);
			shown = 800;
			observed();
			await flushPromises();
			expect(column("out")).toBe("208px");
		});

		it("measures a building's recipes once it unfolds", async () => {
			const { wrapper, group, column } = await mountColumns();
			group("data-recipe-outputs", [150, 100]);

			children(wrapper)[0].vm.$emit("toggle:fold");
			await flushPromises();
			// 150 + 6 + 100 + 2
			expect(column("out")).toBe("258px");
		});
	});

	it("offers the planet's popular buildings first", async () => {
		insights.available = ref(true);
		const { wrapper } = await mountProduction();

		const groups = wrapper.findComponent(PSelect).props("options") as {
			label: string;
			children: { value: string; badge?: string }[];
		}[];
		expect(groups.map((g) => g.label)).toEqual([
			"plan.components.production.form.popular_on",
			"All buildings",
		]);
		// SME is in the plan already
		expect(groups[0].children).toEqual([
			expect.objectContaining({ value: "POPULAR#PP1", badge: "58 %" }),
		]);
		expect(groups[1].children.map((c) => c.value)).toContain("PP1");
	});

	it("tracks Match COGC on the building select", async () => {
		const { wrapper } = await mountProduction();

		wrapper.findComponent(PCheckbox).vm.$emit("update:checked", true);
		await flushPromises();
		expect(trackEvent).toHaveBeenCalledWith("plan:cogc_match_toggle", {
			is_active: true,
		});
	});

	it("tracks a building picked from the popular group", async () => {
		insights.available = ref(true);
		const { wrapper, component } = await mountProduction();

		wrapper.findComponent(PSelect).vm.$emit("update:value", "POPULAR#PP1");
		wrapper.findComponent(PSelect).vm.$emit("update:value", "FS");
		await flushPromises();

		expect(component.emitted("create:building")).toEqual([["PP1"], ["FS"]]);
		expect(trackPlanEdit.mock.calls.map((c) => c[0])).toEqual([
			expect.objectContaining({
				building_ticker: "PP1",
				is_from_popular: true,
			}),
			expect.objectContaining({
				building_ticker: "FS",
				is_from_popular: false,
			}),
		]);
	});

	it("tracks without suggestion fields when the planet has no insights", async () => {
		const { wrapper } = await mountProduction();

		wrapper.findComponent(PSelect).vm.$emit("update:value", "PP1");
		children(wrapper).at(1)!.vm.$emit("update:building:recipe", 1, 0, "x");
		await flushPromises();

		// the building and the recipe pick
		expect(trackPlanEdit).toHaveBeenCalledTimes(2);
		trackPlanEdit.mock.calls.forEach(([props]) => {
			expect(props).not.toHaveProperty("is_from_popular");
			expect(props).not.toHaveProperty("is_most_planned");
		});
	});

	it("tracks whether a picked recipe is the most planned one", async () => {
		insights.available = ref(true);
		insights.mostPlanned = "FP#DW";
		const { wrapper } = await mountProduction();

		children(wrapper).at(1)!.vm.$emit("update:building:recipe", 1, 0, "FP#DW");
		children(wrapper).at(1)!.vm.$emit("update:building:recipe", 1, 0, "FP#X");

		expect(trackPlanEdit.mock.calls.map((c) => c[0])).toEqual([
			expect.objectContaining({
				field: "recipe_change",
				is_most_planned: true,
			}),
			expect.objectContaining({
				field: "recipe_change",
				is_most_planned: false,
			}),
		]);
	});

	it("re-emits and tracks adding the typical mix", async () => {
		const { wrapper, component } = await mountProduction();
		const recipes = [
			{ recipeid: "FP#DW", amount: 2 },
			{ recipeid: "FP#X", amount: 1 },
		];

		children(wrapper).at(1)!.vm.$emit("add:building:recipes", 1, recipes);

		expect(component.emitted("add:building:recipes")).toEqual([
			[1, recipes],
		]);
		expect(trackPlanEdit).toHaveBeenCalledWith({
			field: "recipe_mix_add",
			planet_natural_id: "ZV-307c",
			building_ticker: "FP",
			amount: 2,
		});
	});

	it("renders one building row per production building", async () => {
		const { wrapper } = await mountProduction();

		expect(
			children(wrapper).map((c) => [
				c.props("buildingData").name,
				c.props("buildingIndex"),
			])
		).toEqual([
			["SME", 0],
			["FP", 1],
		]);
		expect(children(wrapper).at(1)!.props()).toMatchObject({
			disabled: false,
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
		});
	});

	it("passes disabled and a missing CX on to the buildings", async () => {
		const { wrapper } = await mountProduction({
			disabled: true,
			cxUuid: undefined,
		});

		expect(children(wrapper).at(0)!.props()).toMatchObject({
			disabled: true,
			cxUuid: undefined,
		});
		// read-only: nothing to add a building with
		expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);
		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
	});

	it("offers production buildings not in the plan yet", async () => {
		const { wrapper } = await mountProduction();

		const options = buildingOptions(wrapper);
		// no planetary, infrastructure or habitation buildings
		expect(options).not.toContain("HB1");
		expect(options).not.toContain("COG");
		// already planned
		expect(options).not.toContain("SME");
		expect(options).not.toContain("FP");
		expect(options).toContain("PP1");
		expect(options).toContain("FS");
	});

	it("limits the options to the plan's COGC when matching", async () => {
		const { wrapper } = await mountProduction();

		await wrapper.find("input[type=checkbox]").setValue(true);
		await flushPromises();

		// METALLURGY buildings except the planned SME
		expect(buildingOptions(wrapper)).toEqual([
			"ASM",
			"FS",
			"GF",
			"HWP",
			"SKF",
		]);

		await wrapper.find("input[type=checkbox]").setValue(false);
		await flushPromises();
		expect(buildingOptions(wrapper)).toContain("PP1");
	});

	it("follows a COGC change while matching", async () => {
		const { wrapper, setProps } = await mountProduction();
		await wrapper.find("input[type=checkbox]").setValue(true);

		await setProps({ cogc: "FOOD_INDUSTRIES" });

		// FP is planned already
		expect(buildingOptions(wrapper)).toEqual(["FER", "IVP"]);
	});

	it("emits creating the selected building", async () => {
		const { wrapper, component } = await mountProduction();

		wrapper.findComponent(PSelect).vm.$emit("update:value", "PP1");
		await flushPromises();

		expect(component.emitted("create:building")).toEqual([["PP1"]]);
	});

	it("tracks a recipe added from the picker as recipe_add", async () => {
		insights.available = ref(true);
		insights.mostPlanned = "FP#DW";
		const { wrapper, component } = await mountProduction();

		children(wrapper).at(1)!.vm.$emit("pick:building:recipe", 1, "FP#DW");
		children(wrapper).at(1)!.vm.$emit("pick:building:recipe", 1, "FP#X");

		expect(component.emitted("pick:building:recipe")).toEqual([
			[1, "FP#DW"],
			[1, "FP#X"],
		]);
		expect(trackPlanEdit.mock.calls.map((c) => c[0])).toEqual([
			{
				field: "recipe_add",
				planet_natural_id: "ZV-307c",
				building_ticker: "FP",
				is_most_planned: true,
			},
			{
				field: "recipe_add",
				planet_natural_id: "ZV-307c",
				building_ticker: "FP",
				is_most_planned: false,
			},
		]);
	});

	it("counts buildings, units and recipes, with the column heads once", async () => {
		const recipe = { recipeId: "SME#FE" } as IProductionBuildingRecipe;
		const { wrapper } = await mountProduction(
			{
				productionData: {
					buildings: [
						building("SME", { amount: 3, activeRecipes: [recipe, recipe] }),
						building("FP", { amount: 2, activeRecipes: [recipe] }),
					],
					materialio: [],
				},
			},
			{
				plan: {
					production: { counts: "{buildings} b, {units} u, {recipes} r" },
				},
			}
		);

		expect(wrapper.text()).toContain("2 b, 5 u, 3 r");
		expect(wrapper.findAll("[data-column-heads]")).toHaveLength(1);
	});

	it("passes each building its change, experts and the plan's I/O", async () => {
		const materialIO = [{ ticker: "FE", input: 1, output: 0 }];
		const change = { kinds: ["amount"], newRecipes: [] };
		const { wrapper } = await mountProduction({
			productionData: {
				buildings: [
					building("SME", { expertise: "METALLURGY" }),
					building("FP"),
				],
				materialio: [],
			},
			changes: { buildings: { FP: change }, removed: [] },
			experts: { Metallurgy: { name: "Metallurgy", amount: 3, bonus: 0 } },
			materialIO,
		});

		expect(children(wrapper).map((c) => c.props("change"))).toEqual([
			undefined,
			change,
		]);
		expect(children(wrapper).map((c) => c.props("experts"))).toEqual([3, 0]);
		expect(children(wrapper).at(0)!.props("materialIO")).toEqual(materialIO);
		expect(
			children(wrapper)
				.at(0)!
				.props("buildings")!
				.map((b: IProductionBuilding) => b.name)
		).toEqual(["SME", "FP"]);
	});

	it("lists the buildings the shared plan had but the copy removed", async () => {
		const { wrapper } = await mountProduction({
			changes: { buildings: {}, removed: ["PP1", "HB1"] },
		});

		const removed = wrapper.findAll(".line-through").map((s) => s.text());
		expect(removed).toEqual(["PP1", "HB1"]);
		expect(wrapper.text()).toContain("sharing.compare.removed");
	});

	it("shows the status line at its building only, and passes undo on", async () => {
		const { wrapper, component } = await mountProduction({
			status: { building: 1, recipe: 0, text: "Added FE." },
		});

		expect(children(wrapper).map((c) => c.props("status"))).toEqual([
			undefined,
			{ recipe: 0, text: "Added FE." },
		]);

		children(wrapper).at(1)!.vm.$emit("undo");
		expect(component.emitted("undo")).toEqual([[]]);
	});

	describe("recipe picker", () => {
		const pickers = (wrapper: VueWrapper) =>
			children(wrapper).map((c) => c.props("picker"));

		it("opens one at a time, under the building that asked", async () => {
			const { wrapper } = await mountProduction();
			expect(pickers(wrapper)).toEqual([undefined, undefined]);

			children(wrapper).at(1)!.vm.$emit("open:picker", 0);
			await flushPromises();
			expect(pickers(wrapper)).toEqual([undefined, 0]);

			// add mode in the other building closes the first
			children(wrapper).at(0)!.vm.$emit("open:picker", null);
			await flushPromises();
			expect(pickers(wrapper)).toEqual([null, undefined]);

			children(wrapper).at(0)!.vm.$emit("close:picker");
			await flushPromises();
			expect(pickers(wrapper)).toEqual([undefined, undefined]);
		});

		it.each([
			["pick:building:recipe", [1, "FP#DW"]],
			["update:building:recipe", [1, 0, "FP#DW"]],
		])("closes after %s", async (event, args) => {
			const { wrapper } = await mountProduction();
			children(wrapper).at(1)!.vm.$emit("open:picker", null);
			await flushPromises();
			expect(pickers(wrapper)).toEqual([undefined, null]);

			children(wrapper).at(1)!.vm.$emit(event, ...args);
			await flushPromises();
			expect(pickers(wrapper)).toEqual([undefined, undefined]);
		});
	});

	describe("fold", () => {
		const folded = (wrapper: VueWrapper) =>
			children(wrapper).map((c) => c.props("folded"));
		const toggleAll = (wrapper: VueWrapper) =>
			wrapper
				.findAll("button")
				.find((b) => b.text().startsWith("plan.production."))!;

		it("folds one building, or all of them", async () => {
			const { wrapper } = await mountProduction();
			expect(folded(wrapper)).toEqual([false, false]);
			expect(toggleAll(wrapper).text()).toBe("plan.production.collapse_all");

			children(wrapper).at(1)!.vm.$emit("toggle:fold");
			await flushPromises();
			expect(folded(wrapper)).toEqual([false, true]);

			await toggleAll(wrapper).trigger("click");
			expect(folded(wrapper)).toEqual([true, true]);
			expect(toggleAll(wrapper).text()).toBe("plan.production.expand_all");

			await toggleAll(wrapper).trigger("click");
			expect(folded(wrapper)).toEqual([false, false]);
		});

		it("offers Expand all once every building is folded", async () => {
			const { wrapper } = await mountProduction();

			children(wrapper).at(0)!.vm.$emit("toggle:fold");
			children(wrapper).at(1)!.vm.$emit("toggle:fold");
			await flushPromises();
			expect(toggleAll(wrapper).text()).toBe("plan.production.expand_all");

			children(wrapper).at(0)!.vm.$emit("toggle:fold");
			await flushPromises();
			expect(toggleAll(wrapper).text()).toBe("plan.production.collapse_all");
		});

		it("has no toggle without buildings", async () => {
			const { wrapper } = await mountProduction({
				productionData: { buildings: [], materialio: [] },
			});

			expect(
				wrapper
					.findAll("button")
					.some((b) => b.text().includes("collapse_all"))
			).toBe(false);
		});
	});

	it("re-emits the building events with their payloads", async () => {
		const { wrapper, component } = await mountProduction();
		const fp = children(wrapper).at(1)!;

		fp.vm.$emit("update:building:amount", 1, 4);
		fp.vm.$emit("delete:building", 1);
		fp.vm.$emit("update:building:recipe:amount", 1, 2, 3);
		fp.vm.$emit("delete:building:recipe", 1, 0);
		fp.vm.$emit("pick:building:recipe", 1, "FP#X");
		fp.vm.$emit("update:building:recipe", 1, 0, "FP#DW");

		expect(component.emitted("update:building:amount")).toEqual([[1, 4]]);
		expect(component.emitted("delete:building")).toEqual([[1]]);
		expect(component.emitted("update:building:recipe:amount")).toEqual([
			[1, 2, 3],
		]);
		expect(component.emitted("delete:building:recipe")).toEqual([[1, 0]]);
		expect(component.emitted("pick:building:recipe")).toEqual([[1, "FP#X"]]);
		expect(component.emitted("update:building:recipe")).toEqual([
			[1, 0, "FP#DW"],
		]);
		expect(trackPlanEdit.mock.calls.map((c) => c[0].field)).toEqual([
			"building_amount",
			"recipe_amount",
			"recipe_delete",
			"recipe_add",
			"recipe_change",
		]);
	});

	it("renders no rows without buildings", async () => {
		const { wrapper } = await mountProduction({
			productionData: { buildings: [], materialio: [] },
		});

		expect(children(wrapper)).toHaveLength(0);
		expect(buildingOptions(wrapper)).toContain("SME");
	});


	describe("starter setup", () => {
		const empty = { productionData: { buildings: [], materialio: [] } };
		const starter = (wrapper: VueWrapper) =>
			wrapper.findComponent(PlanStarterSetup);
		const showLink = (wrapper: VueWrapper) =>
			wrapper
				.findAll("button")
				.find((b) => b.text() === "show");

		it("shows the card on an empty plan with insights, tracked once", async () => {
			insights.available = ref(true);
			const { wrapper } = await mountProduction(empty);

			expect(starter(wrapper).exists()).toBe(true);
			expect(starter(wrapper).props("planetId")).toBe("ZV-307c");
			expect(trackEvent).toHaveBeenCalledTimes(1);
			expect(trackEvent).toHaveBeenCalledWith("plan:starter_show", {
				planet_natural_id: "ZV-307c",
				candidate_count: 2,
			});
		});

		it.each([
			["without insights (setting off, below threshold, v1)", false, empty],
			["for a disabled (shared) plan", true, { ...empty, disabled: true }],
			["once the plan has a building", true, {}],
		])("is hidden %s", async (_name, available, props) => {
			insights.available = ref(available);
			const { wrapper } = await mountProduction(props);

			expect(starter(wrapper).exists()).toBe(false);
			expect(showLink(wrapper)).toBeUndefined();
			expect(trackEvent).not.toHaveBeenCalled();
		});

		// the hint stands in for the starter card when there are no insights
		it.each([
			["an empty plan without insights", false, empty, true],
			["an empty plan with the starter card", true, empty, false],
			["a disabled (shared) plan", false, { ...empty, disabled: true }, false],
			["a plan with a building", false, {}, false],
		])("hints at the building select on %s", async (_name, available, props, shown) => {
			insights.available = ref(available);
			const { wrapper } = await mountProduction(props);

			expect(wrapper.find("[data-empty-hint]").exists()).toBe(shown);
		});

		it("Start empty hides it, the link brings it back", async () => {
			insights.available = ref(true);
			const { wrapper } = await mountProduction(empty, {
				// the link sits in an i18n-t slot
				plan: {
					tools: {
						plan_starter: { empty: "No buildings, or {link}", show: "show" },
					},
				},
			});

			starter(wrapper).vm.$emit("dismiss");
			await flushPromises();
			expect(starter(wrapper).exists()).toBe(false);
			expect(trackEvent).toHaveBeenLastCalledWith("plan:starter_dismiss", {
				planet_natural_id: "ZV-307c",
			});

			await showLink(wrapper)!.trigger("click");
			expect(starter(wrapper).exists()).toBe(true);
			// shown once per plan view
			expect(trackEvent).toHaveBeenCalledTimes(2);
		});

		it("passes apply on", async () => {
			insights.available = ref(true);
			const { wrapper, component } = await mountProduction(empty);
			const setup = { buildings: [], experts: [] };

			starter(wrapper).vm.$emit("apply", setup, true);
			expect(component.emitted("apply:starter")).toStrictEqual([
				[setup, true],
			]);
		});
	});
});
