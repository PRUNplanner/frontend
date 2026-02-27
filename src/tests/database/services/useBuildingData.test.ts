import { flushPromises } from "@vue/test-utils";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildingsStore, recipesStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";

import { IBuilding, IPlanetResource } from "@/features/api/gameData.types";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import building_single_tnp from "@/tests/test_data/api_data_building_single_tnp.json";

describe("useBuildingData", async () => {
	beforeAll(async () => {
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("getTotalWorkforce", async () => {
		const { getBuilding } = await useBuildingData();

		const TNP: IBuilding = await getBuilding("TNP");

		const { getTotalWorkforce } = await useBuildingData();

		expect(TNP).toBeDefined();
		expect(getTotalWorkforce(TNP)).toBe(80);
	});

	describe("getBuilding", async () => {
		it("Get valid building", async () => {
			const { getBuilding } = await useBuildingData();
			const TNP: IBuilding = await getBuilding("TNP");

			expect(TNP.building_ticker).toBe(
				building_single_tnp.building_ticker
			);
		});

		it("Get invalid, non-existing building", async () => {
			const { getBuilding } = await useBuildingData();

			await expect(() => getBuilding("FOO")).rejects.toThrowError();
		});
	});

	describe("getProductionBuildingOptions", async () => {
		it("Available production building", async () => {
			const { getProductionBuildingOptions } = await useBuildingData();

			const result = getProductionBuildingOptions([]);

			expect(result.length).toBe(49);
			expect(result[0].value).toBe("AAF");
			expect(result[0].label).toContain("AAF");
		});

		it("Skip non-production building", async () => {
			const { getProductionBuildingOptions } = await useBuildingData();

			const result = getProductionBuildingOptions([]);

			expect(result.length).toBe(49);
		});

		it("Available production building matching COGC", async () => {
			const { getProductionBuildingOptions } = await useBuildingData();

			const result = getProductionBuildingOptions([], "CHEMISTRY");

			expect(result.length).toBe(7);
			expect(result[0].value).toBe("AML");
		});

		it("Available production building not matching COGC", async () => {
			const { getProductionBuildingOptions } = await useBuildingData();

			const result = getProductionBuildingOptions([], "AGRICULTURE");

			expect(result.length).toBe(3);
		});
	});

	describe("getBuildingRecipes", async () => {
		it("Resource Building, no planet resource", async () => {
			const { getBuildingRecipes } = await useBuildingData();

			const result = getBuildingRecipes("EXT");
			expect(result.length).toBe(0);
		});

		it("Resource Building, planet resources", async () => {
			const { getBuildingRecipes } = await useBuildingData();

			const fakePlanetResources: IPlanetResource[] = [
				{
					resource_type: "GASEOUS",
					factor: 1,
					daily_extraction: 3,
					material_ticker: "O",
					max_daily_extraction: 3,
				},
			];

			const result = getBuildingRecipes("COL", fakePlanetResources);
			expect(result.length).toBe(1);
			expect(result[0].building_ticker).toBe("COL");
			expect(result[0].recipe_id).toBe("COL#O");
		});

		it("Production Building, error", async () => {
			const { getBuildingRecipes } = await useBuildingData();
			expect(() => getBuildingRecipes("FOO")).toThrowError();
		});

		it("Production Building, with recipe", async () => {
			const { getBuildingRecipes } = await useBuildingData();

			const result = getBuildingRecipes("BMP");

			expect(result.length).toBe(20);
			expect(result[0].building_ticker).toBe("BMP");
		});
	});

	describe("getBuildingConstructionMaterials", async () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it("No Planet", async () => {
			const testBuilding = {
				costs: [
					{ material_ticker: "Moo", material_amount: 2 },
					{ material_ticker: "Foo", material_amount: 1 },
				],
			};

			vi.mock("@/features/game_data/usePlanetData", async () => {
				return {
					...(await vi.importActual(
						"@/features/game_data/usePlanetData"
					)),
					getPlanetSpecialMaterials: vi.fn().mockResolvedValue([]),
				};
			});

			const { getBuildingConstructionMaterials } =
				await useBuildingData();

			const result = getBuildingConstructionMaterials(
				// @ts-expect-error mock data
				testBuilding,
				undefined
			);
			expect(result).toStrictEqual([
				{
					input: 2,
					output: 0,
					ticker: "Moo",
				},
				{
					input: 1,
					output: 0,
					ticker: "Foo",
				},
			]);
		});

		it("With planet special material", async () => {
			const testBuilding = {
				area_cost: 1,
				costs: [
					{ material_ticker: "Moo", material_amount: 2 },
					{ material_ticker: "Foo", material_amount: 1 },
				],
			};

			const { getBuildingConstructionMaterials } =
				await useBuildingData();

			// @ts-expect-error mock data
			const result = getBuildingConstructionMaterials(testBuilding, {
				Surface: true,
			});
			expect(result).toStrictEqual([
				{
					input: 2,
					output: 0,
					ticker: "Moo",
				},
				{
					input: 1,
					output: 0,
					ticker: "Foo",
				},
				{
					input: 1,
					output: 0,
					ticker: "AEF",
				},
			]);
		});
	});

	describe("getBuildingWorkforceMaterials", async () => {
		it("Calculate a buildings workforce material io", async () => {
			const { getBuildingWorkforceMaterials } = await useBuildingData();

			const testBuilding = {
				pioneers: 20,
				settlers: 30,
				technicians: 40,
				engineers: 50,
				scientists: 60,
			};

			// @ts-expect-error mock building data
			const result = getBuildingWorkforceMaterials(testBuilding);

			expect(result).toStrictEqual([
				{
					input: 16.3,
					output: 0,
					ticker: "DW",
				},
				{
					input: 5.4,
					output: 0,
					ticker: "RAT",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "OVE",
				},
				{
					input: 0.04,
					output: 0,
					ticker: "PWO",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "COF",
				},
				{
					input: 0.15,
					output: 0,
					ticker: "EXO",
				},
				{
					input: 0.15,
					output: 0,
					ticker: "PT",
				},
				{
					input: 0.06,
					output: 0,
					ticker: "REP",
				},
				{
					input: 0.3,
					output: 0,
					ticker: "KOM",
				},
				{
					input: 0.75,
					output: 0,
					ticker: "MED",
				},
				{
					input: 0.2,
					output: 0,
					ticker: "HMS",
				},
				{
					input: 0.04,
					output: 0,
					ticker: "SCN",
				},
				{
					input: 0.04,
					output: 0,
					ticker: "SC",
				},
				{
					input: 0.4,
					output: 0,
					ticker: "ALE",
				},
				{
					input: 3.5000000000000004,
					output: 0,
					ticker: "FIM",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "HSS",
				},
				{
					input: 0.05,
					output: 0,
					ticker: "PDA",
				},
				{
					input: 0.1,
					output: 0,
					ticker: "VG",
				},
				{
					input: 0.5,
					output: 0,
					ticker: "GIN",
				},
				{
					input: 4.2,
					output: 0,
					ticker: "MEA",
				},
				{
					input: 0.12,
					output: 0,
					ticker: "LC",
				},
				{
					input: 0.06,
					output: 0,
					ticker: "WS",
				},
				{
					input: 0.06,
					output: 0,
					ticker: "NST",
				},
				{
					input: 0.6,
					output: 0,
					ticker: "WIN",
				},
			]);
		});
	});
});
