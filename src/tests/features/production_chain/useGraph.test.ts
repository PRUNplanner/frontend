import { beforeAll, describe, expect, it } from "vitest";

import { ProductionNode } from "@/features/production_chain/productionNode";
import { ProductionEdge } from "@/features/production_chain/productionEdge";
import { buildingsStore, recipesStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { flushPromises } from "@vue/test-utils";
import { useGraph } from "@/features/production_chain/useGraph";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";

describe("productionNode", async () => {
	beforeAll(async () => {
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		const { preloadBuildings, preloadRecipes } = useBuildingData();

		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("createFlowNodes", async () => {
		const { createFlowNodes } = await useGraph();
		const result = await createFlowNodes([new ProductionNode("RAT")], []);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("NODE#RAT");
	});

	it("createFlowEdges", async () => {
		const { createFlowEdges } = await useGraph();

		const result = createFlowEdges([new ProductionEdge("FOO", "MOO", 1)]);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("FOO-MOO");
	});

	it("applyDagreLayout", async () => {
		const { createFlowNodes, createFlowEdges, applyDagreLayout } =
			await useGraph();
		const nodes = await createFlowNodes(
			[new ProductionNode("RAT"), new ProductionNode("H2O")],
			[]
		);

		// zero position
		expect(nodes[0].position.x).toBe(0);
		expect(nodes[0].position.y).toBe(0);
		expect(nodes[1].position.x).toBe(0);
		expect(nodes[1].position.y).toBe(0);

		const edges = createFlowEdges([new ProductionEdge("RAT", "H2O", 1)]);

		const result = applyDagreLayout(nodes, edges);

		expect(result.length).toBe(2);

		// have position
		expect(result[0].position.x).not.toBe(0);
		expect(result[0].position.y).not.toBe(0);
		expect(result[1].position.x).not.toBe(0);
		expect(result[1].position.y).not.toBe(0);
	});

	it("create", async () => {
		const { create } = await useGraph();

		const result = await create("RAT");

		expect(result).toBeDefined();
		expect(result.nodes.length).toBe(8);
		expect(result.edges.length).toBe(10);
		expect(Object.keys(result.recipeOptions).length).toBe(5);
		expect(Object.keys(result.recipeSelection).length).toBe(5);
		expect(result.materialAnalysis.length).toBe(8);
		expect(Object.keys(result.expertiseAnalysis).length).toBe(3);
		expect(result.workforceAnalysis.length).toBe(2);
	});
});
