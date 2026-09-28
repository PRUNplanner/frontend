import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
import EmpireBarChart from "@/ui/charts/EmpireBarChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpirePlanListData,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

// chart.js has no canvas in jsdom, stubs only keep the data
vi.mock("@/ui/charts/EmpireBarChart.vue", () => ({
	default: {
		name: "EmpireBarChart",
		props: { items: Array },
		render: () => h("div"),
	},
}));

function io(
	ticker: string,
	input: number,
	output: number,
	delta: number,
	deltaPrice: number
): IEmpireMaterialIO {
	return {
		ticker,
		input,
		output,
		delta,
		deltaPrice,
		inputPlanets: [],
		outputPlanets: [],
	};
}

// category colours: FE metals, RAT consumables (basic), H2O liquids,
// C elements
const FE_C = "#363636";
const RAT_C = "#a62c2a";
const H2O_C = "#67a8da";
const C_C = "#3d2e20";

const MATERIAL_IO = [
	// only produced
	io("FE", 0, 10, 10, 1234.567),
	// only consumed
	io("RAT", 30, 0, -30, -3000.004),
	// both, net produced, no price
	io("H2O", 5, 12.346, 7.346, 0),
	// both, even, still costs
	io("C", 4, 4, 0, -20),
];

function plan(
	name: string | undefined,
	profit: number,
	cogc = "METALLURGY"
): IEmpirePlanListData {
	return {
		uuid: `uuid-${name}`,
		name,
		planet: "ZV-307c",
		permits: 1,
		cogc: cogc as IEmpirePlanListData["cogc"],
		profit,
	};
}

const PLANS = [
	plan("A", 100.126),
	plan("B", -5),
	plan("C", 0),
	plan(undefined, 50, "FOOD_INDUSTRIES"),
	plan("E", 20),
];

async function mountAnalysis(
	empireMaterialIO = MATERIAL_IO,
	planListData = PLANS
) {
	return mountComponent(EmpireAnalysis, { empireMaterialIO, planListData });
}

/** bar chart items in template order */
function charts(wrapper: VueWrapper, withPlans = true) {
	const items = wrapper
		.findAllComponents(EmpireBarChart)
		.map((c) => c.props("items"));
	const plans = withPlans ? items.shift() : undefined;
	const [profit, cost, netProd, netCons, exclProd, exclCons] = items;
	return { plans, profit, cost, netProd, netCons, exclProd, exclCons };
}

describe("EmpireAnalysis", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("splits material value into profits and costs", async () => {
		const { wrapper } = await mountAnalysis();
		const { profit, cost } = charts(wrapper);

		// rounded to 2 decimals, H2O at 0 is neither
		expect(profit).toEqual([{ name: "FE", value: 1234.57, color: FE_C }]);
		// costs as positive bars
		expect(cost).toEqual([
			{ name: "RAT", value: 3000, color: RAT_C },
			{ name: "C", value: 20, color: C_C },
		]);
	});

	it("splits the material delta into net production and consumption", async () => {
		const { wrapper } = await mountAnalysis();
		const { netProd, netCons } = charts(wrapper);

		// C with delta 0 is neither
		expect(netProd).toEqual([
			{ name: "FE", value: 10, color: FE_C },
			// 734.6 rounds to 735
			{ name: "H2O", value: 7.35, color: H2O_C },
		]);
		expect(netCons).toEqual([{ name: "RAT", value: 30, color: RAT_C }]);
	});

	it("shows materials only produced or only consumed", async () => {
		const { wrapper } = await mountAnalysis();
		const { exclProd, exclCons } = charts(wrapper);

		// H2O and C are both produced and consumed
		expect(exclProd).toEqual([{ name: "FE", value: 10, color: FE_C }]);
		expect(exclCons).toEqual([{ name: "RAT", value: 30, color: RAT_C }]);
	});

	it("charts every plan's profit, losses included", async () => {
		const { wrapper } = await mountAnalysis();

		// no colour: the chart colours by sign; unnamed plans use the planet
		expect(charts(wrapper).plans).toEqual([
			{ name: "A", value: 100.13 },
			{ name: "B", value: -5 },
			{ name: "C", value: 0 },
			{ name: "ZV-307c", value: 50 },
			{ name: "E", value: 20 },
		]);
		expect(wrapper.text()).toContain("empire.analysis.plan_profit");
	});

	it("hides the plan chart without plans", async () => {
		const { wrapper } = await mountAnalysis(MATERIAL_IO, []);

		expect(wrapper.findAllComponents(EmpireBarChart)).toHaveLength(6);
		expect(wrapper.text()).not.toContain("empire.analysis.plan_profit");
	});

	it("passes empty series to the charts without data", async () => {
		const { wrapper } = await mountAnalysis([], []);

		const { plans, ...materialCharts } = charts(wrapper, false);
		expect(plans).toBeUndefined();
		expect(Object.values(materialCharts)).toEqual([[], [], [], [], [], []]);
	});
});
