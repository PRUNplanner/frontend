import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
	ProductionNode,
	setExtractableMaterials,
} from "@/features/production_chain/productionNode";
import { buildingsStore, planetsStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { usePlanetData } from "@/database/services/usePlanetData";
import type {
	Planet,
	PlanetResourceType,
} from "@/features/api/schemas/gameData.schemas";

// test data

import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import planets from "@/tests/test_data/api_data_planets.json";

describe("productionNode", async () => {
	let registered: Record<string, string> = {};

	beforeAll(async () => {
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		//@ts-expect-error mock data
		await planetsStore.setMany(planets);

		const { preloadBuildings } = useBuildingData();
		await preloadBuildings();

		// Load extractable materials from planet data
		const { planets: planetsData, reload } = usePlanetData();
		await reload();

		const resourceTypeToBuildingTicker: Record<PlanetResourceType, string> =
			{
				MINERAL: "EXT",
				GASEOUS: "COL",
				LIQUID: "RIG",
			};

		const extractableMaterialsMap: Record<string, string> = {};
		if (planetsData.value) {
			planetsData.value.forEach((planet: Planet) => {
				planet.resources.forEach((resource) => {
					const buildingTicker =
						resourceTypeToBuildingTicker[resource.resource_type];
					if (buildingTicker) {
						extractableMaterialsMap[resource.material_ticker] =
							buildingTicker;
					}
				});
			});
		}
		registered = extractableMaterialsMap;
		setExtractableMaterials(extractableMaterialsMap);

		await flushPromises();
	});

	it("constructor, id, type", async () => {
		const node = new ProductionNode("RAT");
		expect(node.materialTicker).toBe("RAT");
		expect(node.id).toBe("NODE#RAT");
		expect(node.type).toBe("chain");
	});

	it("addRecipe", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");

		node.addRecipe(rat_recipes[0]);
		expect(node.recipes.length).toBe(1);

		// cant add same recipe twice
		node.addRecipe(rat_recipes[0]);
		expect(node.recipes.length).toBe(1);
	});

	it("getOutput", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");
		rat_recipes.forEach((r) => node.addRecipe(r));

		// undefined, as nothing selected
		const result = node.getOutput("RAT", []);
		expect(result).toBeUndefined();

		// check selected
		const selected = node.getOutput("RAT", [
			"FP#1xGRN 1xALG 1xNUT=>10xRAT",
		]);
		expect(selected).toStrictEqual({ materialTicker: "RAT", quantity: 10 });
	});

	it("getInput", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");
		rat_recipes.forEach((r) => node.addRecipe(r));

		// undefined, as nothing selected
		const result = node.getInput([]);
		expect(result).toStrictEqual([
			{
				materialTicker: "H2O",
				quantity: 10,
			},
			{
				materialTicker: "PG",
				quantity: 1,
			},
		]);

		// check selected
		const selected = node.getInput(["FP#1xGRN 1xALG 1xNUT=>10xRAT"]);
		expect(selected).toStrictEqual([
			{
				materialTicker: "GRN",
				quantity: 1,
			},
			{
				materialTicker: "NUT",
				quantity: 1,
			},
			{
				materialTicker: "ALG",
				quantity: 1,
			},
		]);
	});

	it("getRecipe, single match", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");
		rat_recipes.forEach((r) => node.addRecipe(r));

		const result = node.getRecipe([]);
		expect(result).toBeDefined();
	});

	it("getRecipe, exclusion", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("O");
		rat_recipes.forEach((r) => node.addRecipe(r));

		const result = node.getRecipe([]);
		expect(result).toBeDefined();
		expect(result?.building_ticker).toBe("COL");
	});

	it("getRecipe, multiple match error", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");
		rat_recipes.forEach((r) => node.addRecipe(r));

		expect(() =>
			node.getRecipe([
				"FP#1xGRN 1xALG 1xVEG=>10xRAT",
				"FP#1xGRN 1xBEA 1xNUT=>10xRAT",
			])
		).toThrowError();
	});

	it("getBuildingData", async () => {
		const rat_recipes = recipes.filter((f) => f.building_ticker === "FP");

		const node = new ProductionNode("RAT");
		rat_recipes.forEach((r) => node.addRecipe(r));

		const result = await node.getBuildingData([]);
		expect(result?.building_ticker).toBe("FP");

		node.recipes = [];
		const building = await node.getBuildingData(["foo"]);
		expect(building).toBeUndefined();
	});

	describe("recipe selection", () => {
		const fp = () => recipes.filter((f) => f.building_ticker === "FP");

		afterEach(() => setExtractableMaterials(registered));

		it("a node without recipes has no output and no input", () => {
			const node = new ProductionNode("RAT");

			expect(node.getOutput("RAT", ["FP#x"])).toBeUndefined();
			expect(node.getInput(["FP#x"])).toStrictEqual([]);
			expect(node.getRecipe([])).toBeUndefined();
		});

		it("a selected extraction recipe wins over production", () => {
			setExtractableMaterials({ RAT: "RIG" });
			const node = new ProductionNode("RAT");
			fp().forEach((r) => node.addRecipe(r));

			const recipe = node.getRecipe(["RIG#=>RAT"]);

			expect(recipe).toMatchObject({
				recipe_id: "RIG#=>RAT",
				building_ticker: "RIG",
				inputs: [],
				outputs: [{ material_ticker: "RAT", material_amount: 1 }],
			});
			expect(node.getOutput("RAT", ["RIG#=>RAT"])).toStrictEqual({
				materialTicker: "RAT",
				quantity: 1,
			});
			expect(node.getInput(["RIG#=>RAT"])).toStrictEqual([]);
		});

		it("a selected production recipe wins over extraction", () => {
			setExtractableMaterials({ RAT: "RIG" });
			const node = new ProductionNode("RAT");
			fp().forEach((r) => node.addRecipe(r));
			const [first, second] = node.recipes;

			expect(node.getRecipe([second.recipe_id])).toBe(second);
			expect(node.getRecipe([first.recipe_id, "RIG#=>XYZ"])).toBe(first);
		});

		it("extraction stays the default when the selection matches nothing", () => {
			setExtractableMaterials({ RAT: "RIG" });
			const node = new ProductionNode("RAT");
			fp().forEach((r) => node.addRecipe(r));

			expect(node.getRecipe(["unrelated"])?.recipe_id).toBe("RIG#=>RAT");
		});

		it("the first recipe stays the default when the selection matches nothing", () => {
			const node = new ProductionNode("RAT");
			fp().forEach((r) => node.addRecipe(r));

			expect(node.getRecipe(["unrelated"])).toBe(node.recipes[0]);
		});

		it("extracts in an EXT without a registered building", () => {
			setExtractableMaterials({
				RAT: undefined as unknown as string,
			});
			const node = new ProductionNode("RAT");

			expect(node.getRecipe([])).toMatchObject({
				recipe_id: "EXT#=>RAT",
				building_ticker: "EXT",
			});
		});
	});
});
