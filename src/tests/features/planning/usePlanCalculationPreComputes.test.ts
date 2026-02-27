import { ref } from "vue";
import { describe, it, expect, beforeAll } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

// Stores

import {
	materialsStore,
	buildingsStore,
	recipesStore,
	exchangesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";

// Composables
import { usePlanCalculationPreComputes } from "@/features/planning/usePlanCalculationPreComputes";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

describe("usePlanCalculationPreComputes", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		// @ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);

		const { preload } = useMaterialData();
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		await preloadBuildings();
		await preloadRecipes();

		await preload();
		await preloadBuildings();
		await flushPromises();
	});

	it("computedBuildingTicker", async () => {
		const fakeBuildings = [{ name: "foo" }, { name: "moo" }];

		const { computedBuildingTicker } = await usePlanCalculationPreComputes(
			// @ts-expect-error mock data
			ref(fakeBuildings),
			ref(undefined),
			ref(undefined),
			ref(undefined),
			ref(""),
			ref({})
		);

		expect(computedBuildingTicker.value).toStrictEqual(["foo", "moo"]);
	});

	it("computedBuildingInformation", async () => {
		const { computeBuildingInformation } =
			await usePlanCalculationPreComputes(
				ref([{ name: "BMP", amount: 1, active_recipes: [] }]),
				ref(undefined),
				ref(undefined),
				ref(undefined),
				ref(""),
				// @ts-expect-error mock data
				ref({})
			);

		const computedData = await computeBuildingInformation();

		const pp1Data = computedData["BMP"];

		expect(pp1Data).toBeDefined();
		expect(pp1Data.buildingData.area_cost).toBe(12);
		expect(pp1Data.buildingData.costs.length).toBe(3);
		expect(pp1Data.buildingRecipes.length).toBe(20);
		expect(pp1Data.constructionCost).toBe(-47075.53049212322);
		expect(pp1Data.constructionMaterials.length).toBe(4);
		expect(pp1Data.workforceMaterials.length).toBe(5);
	});

	describe("computedActiveEmpire", async () => {
		it("no empire uuid present", async () => {
			const { computedActiveEmpire } =
				await usePlanCalculationPreComputes(
					// @ts-expect-error mock data
					ref({}),
					ref(undefined),
					ref(undefined),
					ref(undefined),
					ref(""),
					ref({})
				);

			expect(computedActiveEmpire.value).toBe(undefined);
		});

		it("empire uuid present in options", async () => {
			const { computedActiveEmpire } =
				await usePlanCalculationPreComputes(
					// @ts-expect-error mock data
					ref({}),
					ref(undefined),
					ref("foo"),
					ref([
						{
							uuid: "foo",
						},
						{
							uuid: "moo",
						},
					]),
					ref(""),
					ref({})
				);

			expect(computedActiveEmpire.value).toStrictEqual({ uuid: "foo" });
		});

		it("empire uuid missing in options", async () => {
			const { computedActiveEmpire } =
				await usePlanCalculationPreComputes(
					// @ts-expect-error mock data
					ref({}),
					ref(undefined),
					ref("meow"),
					ref([
						{
							uuid: "foo",
						},
						{
							uuid: "moo",
						},
					]),
					ref(""),
					ref({})
				);

			expect(computedActiveEmpire.value).toBeUndefined();
		});
	});
});
