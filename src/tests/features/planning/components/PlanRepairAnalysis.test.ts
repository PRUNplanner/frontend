import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanRepairAnalysis from "@/features/planning/components/tools/PlanRepairAnalysis.vue";
import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
import PlanRepairProfitChart from "@/ui/charts/PlanRepairProfitChart.vue";
import PlanRepairCostChart from "@/ui/charts/PlanRepairCostChart.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

// chart.js has no canvas in jsdom, stubs only keep the props
vi.mock("@/ui/charts/PlanRepairProfitChart.vue", () => ({
	default: {
		name: "PlanRepairProfitChart",
		props: { profitData: Array, optimalPoint: Object },
		render: () => h("div"),
	},
}));
vi.mock("@/ui/charts/PlanRepairCostChart.vue", () => ({
	default: {
		name: "PlanRepairCostChart",
		props: { series: Array },
		render: () => h("div"),
	},
}));

const CX_UUID = "cx-uuid";
// BUY prices of the CX
const PRICES = { BBH: 100, BSE: 50, MCG: 10 };

const mat = (ticker: string, input: number) => ({ ticker, input, output: 0 });
const FRM = {
	name: "FRM",
	amount: 2,
	dailyRevenue: 0,
	constructionMaterials: [mat("BBH", 4), mat("BSE", 4)],
};
const EXT = {
	name: "EXT",
	amount: 1,
	dailyRevenue: 0,
	constructionMaterials: [mat("BSE", 16), mat("MCG", 100)],
};

async function mountAnalysis(data = [FRM, EXT]) {
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([
		// @ts-expect-error mock data
		{
			uuid: CX_UUID,
			cx_name: "CX",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: Object.entries(PRICES).map(
					([ticker, value]) => ({ ticker, type: "BUY", value })
				),
				ticker_planets: [],
			},
		},
	]);

	const mounted = await mountComponent(
		PlanRepairAnalysis,
		{ data, cxUuid: CX_UUID, planetNaturalId: "ZV-307c" },
		{ pinia }
	);
	// 181 days of materials are priced through IndexedDB
	await vi.waitFor(() =>
		expect(mounted.wrapper.find("tfoot").exists()).toBe(true)
	);
	return mounted;
}

/** day material table rows: ticker, amount, cost */
function dayRows(wrapper: VueWrapper) {
	return wrapper
		.findAll("tbody tr")
		.map((tr) => tr.findAll("td").map((td) => td.text().split(" ")[0]));
}

async function select(wrapper: VueWrapper, index: 0 | 1, value: number) {
	wrapper.findAllComponents(PSelect).at(index)!.vm.$emit("update:value", value);
	await flushPromises();
}

const xitElements = (wrapper: VueWrapper) =>
	wrapper.findComponent(XITTransferActionButton).props("elements");

describe("PlanRepairAnalysis", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("lists all buildings' repair materials of day 90", async () => {
		const { wrapper } = await mountAnalysis();

		// day 90 halves the construction materials, times building amount
		// FRM x2: BBH 2 * 2 = 4, BSE 2 * 2 = 4; EXT: BSE 8, MCG 50
		expect(dayRows(wrapper)).toEqual([
			["BBH", "4", "400.00"],
			["BSE", "12", "600.00"],
			["MCG", "50", "500.00"],
		]);
		expect(wrapper.find("tfoot").text()).toContain("1,500.00");

		expect(xitElements(wrapper)).toEqual([
			{ ticker: "BBH", value: 4 },
			{ ticker: "BSE", value: 12 },
			{ ticker: "MCG", value: 50 },
		]);
	});

	it("switches repair materials and XIT transfer to the chosen day", async () => {
		const { wrapper } = await mountAnalysis();

		await select(wrapper, 0, 1);

		// day 1: n - floor(n * 179 / 180) -> BBH 4 - 3, BSE 4 - 3, 16 - 15,
		// MCG 100 - 99; FRM counts twice: BBH 2, BSE 2 + 1, MCG 1
		expect(dayRows(wrapper)).toEqual([
			["BBH", "2", "200.00"],
			["BSE", "3", "150.00"],
			["MCG", "1", "10.00"],
		]);
		expect(xitElements(wrapper)).toEqual([
			{ ticker: "BBH", value: 2 },
			{ ticker: "BSE", value: 3 },
			{ ticker: "MCG", value: 1 },
		]);
	});

	it("offers days 1 to 180 and all buildings", async () => {
		const { wrapper } = await mountAnalysis();
		const [days, buildings] = wrapper.findAllComponents(PSelect);

		const dayOptions = days.props("options") as { value: number }[];
		expect(dayOptions).toHaveLength(180);
		expect(dayOptions.at(0)!.value).toBe(1);
		expect(dayOptions.at(-1)!.value).toBe(180);

		expect(buildings.props("options")).toEqual([
			{ label: "FRM", value: 0 },
			{ label: "EXT", value: 1 },
		]);
		expect(buildings.text()).toContain("FRM");
	});

	it("marks the most profitable repair day of the first building", async () => {
		const { wrapper } = await mountAnalysis();
		const chart = wrapper.findComponent(PlanRepairProfitChart);

		// single FRM, no revenue: 1 BBH + 1 BSE = 150 up to day 45,
		// 2 each up to day 90; -150 / 46 beats -300 / 91 and later days
		expect(chart.props("optimalPoint")).toEqual({
			x: 45,
			y: -150 / 46,
		});
		const profit = chart.props("profitData") as number[];
		expect(profit).toHaveLength(181);
		// day 0 copies day 1: -150 / 2
		expect(profit.slice(0, 2)).toEqual([-75, -75]);
	});

	it("breaks the repair cost down per material", async () => {
		const { wrapper } = await mountAnalysis();
		const series = wrapper
			.findComponent(PlanRepairCostChart)
			.props("series") as { name: string; data: number[] }[];

		expect(series.map((s) => s.name)).toEqual(["Total Cost", "BBH", "BSE"]);
		// day 45: 1 BBH (100) + 1 BSE (50)
		expect(series.map((s) => s.data[45])).toEqual([150, 100, 50]);
	});

	it("recalculates the curves for another building", async () => {
		const { wrapper } = await mountAnalysis();

		await select(wrapper, 1, 1);

		const series = wrapper
			.findComponent(PlanRepairCostChart)
			.props("series") as { name: string; data: number[] }[];
		expect(series.map((s) => s.name)).toEqual(["Total Cost", "BSE", "MCG"]);
		// day 180: full EXT construction 16 * 50 + 100 * 10
		expect(series.map((s) => s.data[180])).toEqual([1800, 800, 1000]);

		// the day table still covers all buildings
		expect(dayRows(wrapper)).toHaveLength(3);
	});

	it("recalculates when the plan's buildings change", async () => {
		const { wrapper, setProps } = await mountAnalysis();

		await setProps({ data: [{ ...FRM, amount: 5 }, EXT] });

		// day 90: FRM x5: BBH 2 * 5
		await vi.waitFor(() =>
			expect(dayRows(wrapper).at(0)).toEqual(["BBH", "10", "1,000.00"])
		);
	});

	it("hides the charts without buildings", async () => {
		const { wrapper } = await mountAnalysis([]);

		expect(wrapper.findComponent(PlanRepairProfitChart).exists()).toBe(
			false
		);
		expect(wrapper.findComponent(PlanRepairCostChart).exists()).toBe(
			false
		);
		expect(wrapper.findAllComponents(PSelect).at(1)!.props("options")).toEqual(
			[]
		);
		expect(dayRows(wrapper)).toEqual([]);
		expect(xitElements(wrapper)).toEqual([]);
	});
});
