import { flushPromises } from "@vue/test-utils";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { buildingsStore, recipesStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";

import { useProductionOpportunities } from "@/features/empire/useProductionOpportunities";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import { ref, watch } from "vue";
import { IEmpireMaterialIO } from "@/features/empire/empire.types";

const fakeIEmpireMaterialIO: IEmpireMaterialIO[] = [
	{
		ticker: "C",
		input: 5,
		output: 0,
		delta: -5,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: -5,
				input: 5,
				output: 0,
				price: 0,
			},
		],
		outputPlanets: [],
	},
	{
		ticker: "NCS",
		input: 0,
		output: 50,
		delta: 50,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: 50,
				input: 0,
				output: 50,
				price: 0,
			},
		],
		outputPlanets: [],
	},
	{
		ticker: "PG",
		input: 0,
		output: 5,
		delta: 5,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: 50,
				input: 0,
				output: 50,
				price: 0,
			},
		],
		outputPlanets: [],
	},
];

describe("useProductionOpportunities", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("init", async () => {
		const { isLoading, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		expect(isLoading.value).toBeTruthy();

		await loadData();
		expect(isLoading.value).toBeFalsy();
	});

	it("allRecipesList", async () => {
		const { allRecipesList, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(allRecipesList.value.length).toBe(389);
	});

	it("deltaMap", async () => {
		const { deltaMap, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(deltaMap.value.size).toBe(3);
	});

	it("opportunityStats", async () => {
		const { opportunityStats, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(opportunityStats.value).toStrictEqual({
			deltaRequired: 5,
			fullMatch: 1,
			missingMaterial: 26,
			total: 32,
		});
	});

	it("opportunityStats", async () => {
		const { opportunities, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(opportunities.value.length).toBe(32);
	});
});
