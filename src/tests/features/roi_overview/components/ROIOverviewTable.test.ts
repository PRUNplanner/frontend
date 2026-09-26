import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { flushPromises, VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import ROIOverviewTable from "@/features/roi_overview/components/ROIOverviewTable.vue";
import ROIOverviewTableFilters from "@/features/roi_overview/components/ROIOverviewTableFilters.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import PProgressBar from "@/ui/components/PProgressBar.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// Types & Interfaces
import { IROIResult } from "@/features/roi_overview/useROIOverview.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

// the recipe sweep itself is covered by useROIOverview.test.ts
const calculate = vi.fn<() => Promise<IROIResult[] | undefined>>();
vi.mock("@/features/roi_overview/useROIOverview", () => ({
	useROIOverview: () => ({
		calculate,
		formatOptimal: (o: { amount: number; ticker: string }) =>
			`${o.amount}x ${o.ticker}`,
		progressCurrent: ref(3),
		progressTotal: ref(10),
	}),
}));

const m = (ticker: string) => ({ material_ticker: ticker, material_amount: 1 });

function roi(
	building: string,
	cogc: string,
	inputs: string[],
	outputs: string[],
	planROI: number,
	dailyProfit = 1000
): IROIResult {
	return {
		buildingTicker: building,
		// @ts-expect-error only what formatOptimal and the tiles need
		optimalSetup: { ticker: building, amount: 10 },
		recipeId: `${building}#${outputs.join()}`,
		dailyRuns: 1,
		recipeInputs: inputs.map(m),
		recipeOutputs: outputs.map(m),
		cogc: cogc as IROIResult["cogc"],
		cogm: undefined,
		outputProfit: 0,
		dailyProfit,
		planCost: 250000,
		planROI,
		planArea: 500,
		planProfitArea: dailyProfit / 500,
	};
}

// unsorted on purpose, option lists are sorted
const RESULTS = [
	roi("SME", "METALLURGY", ["FEO", "C"], ["FE"], 40),
	roi("PP1", "CONSTRUCTION", ["LST"], ["BSE"], -5, -200),
	roi("FP", "FOOD_INDUSTRIES", ["H2O", "C"], ["DW"], 0, 0),
	// FE is an output twice
	roi("SME", "METALLURGY", ["CUO", "C"], ["CU", "FE"], 12),
];

/** resolvable calculation, to look at the table while it runs */
function deferred() {
	let resolve!: (v: IROIResult[] | undefined) => void;
	const promise = new Promise<IROIResult[] | undefined>(
		(r) => (resolve = r)
	);
	return { promise, resolve };
}

async function mountTable(results = RESULTS) {
	calculate.mockResolvedValue(results);
	return mountComponent(ROIOverviewTable, {
		// @ts-expect-error only passed through to the mocked composable
		planDefinition: {},
		cxUuid: undefined,
	});
}

const filters = (wrapper: VueWrapper) =>
	wrapper.findComponent(ROIOverviewTableFilters);

async function filter(wrapper: VueWrapper, index: number, value: string[]) {
	filters(wrapper)
		.findAllComponents(PSelectMultiple)
		.at(index)!.vm.$emit("update:value", value);
	await flushPromises();
}

/** first output ticker per row */
const outputs = (wrapper: VueWrapper) =>
	wrapper
		.findAll('td[data-col-key="recipeOutputs"]')
		.map((td) => td.find(".font-bold").text());

describe("ROIOverviewTable", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		calculate.mockReset();
	});

	it("shows the progress while calculating", async () => {
		const run = deferred();
		calculate.mockReturnValue(run.promise);
		const { wrapper } = await mountComponent(ROIOverviewTable, {
			planDefinition: {},
		});

		const bar = wrapper.findComponent(PProgressBar);
		expect(bar.props()).toMatchObject({ step: 3, total: 10 });
		expect(wrapper.text()).toContain("recipe_roi.calculating");
		expect(filters(wrapper).exists()).toBe(false);

		run.resolve(RESULTS);
		await flushPromises();

		expect(wrapper.findComponent(PProgressBar).exists()).toBe(false);
		expect(tableRows(wrapper)).toHaveLength(4);
	});

	it("renders one row per building recipe", async () => {
		const { wrapper } = await mountTable();
		const rows = tableRows(wrapper);

		expect(rows.map((r) => r.buildingTicker)).toEqual([
			"SME",
			"PP1",
			"FP",
			"SME",
		]);
		// the unit span keeps its padding space
		expect(rows[0]).toMatchObject({
			optimalSetup: "10x SME",
			cogc: "Metallurgy",
			planCost: "250,000.00  ȼ",
			dailyProfit: "1,000.00  ȼ",
			// 1000 / 500
			planProfitArea: "2.00  ȼ",
			planROI: "40.00  d",
		});
		// underscores become spaces, every word capitalized
		expect(rows[2].cogc).toBe("Food Industries");
	});

	it("colours profit and ROI by sign", async () => {
		const { wrapper } = await mountTable();

		const positive = (key: string) =>
			wrapper
				.findAll(`td[data-col-key="${key}"] div`)
				.map((d) => d.classes("text-positive"));

		// FP makes exactly 0, which is not positive
		expect(positive("dailyProfit")).toEqual([true, false, false, true]);
		expect(positive("planProfitArea")).toEqual([true, false, false, true]);
		expect(positive("planROI")).toEqual([true, false, false, true]);
	});

	it("builds sorted, distinct filter options", async () => {
		const { wrapper } = await mountTable();

		const options = (prop: string) =>
			(filters(wrapper).props(prop) as { value: string }[]).map(
				(o) => o.value
			);

		expect(options("buildingOptions")).toEqual(["FP", "PP1", "SME"]);
		expect(options("cogcOptions")).toEqual([
			"CONSTRUCTION",
			"FOOD_INDUSTRIES",
			"METALLURGY",
		]);
		expect(
			(filters(wrapper).props("cogcOptions") as { label: string }[]).map(
				(o) => o.label
			)
		).toEqual(["Construction", "Food Industries", "Metallurgy"]);
		expect(options("inputMaterialOptions")).toEqual([
			"C",
			"CUO",
			"FEO",
			"H2O",
			"LST",
		]);
		expect(options("outputMaterialOptions")).toEqual([
			"BSE",
			"CU",
			"DW",
			"FE",
		]);
	});

	it("filters by building and COGC", async () => {
		const { wrapper } = await mountTable();

		await filter(wrapper, 0, ["PP1"]);
		expect(outputs(wrapper)).toEqual(["BSE"]);
		await filter(wrapper, 0, ["SME", "FP"]);
		expect(outputs(wrapper)).toEqual(["FE", "DW", "CU"]);

		await filter(wrapper, 0, []);
		await filter(wrapper, 1, ["CONSTRUCTION"]);
		expect(outputs(wrapper)).toEqual(["BSE"]);
	});

	it("filters by output and by any input material", async () => {
		const { wrapper } = await mountTable();

		// one matching output is enough, SME also makes FE
		await filter(wrapper, 2, ["CU", "BSE"]);
		expect(outputs(wrapper)).toEqual(["BSE", "CU"]);
		await filter(wrapper, 2, ["FE"]);
		expect(outputs(wrapper)).toEqual(["FE", "CU"]);

		await filter(wrapper, 2, []);
		// C is an input of three recipes, H2O of one of them
		await filter(wrapper, 3, ["C"]);
		expect(outputs(wrapper)).toEqual(["FE", "DW", "CU"]);
		await filter(wrapper, 3, ["LST", "H2O"]);
		expect(outputs(wrapper)).toEqual(["BSE", "DW"]);
	});

	it("keeps only non-negative ROI, including 0", async () => {
		const { wrapper } = await mountTable();

		await filters(wrapper).find("input[type=checkbox]").setValue(true);
		await flushPromises();

		expect(outputs(wrapper)).toEqual(["FE", "DW", "CU"]);
	});

	it("combines all filters", async () => {
		const { wrapper } = await mountTable();

		await filter(wrapper, 0, ["SME", "PP1"]);
		await filter(wrapper, 3, ["C", "LST"]);
		await filters(wrapper).find("input[type=checkbox]").setValue(true);
		await flushPromises();
		expect(outputs(wrapper)).toEqual(["FE", "CU"]);

		await filter(wrapper, 1, ["CONSTRUCTION"]);
		expect(tableRows(wrapper)).toHaveLength(0);
	});

	it("recalculates when the CX changes", async () => {
		const { wrapper, setProps } = await mountTable();
		expect(calculate).toHaveBeenCalledTimes(1);

		const run = deferred();
		calculate.mockReturnValue(run.promise);
		await setProps({ cxUuid: "cx-uuid" });

		expect(calculate).toHaveBeenCalledTimes(2);
		expect(wrapper.findComponent(PProgressBar).exists()).toBe(true);

		run.resolve([RESULTS[1]]);
		await flushPromises();
		expect(outputs(wrapper)).toEqual(["BSE"]);
		expect(
			filters(wrapper).props("buildingOptions") as unknown[]
		).toHaveLength(1);
	});

	it("keeps calculating until the newest run is done", async () => {
		const first = deferred();
		const second = deferred();
		calculate
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const { wrapper, setProps } = await mountComponent(ROIOverviewTable, {
			planDefinition: {},
		});

		await setProps({ cxUuid: "cx-uuid" });
		// the composable ends the superseded run with undefined
		first.resolve(undefined);
		await flushPromises();
		expect(wrapper.findComponent(PProgressBar).exists()).toBe(true);

		second.resolve([RESULTS[1]]);
		await flushPromises();
		expect(outputs(wrapper)).toEqual(["BSE"]);
	});

	it("stops calculating when the calculation fails", async () => {
		calculate.mockRejectedValue(new Error("failed"));
		const { wrapper } = await mountComponent(ROIOverviewTable, {
			planDefinition: {},
		});

		expect(wrapper.findComponent(PProgressBar).exists()).toBe(false);
		expect(tableRows(wrapper)).toHaveLength(0);
	});

	it("renders an empty table without results", async () => {
		const { wrapper } = await mountTable([]);

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(filters(wrapper).props("buildingOptions")).toEqual([]);
	});
});
