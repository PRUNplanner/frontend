import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { h, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import ProductionChainView from "@/views/tools/ProductionChainView.vue";
import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, create, useGraph } = vi.hoisted(() => {
	const create = vi.fn(async () => ({
		nodes: [],
		edges: [],
		recipeOptions: {},
		recipeSelection: {},
		materialAnalysis: {},
		expertiseAnalysis: {},
		workforceAnalysis: {},
	}));
	return {
		create,
		useGraph: vi.fn(async () => ({ create })),
		stub: (name: string) => ({
			default: { name, render: () => h("div") },
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
	stub("GraphVueFlow")
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisMaterials.vue",
	() => stub("GraphAnalysisMaterials")
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisExpertise.vue",
	() => stub("GraphAnalysisExpertise")
);
vi.mock(
	"@/features/production_chain/components/GraphAnalysisWorkforce.vue",
	() => stub("GraphAnalysisWorkforce")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));

describe("ProductionChainView", () => {
	beforeEach(() => {
		create.mockClear();
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
});
