import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { h, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import ProductionChainView from "@/views/tools/ProductionChainView.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import { PInput, PInputNumber, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, create, useGraph, emptyGraph } = vi.hoisted(() => {
	const emptyGraph = () => ({
		nodes: [] as unknown[],
		edges: [] as unknown[],
		recipeOptions: {} as Record<string, unknown[]>,
		recipeSelection: {} as Record<string, string>,
		materialAnalysis: {},
		expertiseAnalysis: {},
		workforceAnalysis: {},
	});
	const create = vi.fn(async (..._args: unknown[]) => emptyGraph());
	return {
		create,
		emptyGraph,
		useGraph: vi.fn(async () => ({ create })),
		stub: (name: string, props: string[] = []) => ({
			default: { name, props, render: () => h("div") },
		}),
	};
});

// the loader fetches game data, here it only hands through its slot
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () => ({
	default: {
		name: "WrapperGameDataLoader",
		props: {
			loadMaterials: Boolean,
			loadRecipes: Boolean,
			loadBuildings: Boolean,
		},
		setup:
			(_: unknown, { slots }: { slots: Slots }) =>
			() =>
				slots.default?.(),
	},
}));
vi.mock("@/features/production_chain/useGraph", () => ({
	useGraph,
}));
vi.mock("@/features/production_chain/components/GraphVueFlow.vue", () =>
	stub("GraphVueFlow", ["nodes", "edges", "selectedNodeColorType"])
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisMaterials.vue",
	() => stub("GraphAnalysisMaterials", ["materialAnalysis"])
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisExpertise.vue",
	() => stub("GraphAnalysisExpertise", ["expertiseAnalysis"])
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisWorkforce.vue",
	() => stub("GraphAnalysisWorkforce", ["workforceAnalysis"])
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));

describe("ProductionChainView", () => {
	beforeEach(() => {
		create.mockReset();
		create.mockImplementation(async () => emptyGraph());
		vi.mocked(trackEvent).mockClear();
		useGraph.mockClear();
	});

	it("builds the graph once the game data is loaded", async () => {
		const { wrapper } = await mountComponent(ProductionChainView);

		// opened directly, recipes and buildings are still loading: the graph
		// indexes the recipes when created, so it must not exist yet
		expect(useGraph).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();

		wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
		await flushPromises();

		// the default: 1 RAT, no recipe selection, no terminals
		expect(create).toHaveBeenCalledTimes(1);
		expect(create).toHaveBeenCalledWith("RAT", 1, [], "");
		// the default chain on open is not a use of the tool
		expect(trackEvent).not.toHaveBeenCalled();

		// a new material reuses the graph
		wrapper.findComponent(PSelect).vm.$emit("update:value", "DW");
		await flushPromises();
		expect(create).toHaveBeenLastCalledWith("DW", 1, [], "");
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "production_chain",
			material_ticker: "DW",
			amount: 1,
			recipes: [],
			terminals: "",
		});
		expect(useGraph).toHaveBeenCalledTimes(1);
	});

	it("loads the materials its material select offers", async () => {
		const { wrapper } = await mountComponent(ProductionChainView);

		// opened directly, nothing else has loaded the materials yet
		expect(wrapper.findComponent(WrapperGameDataLoader).props()).toEqual({
			loadMaterials: true,
			loadRecipes: true,
			loadBuildings: true,
		});
	});

	describe("with a built chain", () => {
		const graph = () => ({
			...emptyGraph(),
			nodes: [{ id: "n1" }],
			edges: [{ id: "e1" }],
			recipeOptions: {
				FRM: [
					{ label: "grain", value: "FRM#GRAIN" },
					{ label: "fruit", value: "FRM#FRUIT" },
				],
				PP1: [{ label: "only", value: "PP1#ONLY" }],
			},
			recipeSelection: { FRM: "FRM#GRAIN", PP1: "PP1#ONLY" },
			materialAnalysis: { m: 1 },
			expertiseAnalysis: { e: 1 },
			workforceAnalysis: { w: 1 },
		});

		async function open() {
			create.mockImplementation(async () => graph());
			const { wrapper } = await mountComponent(ProductionChainView);
			wrapper.findComponent(WrapperGameDataLoader).vm.$emit("complete");
			await flushPromises();
			return wrapper;
		}

		// material, node colour, then the recipe selects
		const selects = (wrapper: Awaited<ReturnType<typeof open>>) =>
			wrapper.findAllComponents(PSelect);

		it("shows no chain before it is built", async () => {
			const { wrapper } = await mountComponent(ProductionChainView);

			for (const name of [
				"GraphVueFlow",
				"GraphAnalysisMaterials",
				"GraphAnalysisExpertise",
				"GraphAnalysisWorkforce",
			])
				expect(wrapper.findComponent({ name }).exists()).toBe(false);
			expect(selects(wrapper as never)).toHaveLength(2);
		});

		it("hands the built chain to the graph and its analyses", async () => {
			const wrapper = await open();

			const flow = wrapper.findComponent({ name: "GraphVueFlow" });
			expect(flow.props()).toEqual({
				nodes: [{ id: "n1" }],
				edges: [{ id: "e1" }],
				selectedNodeColorType: "Material",
			});
			expect(
				wrapper
					.findComponent({ name: "GraphAnalysisMaterials" })
					.props("materialAnalysis")
			).toEqual({ m: 1 });
			expect(
				wrapper
					.findComponent({ name: "GraphAnalysisExpertise" })
					.props("expertiseAnalysis")
			).toEqual({ e: 1 });
			expect(
				wrapper
					.findComponent({ name: "GraphAnalysisWorkforce" })
					.props("workforceAnalysis")
			).toEqual({ w: 1 });
		});

		it("offers recipes only for buildings with a choice", async () => {
			const wrapper = await open();

			const recipeSelect = selects(wrapper)[2];
			expect(selects(wrapper)).toHaveLength(3);
			expect(recipeSelect.props("value")).toBe("FRM#GRAIN");
			expect(recipeSelect.props("options")).toHaveLength(2);
		});

		it("rebuilds with the picked recipe and reports it", async () => {
			const wrapper = await open();
			create.mockClear();

			selects(wrapper)[2].vm.$emit("update:value", "FRM#FRUIT");
			await flushPromises();

			// the selection of every building goes along, not just the change
			expect(create).toHaveBeenCalledWith(
				"RAT",
				1,
				["FRM#FRUIT", "PP1#ONLY"],
				""
			);
			expect(trackEvent).toHaveBeenCalledWith("tool:use", {
				tool_name: "production_chain",
				material_ticker: "RAT",
				amount: 1,
				recipes: ["FRM#GRAIN", "PP1#ONLY"],
				terminals: "",
			});
		});

		it("rebuilds with the recipe runs, keeping the recipes", async () => {
			const wrapper = await open();
			create.mockClear();

			wrapper.findComponent(PInputNumber).vm.$emit("update:value", 5);
			await flushPromises();

			expect(create).toHaveBeenCalledWith(
				"RAT",
				5,
				["FRM#GRAIN", "PP1#ONLY"],
				""
			);
		});

		it("rebuilds with the terminals, keeping the recipes", async () => {
			const wrapper = await open();
			create.mockClear();

			wrapper.findComponent(PInput).vm.$emit("update:value", "RAT,DW");
			await flushPromises();

			expect(create).toHaveBeenCalledWith(
				"RAT",
				1,
				["FRM#GRAIN", "PP1#ONLY"],
				"RAT,DW"
			);
		});

		it("forgets the recipes for another material", async () => {
			const wrapper = await open();
			create.mockClear();

			selects(wrapper)[0].vm.$emit("update:value", "DW");
			await flushPromises();

			expect(create).toHaveBeenCalledWith("DW", 1, [], "");
		});

		it("colours the nodes by the chosen type and forgets the recipes", async () => {
			const wrapper = await open();
			create.mockClear();

			selects(wrapper)[1].vm.$emit("update:value", "Workforce");
			await flushPromises();

			expect(
				wrapper
					.findComponent({ name: "GraphVueFlow" })
					.props("selectedNodeColorType")
			).toBe("Workforce");
			expect(create).toHaveBeenCalledWith("RAT", 1, [], "");
		});
	});
});
