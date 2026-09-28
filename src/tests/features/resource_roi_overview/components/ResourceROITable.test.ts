import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";

import ResourceROITable from "@/features/resource_roi_overview/components/ResourceROITable.vue";
import ResourceROITableFilters from "@/features/resource_roi_overview/components/ResourceROITableFilters.vue";
import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
import COGMButton from "@/features/roi_overview/components/COGMButton.vue";
import PlanetPOPRButton from "@/features/government/components/PlanetPOPRButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import type { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";
import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";

// the table only renders the composable's result, which the view passes in
// as a prop; useResourceROIOverview.test.ts covers the calculation
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

function result(
	planetName: string,
	building: string,
	planROI: number,
	distances: [number, number, number, number],
	overrides: Partial<IResourceROIResult> = {}
): IResourceROIResult {
	return {
		planetNaturalId: `${planetName}-id`,
		planetName,
		buildingTicker: building,
		dailyYield: 12.345,
		percentMaxDailyYield: 0.5,
		cogm: undefined,
		outputProfit: 0,
		dailyProfit: planROI * 10,
		planCost: 250000,
		planROI,
		planArea: 500,
		planProfitArea: 0,
		planetSurface: ["MCG"],
		planetGravity: [],
		planetPressure: ["SEA"],
		planetTemperature: [],
		planetCOGC: null,
		planetInfrastructures: [],
		distanceAI1: distances[0],
		distanceCI1: distances[1],
		distanceIC1: distances[2],
		distanceNC1: distances[3],
		...overrides,
	};
}

// unsorted on purpose, option lists are sorted
const RESULTS = [
	result("Promitor", "RIG", 40, [7, -1, 3, 12], {
		planetCOGC: "ADVERTISING_FOOD_INDUSTRIES",
		planetInfrastructures: ["LM", "COGC"],
		cogm: { visible: true } as IProductionBuildingRecipeCOGM,
	}),
	result("Katoa", "EXT", -5, [-1, 4, 9, 2]),
	result("Montem", "RIG", 0, [2, 8, -1, 5], {
		planetCOGC: "WORKFORCE_PIONEERS",
	}),
	// Promitor twice
	result("Promitor", "EXT", 12, [7, -1, 3, 12]),
];

async function mountTable(resultData = RESULTS) {
	return mountComponent(ResourceROITable, {
		searchedMaterial: "H2O",
		resultData,
	});
}

const filters = (wrapper: VueWrapper) =>
	wrapper.findComponent(ResourceROITableFilters);

const optionValues = (wrapper: VueWrapper, prop: string) =>
	(filters(wrapper).props(prop) as { value: string }[]).map((o) => o.value);

/** planet and building per row */
const shown = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => `${r.planetName} ${r.buildingTicker}`);

async function select(wrapper: VueWrapper, index: 0 | 1, value: unknown) {
	filters(wrapper)
		.findAllComponents(PSelect)
		.at(index)!
		.vm.$emit("update:value", value);
	await flushPromises();
}

async function setPositiveROI(wrapper: VueWrapper, value: boolean) {
	await filters(wrapper).find("input[type=checkbox]").setValue(value);
	await flushPromises();
}

async function sortBy(wrapper: VueWrapper, key: string) {
	await wrapper.find(`th[data-col-key="${key}"]`).trigger("click");
	await flushPromises();
}

describe("ResourceROITable", () => {
	it("renders one row per result", async () => {
		const { wrapper } = await mountTable();
		const rows = tableRows(wrapper);

		expect(shown(wrapper)).toEqual([
			"Promitor RIG",
			"Katoa EXT",
			"Montem RIG",
			"Promitor EXT",
		]);
		// the unit spans keep their padding spaces
		expect(rows[0]).toMatchObject({
			dailyYield: "12.35",
			// 0.5 * 100
			percentMaxDailyYield: "50.00",
			// the prefix is dropped, underscores become spaces
			planetCOGC: "Food Industries",
			planetInfrastructures: "LM, COGC",
			planCost: "250,000.00",
			// 40 * 10
			dailyProfit: "+400.00",
			planROI: "40.00",
			distanceAI1: "7",
			distanceCI1: "—",
		});
		expect(rows[1].planetCOGC).toBe("-");
		expect(rows[2].planetCOGC).toBe("Pioneers");
		expect(rows[2].distanceIC1).toBe("—");
	});

	it("links the planet and hands row data to the buttons", async () => {
		const { wrapper } = await mountTable();

		expect(
			wrapper.findAllComponents(RouterLinkStub).at(0)!.props("to")
		).toBe("/plan/Promitor-id");
		expect(
			wrapper.findAllComponents(PlanetPOPRButton).at(1)!.props()
		).toMatchObject({ planetNaturalId: "Katoa-id", buttonSize: "sm" });
		expect(
			wrapper
				.findAllComponents(COGMButton)
				.map((b) => b.props("cogmData") !== undefined)
		).toEqual([true, false, false, false]);
		// surface, pressure, gravity and temperature per row, plus the
		// searched material in the filters
		expect(
			wrapper
				.findAllComponents(MaterialTile)
				.map((t) => t.props("ticker"))
		).toEqual(["H2O", ...Array(4).fill(["MCG", "SEA"]).flat()]);
	});

	it("colours profit and ROI by sign, 0 counts as negative", async () => {
		const { wrapper } = await mountTable();

		const positive = (key: string) =>
			wrapper
				.findAll(`td[data-col-key="${key}"]`)
				.map((td) => td.find("span").classes("text-positive"));

		expect(positive("dailyProfit")).toEqual([
			true,
			false,
			false,
			true,
		]);
		expect(positive("planROI")).toEqual([true, false, false, true]);
	});

	it("builds sorted, distinct filter options", async () => {
		const { wrapper } = await mountTable();

		expect(optionValues(wrapper, "planetOptions")).toEqual([
			"Katoa",
			"Montem",
			"Promitor",
		]);
		expect(optionValues(wrapper, "buildingOptions")).toEqual([
			"EXT",
			"RIG",
		]);
		expect(filters(wrapper).props("searchedMaterial")).toBe("H2O");
	});

	it("filters by planet", async () => {
		const { wrapper } = await mountTable();

		await select(wrapper, 0, "Promitor");
		expect(shown(wrapper)).toEqual(["Promitor RIG", "Promitor EXT"]);

		// clearing the select
		await select(wrapper, 0, null);
		expect(shown(wrapper)).toHaveLength(4);
	});

	it("filters by building", async () => {
		const { wrapper } = await mountTable();

		await select(wrapper, 1, "EXT");
		expect(shown(wrapper)).toEqual(["Katoa EXT", "Promitor EXT"]);
	});

	it("keeps only non-negative ROI, including 0", async () => {
		const { wrapper } = await mountTable();

		await setPositiveROI(wrapper, true);
		expect(shown(wrapper)).toEqual([
			"Promitor RIG",
			"Montem RIG",
			"Promitor EXT",
		]);

		await setPositiveROI(wrapper, false);
		expect(shown(wrapper)).toHaveLength(4);
	});

	it("combines all filters", async () => {
		const { wrapper } = await mountTable();

		await select(wrapper, 1, "RIG");
		await setPositiveROI(wrapper, true);
		expect(shown(wrapper)).toEqual(["Promitor RIG", "Montem RIG"]);

		await select(wrapper, 0, "Katoa");
		expect(shown(wrapper)).toEqual([]);
	});

	it("sorts an unreachable exchange as the farthest", async () => {
		const { wrapper } = await mountTable();
		const ai1 = () => tableRows(wrapper).map((r) => r.distanceAI1);

		// AI1: 7, -1, 2, 7; the first click sorts descending
		await sortBy(wrapper, "distanceAI1");
		expect(ai1()).toEqual(["—", "7", "7", "2"]);

		await sortBy(wrapper, "distanceAI1");
		expect(ai1()).toEqual(["2", "7", "7", "—"]);
	});

	it("sorts every distance column the same way", async () => {
		const { wrapper } = await mountTable();
		const column = (key: string) => tableRows(wrapper).map((r) => r[key]);

		// CI1: -1, 4, 8, -1
		await sortBy(wrapper, "distanceCI1");
		await sortBy(wrapper, "distanceCI1");
		expect(column("distanceCI1")).toEqual(["4", "8", "—", "—"]);
		// IC1: 3, 9, -1, 3
		await sortBy(wrapper, "distanceIC1");
		await sortBy(wrapper, "distanceIC1");
		expect(column("distanceIC1")).toEqual(["3", "3", "9", "—"]);
		// NC1: 12, 2, 5, 12, all reachable
		await sortBy(wrapper, "distanceNC1");
		await sortBy(wrapper, "distanceNC1");
		expect(column("distanceNC1")).toEqual(["2", "5", "12", "12"]);
	});

	it("renders an empty table without results", async () => {
		const { wrapper } = await mountTable([]);

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(filters(wrapper).props("planetOptions")).toEqual([]);
		expect(filters(wrapper).props("buildingOptions")).toEqual([]);
	});

	it("follows new results", async () => {
		const { wrapper, setProps } = await mountTable();

		await setProps({ resultData: [RESULTS[1]] });

		expect(shown(wrapper)).toEqual(["Katoa EXT"]);
		expect(optionValues(wrapper, "planetOptions")).toEqual(["Katoa"]);
	});
});
