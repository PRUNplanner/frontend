import { describe, it, expect, beforeAll } from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

const HOUR = 60 * 60 * 1000;
const CX_UUID = "cx-uuid";

const m = (ticker: string, amount: number) => ({
	material_ticker: ticker,
	material_amount: amount,
});

function option(
	id: string,
	outputs: ReturnType<typeof m>[],
	hours: number,
	dailyRevenue: number,
	roi: number
): IRecipeBuildingOption {
	return {
		recipe_id: id,
		building_ticker: "SME",
		recipe_name: id,
		time_ms: hours * HOUR,
		inputs: [m("FEO", 2)],
		outputs,
		dailyRevenue,
		roi,
		profitPerArea: dailyRevenue / 100,
	};
}

// sort keys: FE, AL#N and AL#C (outputs sorted before joining), BSE
const FE = option("R_FE", [m("FE", 1)], 12, 500, 20);
const ALN = option("R_ALN", [m("N", 1), m("AL", 1)], 8, 50, 10);
const ALC = option("R_ALC", [m("C", 1), m("AL", 2)], 6, -100, -3);
const BSE = option("R_BSE", [m("BSE", 1)], 4, 0, 0);

const COGM = {
	runtime: 12 * HOUR,
	runtimeShare: 0.5,
	efficiency: 1,
	degradation: 0,
	degradationShare: 0,
	workforceCost: 0,
	workforceCostTotal: 0,
	inputCost: [],
	inputTotal: 0,
	outputCOGM: [],
	totalCost: 0,
	outputRevenue: 0,
	totalProfit: 0,
};

function recipe(
	overrides: Partial<IProductionBuildingRecipe> = {}
): IProductionBuildingRecipe {
	return {
		recipeId: "R_FE",
		amount: 2,
		recipe: FE,
		dailyShare: 0.5,
		time: 24 * HOUR,
		cogm: COGM,
		...overrides,
	};
}

async function mountRecipe(props: Record<string, unknown> = {}) {
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([
		// @ts-expect-error partial CX
		{
			uuid: CX_UUID,
			cx_name: "CX",
			empires: [],
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		},
	]);
	return mountComponent(
		PlanProductionRecipe,
		{
			disabled: false,
			recipeData: recipe(),
			recipeIndex: 3,
			recipeOptions: [FE, ALN, ALC, BSE],
			planetId: "ZV-307c",
			...props,
		},
		{ pinia }
	);
}

const body = () => new DOMWrapper(document.body);

function button(wrapper: VueWrapper, text: string) {
	const b = wrapper.findAll("button").find((b) => b.text() === text);
	expect(b).toBeDefined();
	return b!;
}

const cogmButton = (wrapper: VueWrapper) =>
	button(wrapper, "plan.components.production_recipe.buttons.cogm");

describe("PlanProductionRecipe", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("shows inputs only when another recipe has the same outputs", async () => {
		const FE2 = {
			...option("R_FE2", [m("FE", 2)], 6, 0, 0),
			inputs: [m("MAG", 1)],
		};
		const { wrapper, setProps } = await mountRecipe();
		expect(wrapper.find(".group").text()).not.toContain("FEO");
		expect(wrapper.find(".group").text()).not.toContain("→");

		await setProps({ recipeOptions: [FE, FE2, ALN] });
		// FEO 2 per run, 2 buildings
		expect(wrapper.find(".group").text()).toContain("FEO");
		expect(wrapper.find(".group").text()).toContain("4x");
		expect(wrapper.find(".group").text()).toContain("→");
	});

	it("shows the outputs of all buildings and the runtime", async () => {
		const { wrapper } = await mountRecipe();

		// FE 1 per run, 2 buildings
		expect(wrapper.find(".group").text()).toContain("2x");
		expect(wrapper.find(".group").text()).toContain("FE");
		expect(wrapper.text()).toContain("1d 0h 0m");
	});

	it("opens the inline picker from the recipe, says when it's open", async () => {
		const { wrapper, component, setProps } = await mountRecipe();
		const opener = wrapper.find("[data-recipe-button]");

		expect(opener.attributes("aria-expanded")).toBe("false");
		expect(opener.attributes("aria-label")).toBe(
			"plan.production.change_recipe"
		);
		await opener.trigger("click");
		expect(component.emitted("open:picker")).toEqual([[3]]);

		await setProps({ pickerOpen: true });
		expect(opener.attributes("aria-expanded")).toBe("true");
	});

	it("emits the new amount, but not an empty one", async () => {
		const { wrapper, component } = await mountRecipe();
		const input = wrapper.findComponent(PInputNumber);

		input.vm.$emit("update:value", null);
		input.vm.$emit("update:value", undefined);
		expect(component.emitted("update:building:recipe:amount")).toBe(
			undefined
		);

		input.vm.$emit("update:value", 0);
		await input.find("input").setValue("5");

		expect(component.emitted("update:building:recipe:amount")).toEqual([
			[3, 0],
			[3, 5],
		]);
	});

	it("disables the amount input", async () => {
		const { wrapper } = await mountRecipe({ disabled: true });

		expect(
			wrapper.findComponent(PInputNumber).find("input").element.disabled
		).toBe(true);
	});

	it("read-only: the recipes show, but can't be changed or deleted", async () => {
		const { wrapper, component } = await mountRecipe({ disabled: true });
		const opener = wrapper.find("[data-recipe-button]");

		expect(opener.attributes("disabled")).toBeDefined();
		expect(opener.attributes("aria-expanded")).toBeUndefined();
		await opener.trigger("click");

		expect(wrapper.find("svg[aria-hidden='true']").exists()).toBe(false);
		expect(
			wrapper.find('button[aria-label="common.buttons.delete"]').exists()
		).toBe(false);
		expect(component.emitted()).toEqual({});
	});

	it("shows the daily share unless the recipe runs all day", async () => {
		const { wrapper, setProps } = await mountRecipe();

		const bar = wrapper.find(".bg-prunplanner");
		expect(bar.attributes("style")).toBe("width: 50%;");
		expect(wrapper.text()).toContain("50.00 %");

		await setProps({ recipeData: recipe({ dailyShare: 1 }) });
		expect(wrapper.find(".bg-prunplanner").exists()).toBe(false);
		expect(wrapper.text()).not.toContain("100.00 %");
	});

	it("enables COGM whenever there is COGM data", async () => {
		const { wrapper, setProps } = await mountRecipe();
		expect(cogmButton(wrapper).element.disabled).toBe(false);
		// icon-only on phones: the label stays its accessible name
		expect(cogmButton(wrapper).attributes("aria-label")).toBe(
			"plan.components.production_recipe.buttons.cogm"
		);

		await setProps({ recipeData: recipe({ cogm: undefined }) });
		expect(cogmButton(wrapper).element.disabled).toBe(true);
	});

	it("opens the COGM with the plan's CX preferences", async () => {
		const { wrapper } = await mountRecipe({ cxUuid: CX_UUID });

		await cogmButton(wrapper).trigger("click");
		await flushPromises();

		const cogm = wrapper.findComponent(PlanCOGM);
		expect(cogm.props()).toMatchObject({
			cxUuid: CX_UUID,
			planetId: "ZV-307c",
		});
		expect(body().text()).toContain("plan.tools.cogm.prices.title");
	});

	it("opens the COGM without a CX, with the Universe note", async () => {
		const { wrapper } = await mountRecipe();

		await cogmButton(wrapper).trigger("click");
		await flushPromises();

		expect(body().text()).toContain("plan.tools.cogm.info");
		expect(body().text()).toContain("plan.tools.cogm.no_preference");
		expect(body().text()).not.toContain("plan.tools.cogm.prices.title");
	});

	it("emits deleting the recipe", async () => {
		const { wrapper, component } = await mountRecipe();

		// the icon-only delete button comes last
		await wrapper.findAll("button").at(-1)!.trigger("click");

		expect(component.emitted("delete:building:recipe")).toEqual([[3]]);
	});
});
