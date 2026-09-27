import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuilding,
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

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
		.filter((s) => s.text() === "game.expertise.METALLURGY")
		.at(-1)!;

function button(wrapper: VueWrapper, text: string) {
	return wrapper.findAll("button").find((b) => b.text() === text);
}

const ADD_RECIPE = "plan.components.production_building.buttons.add_recipe";

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
		// construction cost shown negated
		expect(text).toContain("-123,456.79");
		expect(
			wrapper.findComponent(PInputNumber).find("input").element.value
		).toBe("3");
	});

	it("marks the expertise positive with a COGC bonus", async () => {
		const { wrapper, setProps } = await mountBuilding();
		expect(expertise(wrapper).classes()).toContain("text-positive");

		// an expert bonus alone is no COGC match
		await setProps({
			buildingData: building({
				efficiencyElements: [{ efficiencyType: "EXPERT", value: 1.07 }],
			}),
		});
		expect(expertise(wrapper).classes()).toEqual(["text-negative"]);

		await setProps({ buildingData: building({ efficiencyElements: [] }) });
		expect(expertise(wrapper).classes()).toEqual(["text-negative"]);
	});

	it("colours the revenue by sign, 0 counts as positive", async () => {
		const { wrapper, setProps } = await mountBuilding();
		// the static text-positive is overridden by the ! variants
		const revenue = () => wrapper.find("span.font-bold.text-positive");

		expect(revenue().classes()).toContain("text-positive!");

		await setProps({ buildingData: building({ dailyRevenue: 0 }) });
		expect(revenue().classes()).toContain("text-positive!");

		await setProps({ buildingData: building({ dailyRevenue: -0.01 }) });
		expect(revenue().classes()).toContain("text-negative!");
		expect(revenue().classes()).not.toContain("text-positive!");
	});

	it("flags a building without amount", async () => {
		const { wrapper, setProps } = await mountBuilding();
		const row = () => wrapper.find(".border-l-2");

		expect(row().classes()).toContain("border-l-prunplanner");

		await setProps({ buildingData: building({ amount: 0 }) });
		expect(row().classes()).toContain("border-l-red-500");
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

	it("disables the inputs and buttons", async () => {
		const { wrapper } = await mountBuilding({ disabled: true });

		expect(
			wrapper.findComponent(PInputNumber).find("input").element.disabled
		).toBe(true);
		expect(button(wrapper, ADD_RECIPE)!.element.disabled).toBe(true);
		expect(wrapper.findAll("button").at(-1)!.element.disabled).toBe(true);
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
});
