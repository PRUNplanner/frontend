import { describe, it, expect, beforeAll, vi } from "vitest";
import { h, ref } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import { buildingsStore, recipesStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import PlanStarterSetup from "@/features/plan_analytics/components/PlanStarterSetup.vue";
import PButton from "@/ui/components/PButton.vue";
import PCheckbox from "@/ui/components/PCheckbox.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { PlanetResource } from "@/features/api/schemas/gameData.schemas";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";

const popular = (ticker: string, percentage: number, median_amount = 1) => ({
	ticker,
	percentage,
	median_amount,
});

// 9 buildings, one more than the card lists
const POPULAR = [
	popular("FP", 90, 2.5),
	popular("HYF", 60, 4),
	popular("INC", 30),
	popular("RIG", 20, 0.4),
	popular("PP1", 19.9),
	popular("SME", 10),
	popular("FRM", 8),
	popular("CHP", 5),
	popular("BMP", 3),
];

vi.mock("@/features/plan_analytics/usePlanetInsights", () => ({
	usePlanetInsights: () => ({
		totalPlans: ref(98),
		popularBuildings: ref(POPULAR),
		experts: ref([
			{ type: "Agriculture", plans_percentage: 80, median_amount: 2 },
			{ type: "Chemistry", plans_percentage: 20, median_amount: 1 },
		]),
		typicalRecipes: (ticker: string) =>
			({
				// the second recipe is not one FP can run
				FP: {
					percentage: 40,
					recipes: [
						{ recipeid: "FP#10xH2O=>7xDW", amount: 2 },
						{ recipeid: "FP#unknown", amount: 1 },
					],
				},
				RIG: {
					percentage: 100,
					recipes: [{ recipeid: "RIG#H2O", amount: 1 }],
				},
			})[ticker],
	}),
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

const RESOURCES: PlanetResource[] = [
	{
		material_ticker: "H2O",
		resource_type: "LIQUID",
		factor: 0.5,
		daily_extraction: 20,
		max_daily_extraction: 20,
	},
];

const mountStarter = () =>
	mountComponent(PlanStarterSetup, {
		planetId: "OT-580b",
		planetResources: RESOURCES,
	});

// the checkbox label holds the ticker and the name
const tickerOf = (c: VueWrapper) => c.find("strong").text();
const rows = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PCheckbox).map((c) => ({
		ticker: tickerOf(c),
		checked: c.props("checked") as boolean,
	}));
const checkbox = (wrapper: VueWrapper, ticker: string) =>
	wrapper
		.findAllComponents(PCheckbox)
		.find((c) => tickerOf(c) === ticker)!;
const applyButton = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PButton)[1];

describe("PlanStarterSetup", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		const { preloadBuildings, preloadRecipes } = useBuildingData();
		await preloadBuildings();
		await preloadRecipes();
	});

	it("lists the 8 most planned, those in 20 % of plans checked", async () => {
		const { wrapper } = await mountStarter();

		expect(rows(wrapper)).toStrictEqual([
			{ ticker: "FP", checked: true },
			{ ticker: "HYF", checked: true },
			{ ticker: "INC", checked: true },
			{ ticker: "RIG", checked: true },
			{ ticker: "PP1", checked: false },
			{ ticker: "SME", checked: false },
			{ ticker: "FRM", checked: false },
			{ ticker: "CHP", checked: false },
		]);
		expect(wrapper.text()).toContain("game.building.FP");
	});

	it("applies the checked buildings, typical amounts and recipes, experts", async () => {
		const { wrapper, component } = await mountStarter();

		await applyButton(wrapper).trigger("click");
		expect(component.emitted("apply")).toStrictEqual([
			[
				{
					buildings: [
						{
							ticker: "FP",
							amount: 3,
							recipes: [{ recipeid: "FP#10xH2O=>7xDW", amount: 2 }],
						},
						{ ticker: "HYF", amount: 4, recipes: [] },
						{ ticker: "INC", amount: 1, recipes: [] },
						{
							ticker: "RIG",
							amount: 1,
							recipes: [{ recipeid: "RIG#H2O", amount: 1 }],
						},
					],
					experts: [{ type: "Agriculture", amount: 2 }],
				},
				false,
			],
		]);
	});

	it("follows the checkboxes and marks the selection as changed", async () => {
		const { wrapper, component } = await mountStarter();

		checkbox(wrapper, "FP").vm.$emit("update:checked", false);
		checkbox(wrapper, "PP1").vm.$emit("update:checked", true);
		await flushPromises();
		expect(checkbox(wrapper, "FP").props("checked")).toBe(false);
		expect(checkbox(wrapper, "PP1").props("checked")).toBe(true);

		await applyButton(wrapper).trigger("click");
		const [setup, isSelectionChanged] = component.emitted("apply")![0] as [
			{ buildings: { ticker: string }[] },
			boolean,
		];
		expect(setup.buildings.map((b) => b.ticker)).toStrictEqual([
			"HYF",
			"INC",
			"RIG",
			"PP1",
		]);
		expect(isSelectionChanged).toBe(true);
	});

	it("disables apply with nothing checked", async () => {
		const { wrapper } = await mountStarter();

		for (const ticker of ["FP", "HYF", "INC", "RIG"])
			checkbox(wrapper, ticker).vm.$emit("update:checked", false);
		await flushPromises();
		expect(applyButton(wrapper).props("disabled")).toBe(true);
	});

	it("Start empty emits dismiss", async () => {
		const { wrapper, component } = await mountStarter();

		await wrapper.findAllComponents(PButton)[0].trigger("click");
		expect(component.emitted("dismiss")).toHaveLength(1);
	});
});
