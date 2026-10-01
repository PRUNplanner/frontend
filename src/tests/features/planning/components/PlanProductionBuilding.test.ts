import { describe, it, expect, beforeEach, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PValue from "@/ui/components/PValue.vue";
import PTooltip from "@/ui/components/PTooltip.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuilding,
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";

const typical = vi.hoisted(() => ({
	value: undefined as ITypicalRecipes | undefined,
}));
vi.mock("@/features/plan_analytics/usePlanetInsights", () => ({
	usePlanetInsights: () => ({ typicalRecipes: () => typical.value }),
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("span"),
	},
}));

// PlanProductionRecipe has its own test, the stub only keeps the props
vi.mock("@/features/planning/components/PlanProductionRecipe.vue", () => ({
	default: {
		name: "PlanProductionRecipe",
		props: {
			disabled: Boolean,
			recipeIndex: Number,
			recipeData: Object,
			recipeOptions: Array,
			cxUuid: String,
			planetId: String,
		},
		render: () => h("div"),
	},
}));

const OPTION = { recipe_id: "SME#FE" } as IRecipeBuildingOption;
const recipe = (recipeId: string) =>
	({ recipeId, amount: 1 }) as IProductionBuildingRecipe;

function building(
	overrides: Partial<IProductionBuilding> = {}
): IProductionBuilding {
	return {
		name: "SME",
		amount: 3,
		areaUsed: 105,
		activeRecipes: [recipe("SME#FE"), recipe("SME#AL")],
		recipeOptions: [OPTION],
		totalEfficiency: 1.3375,
		efficiencyElements: [
			{ efficiencyType: "COGC", value: 1.25 },
			{ efficiencyType: "EXPERT", value: 1.07 },
		],
		totalBatchTime: 0,
		constructionMaterials: [],
		constructionCost: 123456.789,
		workforceMaterials: [],
		workforceDailyCost: 0,
		dailyRevenue: 2500,
		expertise: "METALLURGY",
		...overrides,
	};
}

async function mountBuilding(props: Record<string, unknown> = {}) {
	return mountComponent(PlanProductionBuilding, {
		disabled: false,
		buildingData: building(),
		buildingIndex: 2,
		cxUuid: "cx-uuid",
		planetId: "ZV-307c",
		...props,
	});
}

const expertise = (wrapper: VueWrapper) =>
	wrapper
		.findAll("span")
		.filter((s) => s.text().endsWith("game.expertise.METALLURGY"))
		.at(-1)!;

function button(wrapper: VueWrapper, text: string) {
	return wrapper.findAll("button").find((b) => b.text() === text);
}

const ADD_RECIPE = "plan.components.production_building.buttons.add_recipe";
const PER_BUILDING =
	"plan.components.production_building.table.construction_per_building";

describe("PlanProductionBuilding", () => {
	it("shows amount, name and the building figures", async () => {
		const { wrapper } = await mountBuilding();
		const text = wrapper.text();

		expect(text).toContain("3x");
		expect(wrapper.find("strong").text()).toBe("SME");
		// 1.3375 * 100
		expect(text).toContain("133.75 %");
		expect(text).toContain("2,500.00");
		expect(text).toContain("105");
		// construction cost for all 3 buildings, shown negated
		expect(text).toContain("-370,370.37");
		expect(
			wrapper.findComponent(PInputNumber).find("input").element.value
		).toBe("3");
	});

	it("shows the single building construction cost in a tooltip", async () => {
		// PTooltip observes its size, the test DOM has no ResizeObserver
		vi.stubGlobal("ResizeObserver", class {
			observe() {}
			disconnect() {}
		});
		// efficiency comes first, construction last
		const hover = (wrapper: VueWrapper) =>
			wrapper
				.findAllComponents(PTooltip)
				.at(-1)!
				.find("div")
				.trigger("mouseenter");

		const { wrapper } = await mountBuilding();
		await hover(wrapper);
		expect(document.body.textContent).toContain(PER_BUILDING);
		expect(document.body.textContent).toContain("-123,456.79");
		// unmounting removes the teleported tooltip
		wrapper.unmount();

		// one building: total and single cost are the same, no tooltip
		const { wrapper: single } = await mountBuilding({
			buildingData: building({ amount: 1 }),
		});
		expect(single.text()).toContain("-123,456.79");
		await hover(single);
		expect(document.body.textContent).not.toContain(PER_BUILDING);
	});

	it("marks the expertise positive with a COGC bonus", async () => {
		const { wrapper, setProps } = await mountBuilding();
		expect(expertise(wrapper).classes()).toContain("text-positive");
		// readable without colour
		expect(expertise(wrapper).text()).toMatch(/^✓/);

		// an expert bonus alone is no COGC match
		await setProps({
			buildingData: building({
				efficiencyElements: [{ efficiencyType: "EXPERT", value: 1.07 }],
			}),
		});
		expect(expertise(wrapper).classes()).toEqual(["text-negative"]);
		expect(expertise(wrapper).text()).toMatch(/^✗/);

		await setProps({ buildingData: building({ efficiencyElements: [] }) });
		expect(expertise(wrapper).classes()).toEqual(["text-negative"]);
	});

	it("shows the revenue with its sign", async () => {
		const { wrapper, setProps } = await mountBuilding();
		const revenue = () => wrapper.findComponent(PValue);

		expect(revenue().classes()).toEqual(["text-positive"]);
		expect(revenue().text()).toMatch(/^\+/);

		await setProps({ buildingData: building({ dailyRevenue: 0 }) });
		expect(revenue().classes()).toEqual([]);

		await setProps({ buildingData: building({ dailyRevenue: -0.01 }) });
		expect(revenue().classes()).toEqual(["text-negative"]);
		expect(revenue().text()).toBe("-0.01");
	});

	it("flags a building without amount", async () => {
		const { wrapper, setProps } = await mountBuilding();
		const row = () => wrapper.find(".border-l-2");

		expect(row().classes()).toContain("border-l-prunplanner");

		await setProps({ buildingData: building({ amount: 0 }) });
		expect(row().classes()).toContain("border-l-negative");
	});

	it("emits the new amount, but not an empty one", async () => {
		const { wrapper, component } = await mountBuilding();
		const input = wrapper.findComponent(PInputNumber);

		input.vm.$emit("update:value", null);
		input.vm.$emit("update:value", undefined);
		expect(component.emitted("update:building:amount")).toBe(undefined);

		input.vm.$emit("update:value", 0);
		await input.find("input").setValue("7");

		expect(component.emitted("update:building:amount")).toEqual([
			[2, 0],
			[2, 7],
		]);
	});

	it("emits a new amount without writing into the result (S9)", async () => {
		const buildingData = building({ amount: 2 });
		const { wrapper, component } = await mountBuilding({ buildingData });

		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 5);

		expect(component.emitted("update:building:amount")).toEqual([[2, 5]]);
		expect(buildingData.amount).toBe(2);
	});

	it("emits adding a recipe and deleting the building", async () => {
		const { wrapper, component } = await mountBuilding();

		await button(wrapper, ADD_RECIPE)!.trigger("click");
		// the icon-only delete button comes last
		await wrapper.findAll("button").at(-1)!.trigger("click");

		expect(component.emitted("add:building:recipe")).toEqual([[2]]);
		expect(component.emitted("delete:building")).toEqual([[2]]);
	});

	it("offers adding a recipe only with recipe options", async () => {
		const { wrapper } = await mountBuilding({
			buildingData: building({ recipeOptions: [] }),
		});

		expect(button(wrapper, ADD_RECIPE)).toBeUndefined();
	});

	it("read-only: disables the amount and hides the buttons", async () => {
		const { wrapper } = await mountBuilding({ disabled: true });

		expect(
			wrapper.findComponent(PInputNumber).find("input").element.disabled
		).toBe(true);
		// no add recipe, delete or amount steppers: only the recipes' COGM
		expect(button(wrapper, ADD_RECIPE)).toBeUndefined();
		expect(
			wrapper.find('button[aria-label="common.buttons.delete"]').exists()
		).toBe(false);
		expect(
			wrapper.findAll("button").every((b) => b.text().includes("cogm"))
		).toBe(true);
		expect(
			wrapper
				.findAllComponents(PlanProductionRecipe)
				.map((r) => r.props("disabled"))
		).toEqual([true, true]);
	});

	it("renders a recipe row per active recipe", async () => {
		const { wrapper } = await mountBuilding();
		const recipes = wrapper.findAllComponents(PlanProductionRecipe);

		expect(
			recipes.map((r) => [
				r.props("recipeIndex"),
				r.props("recipeData").recipeId,
			])
		).toEqual([
			[0, "SME#FE"],
			[1, "SME#AL"],
		]);
		expect(recipes.at(1)!.props()).toMatchObject({
			disabled: false,
			recipeOptions: [OPTION],
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
		});
		expect(wrapper.text()).not.toContain(
			"plan.components.production_building.no_recipe"
		);
	});

	it("adds the building index to the recipe events", async () => {
		const { wrapper, component } = await mountBuilding();
		const second = wrapper.findAllComponents(PlanProductionRecipe).at(1)!;

		second.vm.$emit("update:building:recipe:amount", 1, 5);
		second.vm.$emit("delete:building:recipe", 1);
		second.vm.$emit("update:building:recipe", 1, "SME#CU");

		expect(component.emitted("update:building:recipe:amount")).toEqual([
			[2, 1, 5],
		]);
		expect(component.emitted("delete:building:recipe")).toEqual([[2, 1]]);
		expect(component.emitted("update:building:recipe")).toEqual([
			[2, 1, "SME#CU"],
		]);
	});

	it("shows a hint without active recipes", async () => {
		const { wrapper } = await mountBuilding({
			buildingData: building({ activeRecipes: [] }),
		});

		expect(wrapper.findAllComponents(PlanProductionRecipe)).toHaveLength(0);
		expect(wrapper.text()).toContain(
			"plan.components.production_building.no_recipe"
		);
	});

	it("shows buildings without expertise", async () => {
		const { wrapper } = await mountBuilding({
			buildingData: building({ expertise: null, efficiencyElements: [] }),
		});

		expect(wrapper.text()).toContain("game.expertise.null");
	});

	describe("typical mix hint", () => {
		const MIX_LABEL = "plan.components.production_building.mix_add_label";
		const options = [
			{ recipe_id: "SME#FE", outputs: [{ material_ticker: "FE" }] },
			{ recipe_id: "SME#AL", outputs: [{ material_ticker: "AL" }] },
		] as IRecipeBuildingOption[];
		const empty = () =>
			building({ activeRecipes: [], recipeOptions: options });
		const mixButton = (wrapper: VueWrapper) =>
			wrapper.find(`button[aria-label="${MIX_LABEL}"]`);

		beforeEach(() => {
			typical.value = {
				percentage: 50,
				recipes: [
					{ recipeid: "SME#FE", amount: 3 },
					{ recipeid: "SME#AL", amount: 1 },
					// not a recipe this building can run here
					{ recipeid: "SME#XX", amount: 2 },
				],
			};
		});

		it("adds the mix recipes a building without recipes can run", async () => {
			const { wrapper, component } = await mountBuilding({
				buildingData: empty(),
			});

			expect(wrapper.text()).toContain(
				"plan.components.production_building.mix_hint"
			);
			expect(mixButton(wrapper).text()).toContain("50 %");
			expect(
				wrapper
					.findAllComponents({ name: "MaterialTile" })
					.map((t) => t.props("ticker"))
			).toEqual(["FE", "AL"]);

			await mixButton(wrapper).trigger("click");
			expect(component.emitted("add:building:recipes")).toEqual([
				[
					2,
					[
						{ recipeid: "SME#FE", amount: 3 },
						{ recipeid: "SME#AL", amount: 1 },
					],
				],
			]);
		});

		it("is not shown with recipes, read-only, or without a typical mix", async () => {
			const withRecipes = await mountBuilding();
			expect(mixButton(withRecipes.wrapper).exists()).toBe(false);

			const readOnly = await mountBuilding({
				buildingData: empty(),
				disabled: true,
			});
			expect(mixButton(readOnly.wrapper).exists()).toBe(false);

			typical.value = {
				percentage: 10,
				recipes: [{ recipeid: "SME#XX", amount: 1 }],
			};
			const unknown = await mountBuilding({ buildingData: empty() });
			expect(mixButton(unknown.wrapper).exists()).toBe(false);

			typical.value = undefined;
			const none = await mountBuilding({ buildingData: empty() });
			expect(mixButton(none.wrapper).exists()).toBe(false);
			expect(none.wrapper.text()).toContain(
				"plan.components.production_building.no_recipe"
			);
		});
	});
});
