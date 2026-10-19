import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { ProductionGraph } from "@/features/production_chain/productionGraph";
import { isExtractable } from "@/features/production_chain/productionNode";

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

// planets of a test, the stored ones without an override
const planetSource = vi.hoisted(() => ({
	override: undefined as
		{ planets: unknown[]; reload: () => Promise<void> } | undefined,
}));

vi.mock("@/database/services/usePlanetData", async (importOriginal) => {
	const original =
		await importOriginal<
			typeof import("@/database/services/usePlanetData")
		>();
	return {
		...original,
		usePlanetData: () => {
			const real = original.usePlanetData();
			const fake = planetSource.override;
			return fake
				? { ...real, planets: ref(fake.planets), reload: fake.reload }
				: real;
		},
	};
});

describe("productionNode", async () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		//@ts-expect-error mock data
		await planetsStore.setMany(planets);
		const { preloadBuildings, preloadRecipes } = useBuildingData();

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
		expect(Object.keys(graph.nodes).length).toBe(369);
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

	describe("extractable materials", () => {
		const planetWith = (resources: [string, string][]) => ({
			resources: resources.map(([material_ticker, resource_type]) => ({
				material_ticker,
				resource_type,
			})),
		});

		afterEach(async () => {
			// register the stored planets' materials again
			planetSource.override = undefined;
			await new ProductionGraph().init();
		});

		it("registers resources of known types only", async () => {
			planetSource.override = {
				planets: [
					planetWith([
						["ZZA", "MINERAL"],
						["ZZB", "WEIRD"],
					]),
					planetWith([["ZZC", "LIQUID"]]),
				],
				reload: async () => {},
			};

			await new ProductionGraph().init();

			expect(isExtractable("ZZA")).toBe(true);
			expect(isExtractable("ZZC")).toBe(true);
			expect(isExtractable("ZZB")).toBe(false);
		});

		it("registers nothing without planets", async () => {
			planetSource.override = {
				planets: [],
				reload: async () => {},
			};

			await new ProductionGraph().init();

			expect(isExtractable("H2O")).toBe(false);
		});

		it("carries on without extractables when planets can't load", async () => {
			planetSource.override = {
				planets: [planetWith([["ZZA", "MINERAL"]])],
				reload: async () => {
					throw new Error("no planets");
				},
			};
			const graph = new ProductionGraph();

			await expect(graph.init()).resolves.toBeUndefined();

			expect(isExtractable("ZZA")).toBe(false);
			expect(Object.keys(graph.nodes).length).toBe(369);
		});

		it("offers the extraction first and selects it", async () => {
			planetSource.override = {
				planets: [planetWith([["H2O", "LIQUID"]])],
				reload: async () => {},
			};
			const graph = new ProductionGraph();
			await graph.init();

			const result = graph.createGraph("RAT", 1, [], []);

			expect(result.recipeOptions["H2O"][0]).toStrictEqual({
				label: "RIG#=>H2O",
				value: "RIG#=>H2O",
			});
			expect(result.recipeSelection["H2O"]).toBe("RIG#=>H2O");
			// a material nobody extracts keeps production recipes only
			expect(
				result.recipeOptions["RAT"].map((o) => o.value)
			).not.toContain("EXT#=>RAT");
		});
	});

	describe("graph shape", () => {
		it("a terminal material has no inputs", async () => {
			const graph = new ProductionGraph();
			await graph.init();

			const result = graph.createGraph("RAT", 1, [], ["RAT"]);

			expect(result.nodes.map((n) => n.materialTicker)).toStrictEqual([
				"RAT",
			]);
			expect(result.edges).toStrictEqual([]);
		});

		it("a terminal ingredient ends its branch", async () => {
			const graph = new ProductionGraph();
			await graph.init();
			const full = graph.createGraph("RAT", 1, [], []);
			const inputs = full.edges
				.filter((e) => e.source === "RAT")
				.map((e) => e.target);

			const cut = graph.createGraph("RAT", 1, [], inputs);

			expect(cut.edges.map((e) => e.target).sort()).toStrictEqual(
				[...inputs].sort()
			);
			expect(cut.nodes.length).toBeLessThan(full.nodes.length);
		});

		it("lists an edge once when two branches share an ingredient", async () => {
			const graph = new ProductionGraph();
			await graph.init();
			const raw = graph.subGraph(graph.getOrCreateNode("TRS")).edges;
			expect(new Set(raw.map((e) => e.id)).size).toBeLessThan(raw.length);

			const { edges } = graph.createGraph("TRS", 1, [], []);

			expect(edges.map((e) => e.id)).toStrictEqual([
				...new Set(raw.map((e) => e.id)),
			]);
		});

		it("an unknown material gives an empty graph", async () => {
			const graph = new ProductionGraph();
			await graph.init();

			const result = graph.createGraph("NOPE", 1, [], []);

			expect(result).toStrictEqual({
				nodes: [],
				edges: [],
				recipeOptions: {},
				recipeSelection: {},
			});
		});

		it("an ingredient without a node is not followed", async () => {
			const graph = new ProductionGraph();
			await graph.init();
			const full = graph.subGraph(graph.getOrCreateNode("RAT"));
			delete graph.nodes["H2O"];

			const sub = graph.subGraph(graph.getOrCreateNode("RAT"));

			expect(sub.edges.length).toBeLessThan(full.edges.length);
			expect(sub.edges.some((e) => e.target === "H2O")).toBe(false);
		});
	});
});
