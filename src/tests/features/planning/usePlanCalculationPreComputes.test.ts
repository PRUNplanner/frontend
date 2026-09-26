import { ref } from "vue";
import { describe, it, expect, beforeAll, vi } from "vitest";
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

const getPlanet = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: () => ({
			...actual.usePlanetData(),
			getPlanet,
		}),
	};
});

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
		const { preloadBuildings, preloadRecipes } = useBuildingData();

		await preloadBuildings();
		await preloadRecipes();

		await preload();
		await preloadBuildings();
		await flushPromises();
	});

	it("computedBuildingTicker", async () => {
		const fakeBuildings = [{ name: "foo" }, { name: "moo" }];

		const { computedBuildingTicker } = usePlanCalculationPreComputes(
			// @ts-expect-error mock data
			ref(fakeBuildings),
			ref(undefined),
			ref(undefined),
			ref(undefined),
			ref("")
		);

		expect(computedBuildingTicker.value).toStrictEqual(["foo", "moo"]);
	});

	it("computedBuildingInformation", async () => {
		const { computeBuildingInformation } = usePlanCalculationPreComputes(
			ref([{ name: "BMP", amount: 1, active_recipes: [] }]),
			ref(undefined),
			ref(undefined),
			ref(undefined),
			ref("foo")
		);

		const computedData = await computeBuildingInformation();

		const pp1Data = computedData["BMP"];

		expect(getPlanet).toHaveBeenCalledWith("foo");

		expect(pp1Data).toBeDefined();
		expect(pp1Data.buildingData.area_cost).toBe(12);
		expect(pp1Data.buildingData.costs.length).toBe(3);
		expect(pp1Data.buildingRecipes.length).toBe(20);
		expect(pp1Data.constructionCost).toBe(-47210.68693274005);
		expect(pp1Data.constructionMaterials.length).toBe(4);
		expect(pp1Data.workforceMaterials.length).toBe(5);
	});

	describe("computedActiveEmpire", async () => {
		it("no empire uuid present", async () => {
			const { computedActiveEmpire } = usePlanCalculationPreComputes(
				// @ts-expect-error mock data
				ref({}),
				ref(undefined),
				ref(undefined),
				ref(undefined),
				ref("")
			);

			expect(computedActiveEmpire.value).toBe(undefined);
		});

		it("empire uuid present in options", async () => {
			const { computedActiveEmpire } = usePlanCalculationPreComputes(
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
				ref("")
			);

			expect(computedActiveEmpire.value).toStrictEqual({ uuid: "foo" });
		});

		it("empire uuid missing in options", async () => {
			const { computedActiveEmpire } = usePlanCalculationPreComputes(
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
				ref("")
			);

			expect(computedActiveEmpire.value).toBeUndefined();
		});
	});
});
