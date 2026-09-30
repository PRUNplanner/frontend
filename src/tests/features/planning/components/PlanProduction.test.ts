import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import { buildingsStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";
import type { PlanetResource } from "@/features/api/schemas/gameData.schemas";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";

// PlanProductionBuilding has its own test, the stub only keeps the props
vi.mock("@/features/planning/components/PlanProductionBuilding.vue", () => ({
	default: {
		name: "PlanProductionBuilding",
		props: {
			disabled: Boolean,
			buildingData: Object,
			buildingIndex: Number,
			cxUuid: String,
			planetId: String,
		},
		render: () => h("div"),
	},
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String, amount: Number },
		render: () => h("div"),
	},
}));

function building(name: string): IProductionBuilding {
	return {
		name,
		amount: 1,
		areaUsed: 0,
		activeRecipes: [],
		recipeOptions: [],
		totalEfficiency: 1,
		efficiencyElements: [],
		totalBatchTime: 0,
		constructionMaterials: [],
		constructionCost: 0,
		workforceMaterials: [],
		workforceDailyCost: 0,
		dailyRevenue: 0,
		expertise: null,
	};
}

const resource = (
	ticker: string,
	type: PlanetResource["resource_type"],
	daily: number
): PlanetResource => ({
	material_ticker: ticker,
	resource_type: type,
	factor: 0.5,
	daily_extraction: daily,
	max_daily_extraction: daily,
});

const RESOURCES = [
	resource("FEO", "MINERAL", 12.345),
	resource("NE", "GASEOUS", 3),
	resource("H2O", "LIQUID", 20),
];

async function mountProduction(props: Record<string, unknown> = {}) {
	return mountComponent(PlanProduction, {
		disabled: false,
		productionData: {
			buildings: [building("SME"), building("FP")],
			materialio: [],
		},
		cogc: "METALLURGY",
		cxUuid: "cx-uuid",
		planetId: "ZV-307c",
		planetResources: RESOURCES,
		...props,
	});
}

const children = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PlanProductionBuilding);

const buildingOptions = (wrapper: VueWrapper) =>
	(wrapper.findComponent(PSelect).props("options") as { value: string }[])
		.map((o) => o.value)
		.sort();

describe("PlanProduction", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await useBuildingData().preloadBuildings();
	});

	it("renders one building row per production building", async () => {
		const { wrapper } = await mountProduction();

		expect(
			children(wrapper).map((c) => [
				c.props("buildingData").name,
				c.props("buildingIndex"),
			])
		).toEqual([
			["SME", 0],
			["FP", 1],
		]);
		expect(children(wrapper).at(1)!.props()).toMatchObject({
			disabled: false,
			cxUuid: "cx-uuid",
			planetId: "ZV-307c",
		});
	});

	it("passes disabled and a missing CX on to the buildings", async () => {
		const { wrapper } = await mountProduction({
			disabled: true,
			cxUuid: undefined,
		});

		expect(children(wrapper).at(0)!.props()).toMatchObject({
			disabled: true,
			cxUuid: undefined,
		});
		// read-only: nothing to add a building with
		expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);
		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
	});

	it("offers production buildings not in the plan yet", async () => {
		const { wrapper } = await mountProduction();

		const options = buildingOptions(wrapper);
		// no planetary, infrastructure or habitation buildings
		expect(options).not.toContain("HB1");
		expect(options).not.toContain("COG");
		// already planned
		expect(options).not.toContain("SME");
		expect(options).not.toContain("FP");
		expect(options).toContain("PP1");
		expect(options).toContain("FS");
	});

	it("limits the options to the plan's COGC when matching", async () => {
		const { wrapper } = await mountProduction();

		await wrapper.find("input[type=checkbox]").setValue(true);
		await flushPromises();

		// METALLURGY buildings except the planned SME
		expect(buildingOptions(wrapper)).toEqual([
			"ASM",
			"FS",
			"GF",
			"HWP",
			"SKF",
		]);

		await wrapper.find("input[type=checkbox]").setValue(false);
		await flushPromises();
		expect(buildingOptions(wrapper)).toContain("PP1");
	});

	it("follows a COGC change while matching", async () => {
		const { wrapper, setProps } = await mountProduction();
		await wrapper.find("input[type=checkbox]").setValue(true);

		await setProps({ cogc: "FOOD_INDUSTRIES" });

		// FP is planned already
		expect(buildingOptions(wrapper)).toEqual(["FER", "IVP"]);
	});

	it("emits creating the selected building", async () => {
		const { wrapper, component } = await mountProduction();

		wrapper.findComponent(PSelect).vm.$emit("update:value", "PP1");
		await flushPromises();

		expect(component.emitted("create:building")).toEqual([["PP1"]]);
	});

	it("creates the extractor of a planet resource with its recipe", async () => {
		const { wrapper, component } = await mountProduction();

		const tiles = wrapper.findAll(".hover\\:cursor-pointer");
		expect(tiles).toHaveLength(3);
		for (const tile of tiles) await tile.trigger("click");

		expect(component.emitted("create:building:recipe")).toEqual([
			["EXT", "EXT#FEO"],
			["COL", "COL#NE"],
			["RIG", "RIG#H2O"],
		]);
	});

	it("shows planet resources with their rounded daily extraction", async () => {
		const { wrapper } = await mountProduction();

		expect(
			wrapper
				.findAllComponents(MaterialTile)
				.map((t) => [t.props("ticker"), t.props("amount")])
		).toEqual([
			// 12.345 formats to "12.35"
			["FEO", 12.35],
			["NE", 3],
			["H2O", 20],
		]);
		expect(wrapper.text()).toContain(
			"plan.components.production.planet_resources"
		);
	});

	it("hides the resource label without planet resources", async () => {
		const { wrapper } = await mountProduction({ planetResources: [] });

		expect(wrapper.findAllComponents(MaterialTile)).toHaveLength(0);
		expect(wrapper.text()).not.toContain(
			"plan.components.production.planet_resources"
		);
	});

	it("renders no rows without buildings", async () => {
		const { wrapper } = await mountProduction({
			productionData: { buildings: [], materialio: [] },
		});

		expect(children(wrapper)).toHaveLength(0);
		expect(buildingOptions(wrapper)).toContain("SME");
	});

	it("re-emits the building events with their payloads", async () => {
		const { wrapper, component } = await mountProduction();
		const fp = children(wrapper).at(1)!;

		fp.vm.$emit("update:building:amount", 1, 4);
		fp.vm.$emit("delete:building", 1);
		fp.vm.$emit("update:building:recipe:amount", 1, 2, 3);
		fp.vm.$emit("delete:building:recipe", 1, 0);
		fp.vm.$emit("add:building:recipe", 1);
		fp.vm.$emit("update:building:recipe", 1, 0, "FP#DW");

		expect(component.emitted("update:building:amount")).toEqual([[1, 4]]);
		expect(component.emitted("delete:building")).toEqual([[1]]);
		expect(component.emitted("update:building:recipe:amount")).toEqual([
			[1, 2, 3],
		]);
		expect(component.emitted("delete:building:recipe")).toEqual([[1, 0]]);
		expect(component.emitted("add:building:recipe")).toEqual([[1]]);
		expect(component.emitted("update:building:recipe")).toEqual([
			[1, 0, "FP#DW"],
		]);
	});
});
