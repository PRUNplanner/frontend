import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanProductionRecipe from "@/features/planning/components/PlanProductionRecipe.vue";
import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String, amount: Number },
		render: () => h("span"),
	},
}));

const HOUR = 60 * 60 * 1000;
const CX_UUID = "cx-uuid";

const m = (ticker: string, amount: number) => ({
	material_ticker: ticker,
	material_amount: amount,
});

const FE: IRecipeBuildingOption = {
	recipe_id: "R_FE",
	building_ticker: "SME",
	recipe_name: "R_FE",
	time_ms: 12 * HOUR,
	inputs: [m("FEO", 2), m("C", 1)],
	outputs: [m("FE", 1)],
	dailyRevenue: 500,
	roi: 20,
	profitPerArea: 5,
};

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
			planetId: "ZV-307c",
			...props,
		},
		{ pinia }
	);
}

const body = () => new DOMWrapper(document.body);
const recipeButton = (wrapper: VueWrapper) =>
	wrapper.find("[data-recipe-button]");
const cogmButton = (wrapper: VueWrapper) =>
	wrapper.find('button[aria-label="plan.production.cogm_label"]');
const deleteButton = (wrapper: VueWrapper) =>
	wrapper.find('button[aria-label="plan.production.delete_recipe"]');

describe("PlanProductionRecipe", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		trackEvent.mockReset();
	});

	it("shows inputs → outputs for all buildings and the runtime", async () => {
		const { wrapper } = await mountRecipe();

		expect(wrapper.find("[data-recipe-row]").exists()).toBe(true);
		// per run times the 2 buildings
		expect(
			wrapper
				.findAllComponents(MaterialTile)
				.map((t) => [t.props("ticker"), t.props("amount")])
		).toEqual([
			["FEO", 4],
			["C", 2],
			["FE", 2],
		]);
		expect(recipeButton(wrapper).text()).toContain("→");
		expect(wrapper.text()).toContain("1d 0h 0m");
	});

	it("leaves out the arrow for a recipe without inputs", async () => {
		const { wrapper } = await mountRecipe({
			recipeData: recipe({ recipe: { ...FE, inputs: [] } }),
		});

		expect(recipeButton(wrapper).text()).not.toContain("→");
	});

	it("opens the picker for its order, expanded while open", async () => {
		const { wrapper, component, setProps } = await mountRecipe();

		expect(recipeButton(wrapper).attributes("aria-expanded")).toBe("false");
		await recipeButton(wrapper).trigger("click");
		expect(component.emitted("open:picker")).toEqual([[3]]);

		await setProps({ pickerOpen: true });
		expect(recipeButton(wrapper).attributes("aria-expanded")).toBe("true");
	});

	it("shows the daily share as a bar and percent", async () => {
		const { wrapper, setProps } = await mountRecipe();
		const bar = () => wrapper.find("[data-share-bar]");

		expect(bar().attributes("style")).toBe("width: 50%;");
		expect(wrapper.text()).toContain("50.0 %");

		await setProps({ recipeData: recipe({ dailyShare: 0.25 }) });
		expect(bar().attributes("style")).toBe("width: 25%;");
		expect(wrapper.text()).toContain("25.0 %");
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

	it("emits deleting the recipe", async () => {
		const { wrapper, component } = await mountRecipe();

		await deleteButton(wrapper).trigger("click");

		expect(component.emitted("delete:building:recipe")).toEqual([[3]]);
	});

	it("read-only: the recipe shows, but can't be changed or deleted", async () => {
		const { wrapper, component } = await mountRecipe({ disabled: true });

		expect(
			wrapper.findComponent(PInputNumber).find("input").element.disabled
		).toBe(true);
		expect(
			(recipeButton(wrapper).element as HTMLButtonElement).disabled
		).toBe(true);
		await recipeButton(wrapper).trigger("click");
		expect(deleteButton(wrapper).exists()).toBe(false);
		expect(component.emitted()).toEqual({});
		// COGM stays open to everyone
		expect(
			(cogmButton(wrapper).element as HTMLButtonElement).disabled
		).toBe(false);
	});

	it("marks a recipe the shared plan didn't have as new", async () => {
		const { wrapper, setProps } = await mountRecipe();
		expect(wrapper.text()).not.toContain("sharing.compare.new");

		await setProps({ isNew: true });
		expect(recipeButton(wrapper).text()).toContain("sharing.compare.new");
	});

	it("enables COGM whenever there is COGM data", async () => {
		const { wrapper, setProps } = await mountRecipe();
		const disabled = () =>
			(cogmButton(wrapper).element as HTMLButtonElement).disabled;
		expect(disabled()).toBe(false);
		// icon-only, the label names it and the title shows "COGM"
		expect(cogmButton(wrapper).text()).toBe("");
		expect(cogmButton(wrapper).attributes("title")).toBe(
			"plan.components.production_recipe.buttons.cogm"
		);

		await setProps({ recipeData: recipe({ cogm: undefined }) });
		expect(disabled()).toBe(true);
	});

	it("opens and tracks the COGM with the plan's CX preferences", async () => {
		const { wrapper } = await mountRecipe({ cxUuid: CX_UUID });

		await cogmButton(wrapper).trigger("click");
		await flushPromises();

		expect(wrapper.findComponent(PlanCOGM).props()).toMatchObject({
			cxUuid: CX_UUID,
			planetId: "ZV-307c",
		});
		expect(body().text()).toContain("plan.tools.cogm.prices.title");
		expect(trackEvent).toHaveBeenCalledWith("plan:cogm_open", {
			planet_natural_id: "ZV-307c",
			recipe_id: "R_FE",
		});
	});

	it("opens the COGM without a CX, with the Universe note", async () => {
		const { wrapper } = await mountRecipe();

		await cogmButton(wrapper).trigger("click");
		await flushPromises();

		expect(body().text()).toContain("plan.tools.cogm.info");
		expect(body().text()).toContain("plan.tools.cogm.no_preference");
		expect(body().text()).not.toContain("plan.tools.cogm.prices.title");
	});
});
