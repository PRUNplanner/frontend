import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import ChainNode from "@/features/production_chain/components/ChainNode.vue";
import type { IFlowNodeData } from "@/features/production_chain/productionGraph.types";
import type { NodeColorType } from "@/features/production_chain/components/ChainNode.types";
import { mountComponent } from "@/tests/mountComponent";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

// handles need a VueFlow instance, stub them with their props
vi.mock("@vue-flow/core", () => ({
	Position: { Left: "left", Right: "right" },
	Handle: {
		name: "Handle",
		props: { id: String, type: String, position: String },
		render: () => h("div"),
	},
}));

const NO_WORKFORCE = {
	Pioneers: 0,
	Settlers: 0,
	Technicians: 0,
	Engineers: 0,
	Scientists: 0,
};

function nodeData(data: Partial<IFlowNodeData> = {}): IFlowNodeData {
	return {
		materialTicker: "DW",
		buildingTicker: "FP",
		buildingExpertise: "FOOD_INDUSTRIES",
		buildingWorkforce: { ...NO_WORKFORCE, Pioneers: 35 },
		amount: 1234.5,
		hasInput: true,
		hasOutput: true,
		...data,
	};
}

async function mountNode(
	colorType: NodeColorType,
	data: Partial<IFlowNodeData> = {}
) {
	return mountComponent(ChainNode, {
		id: "NODE#DW",
		colorType,
		data: nodeData(data),
	});
}

const tile = (wrapper: VueWrapper) => wrapper.find("[id='NODE#DW']");
const style = (wrapper: VueWrapper) => tile(wrapper).attributes("style");
const handles = (wrapper: VueWrapper) =>
	wrapper
		.findAllComponents({ name: "Handle" })
		.map((handle) => handle.props());

describe("ChainNode", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("shows amount, material and building", async () => {
		const { wrapper } = await mountNode("Material");

		expect(
			tile(wrapper)
				.findAll("div")
				.map((d) => d.text())
		).toEqual([
			// thousand separated, two decimals
			"1,234.50",
			"DW",
			"FP",
		]);
		expect(style(wrapper)).toContain("height: 60px; width: 60px;");
	});

	it("drops all-zero decimals of the amount", async () => {
		const { wrapper } = await mountNode("Material", { amount: 3 });

		expect(tile(wrapper).find(".text-xs").text()).toBe("3");
	});

	it("hides a missing building", async () => {
		const { wrapper } = await mountNode("Material", {
			buildingTicker: "N/A",
		});

		expect(
			tile(wrapper)
				.findAll("div")
				.map((d) => d.text())
		).toEqual(["1,234.50", "DW"]);
	});

	it("adds input and output handles", async () => {
		const { wrapper } = await mountNode("Material");

		expect(handles(wrapper)).toEqual([
			{ id: "input", type: "target", position: "left" },
			{ id: "output", type: "source", position: "right" },
		]);
	});

	it.each([
		[false, true, ["output"]],
		[true, false, ["input"]],
		[false, false, []],
	])(
		"with input %s and output %s has the handles %j",
		async (hasInput, hasOutput, expected) => {
			const { wrapper } = await mountNode("Material", {
				hasInput,
				hasOutput,
			});

			expect(handles(wrapper).map((p) => p.id)).toEqual(expected);
		}
	);

	it("colors by material category", async () => {
		const { wrapper } = await mountNode("Material");

		// DW is "consumables (basic)"
		expect(tile(wrapper).classes()).toContain("material-tile");
		expect(tile(wrapper).classes()).toContain(
			"material-category-consumables-basic"
		);
		expect(tile(wrapper).classes()).not.toContain("material-expertise");
		// no background of its own
		expect(style(wrapper)).not.toContain("background");
	});

	it("colors by building expertise", async () => {
		const { wrapper } = await mountNode("Expertise");

		expect(tile(wrapper).classes()).toContain("material-expertise");
		expect(tile(wrapper).classes()).not.toContain("material-tile");
		// FOOD_INDUSTRIES #426100
		expect(style(wrapper)).toContain("background-color: rgb(66, 97, 0);");
	});

	it.each([null, undefined])(
		"colors a %s expertise red",
		async (buildingExpertise) => {
			const { wrapper } = await mountNode("Expertise", {
				buildingExpertise,
			});

			// #bf000c
			expect(style(wrapper)).toContain(
				"background-color: rgb(191, 0, 12);"
			);
		}
	);

	it("colors a single workforce", async () => {
		const { wrapper } = await mountNode("Workforce", {
			buildingWorkforce: { ...NO_WORKFORCE, Technicians: 80 },
		});

		expect(tile(wrapper).classes()).toContain("material-workforce");
		expect(tile(wrapper).classes()).not.toContain("material-tile");
		expect(style(wrapper)).toContain(
			"background-color: rgba(143, 59, 118, 0.99);"
		);
	});

	it("colors a node without workforce grey", async () => {
		const { wrapper } = await mountNode("Workforce", {
			buildingWorkforce: { ...NO_WORKFORCE },
		});

		// #353535
		expect(style(wrapper)).toContain("background-color: rgb(53, 53, 53);");
	});

	it("splits two workforces into a gradient", async () => {
		// jsdom drops a style with a gradient, read what Vue writes instead
		const cssText = vi.spyOn(
			CSSStyleDeclaration.prototype,
			"cssText",
			"set"
		);

		// PP3: 20 settlers, 40 technicians
		await mountNode("Workforce", {
			buildingWorkforce: {
				...NO_WORKFORCE,
				Settlers: 20,
				Technicians: 40,
			},
		});

		// 20 * 100 / 60 = 33.3 → 33, 40 * 100 / 60 = 66.7 → 67,
		// technicians start where settlers end
		expect(cssText.mock.calls.at(-1)![0]).toBe(
			"background: linear-gradient(90deg,rgba(85, 55, 114, 0.99) 33%, rgba(143, 59, 118, 0.99) 33%, rgba(143, 59, 118, 0.99) 67%); height: 60px; width: 60px"
		);
		cssText.mockRestore();
	});
});
