import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import { flushPromises } from "@vue/test-utils";

import ChainPanel from "@/features/production_chain/components/ChainPanel.vue";
import ChainStepsTable from "@/features/production_chain/components/ChainStepsTable.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	recipeEffects,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import {
	FOOD_PLANET,
	chainInput,
	seedGameData,
	splitInput,
	testContext,
} from "@/tests/features/production_chain/chain.fixtures";

import type { IChainInput } from "@/features/production_chain/engine/chainSolver.types";

// the graph has its own test; here it shows its props and exposes fit/zoom
const { graph } = vi.hoisted(() => ({
	graph: { fit: vi.fn(), zoomBy: vi.fn() },
}));
vi.mock("@/features/production_chain/components/ChainGraph.vue", () => ({
	__esModule: true,
	default: {
		name: "ChainGraph",
		props: ["result", "lines", "focus"],
		emits: ["update:focus", "focused"],
		setup(_: unknown, { expose }: { expose: (e: object) => void }) {
			expose(graph);
			return () => h("div", { "data-testid": "graph-stub" });
		},
	},
}));

const ctx = testContext();

async function mountPanel(input: IChainInput) {
	const result = solveChain(input, ctx);
	const mounted = await mountComponent(ChainPanel, {
		result,
		byproductMode: input.byproducts,
		extraction: ctx.extraction,
		recipeOptions: (t: string) => recipeEffects(input, ctx, t, result),
		bases: input.bases,
	});
	return { ...mounted, result };
}

const button = (
	wrapper: Awaited<ReturnType<typeof mountPanel>>["wrapper"],
	text: string
) => wrapper.findAll("button").find((b) => b.text() === text)!;

describe("ChainPanel", () => {
	beforeAll(seedGameData);

	it("shows the steps, no warnings for a clean chain", async () => {
		const { wrapper } = await mountPanel(chainInput([["DW", 10]]));
		expect(wrapper.findComponent(ChainStepsTable).props("order")).toBe(
			"chain"
		);
		expect(wrapper.text()).toContain("production_chains.panel.summary");
		// order and CSV only on Steps
		await button(wrapper, "production_chains.panel.by_source").trigger(
			"click"
		);
		expect(wrapper.findComponent(ChainStepsTable).props("order")).toBe(
			"source"
		);
	});

	it("filters by a warning chip and forwards Buy all", async () => {
		const { wrapper, component, result } = await mountPanel(
			chainInput([["GWS", 1]])
		);
		const chip = wrapper.find("[data-testid='chain-chip-cheaper']");
		await chip.trigger("click");
		const table = wrapper.findComponent(ChainStepsTable);
		expect(table.props("filter")).toBe("cheaper");
		table.vm.$emit("buyAll", result.warnings.cheaper);
		await flushPromises();
		expect(component.emitted("buyAll")![0]).toEqual([
			result.warnings.cheaper,
		]);
		expect(table.props("filter")).toBeNull();

		await wrapper.find("[data-testid='chain-chip-thin']").trigger("click");
		expect(table.props("filter")).toBe("thin");
		await wrapper.find("[data-testid='chain-chip-thin']").trigger("click");
		expect(table.props("filter")).toBeNull();
		table.vm.$emit("clearFilter");
	});

	it("forwards the table's changes", async () => {
		const { wrapper, component } = await mountPanel(
			chainInput([["DW", 10]])
		);
		const table = wrapper.findComponent(ChainStepsTable);
		table.vm.$emit("source", "H2O", "extract");
		table.vm.$emit("recipe", "DW", "x");
		table.vm.$emit("planet", "H2O");
		expect(component.emitted("source")![0]).toEqual(["H2O", "extract"]);
		expect(component.emitted("recipe")![0]).toEqual(["DW", "x"]);
		expect(component.emitted("planet")![0]).toEqual(["H2O"]);
	});

	it("switches to the graph with its line width and zoom", async () => {
		const { wrapper, component } = await mountPanel(
			chainInput([["DW", 10]])
		);
		await button(wrapper, "production_chains.panel.graph").trigger("click");
		await flushPromises();
		expect(component.emitted("track")![0]).toEqual(["view_graph"]);
		const stub = wrapper.findComponent({ name: "ChainGraph" });
		expect(stub.props("lines")).toBe("t");

		await button(wrapper, "production_chains.panel.lines_c").trigger(
			"click"
		);
		expect(stub.props("lines")).toBe("c");
		await wrapper
			.find("button[aria-label='production_chains.panel.zoom_in']")
			.trigger("click");
		await wrapper
			.find("button[aria-label='production_chains.panel.zoom_out']")
			.trigger("click");
		await button(wrapper, "production_chains.panel.fit").trigger("click");
		expect(graph.zoomBy.mock.calls).toEqual([[1], [-1]]);
		expect(graph.fit).toHaveBeenCalledTimes(1);

		stub.vm.$emit("update:focus", "DW");
		stub.vm.$emit("focused", "DW");
		await flushPromises();
		expect(stub.props("focus")).toBe("DW");
		expect(component.emitted("track")![1]).toEqual(["focus"]);

		await button(wrapper, "production_chains.panel.steps").trigger("click");
		expect(wrapper.findComponent(ChainStepsTable).exists()).toBe(true);
	});

	it("downloads the steps as CSV", async () => {
		const created = vi.fn(() => "blob:x");
		const revoked = vi.fn();
		vi.stubGlobal(
			"URL",
			Object.assign(URL, {
				createObjectURL: created,
				revokeObjectURL: revoked,
			})
		);
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		const { wrapper, component } = await mountPanel(
			chainInput([["DW", 10]])
		);
		await button(wrapper, "production_chains.panel.csv").trigger("click");
		expect(created).toHaveBeenCalledTimes(1);
		expect(click).toHaveBeenCalledTimes(1);
		expect(revoked).toHaveBeenCalledWith("blob:x");
		expect(component.emitted("track")![0]).toEqual(["csv"]);
		click.mockRestore();
	});

	it("names a recipe loop", async () => {
		const result = solveChain(chainInput([["DW", 10]]), ctx);
		result.warnings.cycles = ["A"];
		const { wrapper } = await mountComponent(ChainPanel, {
			result,
			byproductMode: "cover",
			extraction: undefined,
			recipeOptions: () => [],
			bases: [{ id: "A", name: "", planetId: null, cogc: "auto" }],
		});
		expect(wrapper.text()).toContain("production_chains.panel.cycles");
	});
});

describe("ChainPanel base warnings", () => {
	beforeAll(seedGameData);

	it("names steps their base can't run and opens the Bases tab", async () => {
		// farms on a planet without fertility
		const { wrapper } = await mountPanel(splitInput([FOOD_PLANET, null]));
		const chip = wrapper.find("[data-testid='chain-chip-bases']");
		expect(chip.text()).toBe("production_chains.panel.base_warnings");
		expect(wrapper.text()).not.toContain(
			"production_chains.panel.no_warnings"
		);
		await chip.trigger("click");
		expect(wrapper.findComponent(ChainStepsTable).exists()).toBe(false);
		expect(
			button(wrapper, "production_chains.panel.bases").attributes(
				"aria-pressed"
			)
		).toBe("true");
	});
});
