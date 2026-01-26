import { beforeEach, describe, expect, it } from "vitest";

import { ProductionGraph } from "@/features/production_chain/productionGraph";

// test data
import materials from "@/tests/test_data/api_data_materials.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import planets from "@/tests/test_data/api_data_planets.json";
import {
	materialsStore,
	buildingsStore,
	recipesStore,
	planetsStore,
} from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useMaterialData } from "@/database/services/useMaterialData";
import { flushPromises } from "@vue/test-utils";

describe("productionNode", async () => {
	beforeEach(async () => {
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		//@ts-expect-error mock data
		await planetsStore.setMany(planets);
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		const { preload } = useMaterialData();

		await preloadBuildings();
		await preloadRecipes();
		await preload();
		await flushPromises();
	});

	it("constructor", async () => {
		const graph = new ProductionGraph();
		await graph.init();

		expect(graph.selectedRecipes).toStrictEqual([]);
		expect(graph.terminals).toStrictEqual([]);
		expect(Object.keys(graph.nodes).length).toBe(344);
	});

	it("getNode", async () => {
		const graph = new ProductionGraph();
		await graph.init();
		const node = graph.getNode("RAT");

		expect(node?.materialTicker).toBe("RAT");
	});

	it("subGraph", async () => {
		const graph = new ProductionGraph();
		await graph.init();
		const sub = graph.subGraph(graph.getOrCreateNode("RAT"));

		expect(sub.edges.length).toBe(10);
		expect(sub.nodes.length).toBe(11);
	});

	it("createGraph", async () => {
		const graph = new ProductionGraph();
		await graph.init();
		const result = graph.createGraph("RAT", 1, [], []);

		expect(result.edges.length).toBe(10);
		expect(result.nodes.length).toBe(8);
	});
});
