import { describe, it, expect, beforeAll, vi } from "vitest";
import { h } from "vue";
import { VueWrapper } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
import EmpirePieChart from "@/ui/charts/EmpirePieChart.vue";
import EmpirePlanMapChart from "@/ui/charts/EmpirePlanMapChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import {
	IEmpireMaterialIO,
	IEmpirePlanListData,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

// chart.js has no canvas in jsdom, stubs only keep the data
vi.mock("@/ui/charts/EmpirePieChart.vue", () => ({
	default: {
		name: "EmpirePieChart",
		props: { data: Array },
		render: () => h("div"),
	},
}));
vi.mock("@/ui/charts/EmpirePlanMapChart.vue", () => ({
	default: {
		name: "EmpirePlanMapChart",
		props: { data: Array },
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

/** pie chart data in template order */
function pies(wrapper: VueWrapper) {
	const [profit, cost, netProd, netCons, exclProd, exclCons] = wrapper
		.findAllComponents(EmpirePieChart)
		.map((c) => c.props("data"));
	return { profit, cost, netProd, netCons, exclProd, exclCons };
}

describe("EmpireAnalysis", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	it("splits material value into profits and costs", async () => {
		const { wrapper } = await mountAnalysis();
		const { profit, cost } = pies(wrapper);

		// rounded to 2 decimals, H2O at 0 is neither
		expect(profit).toEqual([{ name: "FE", value: 1234.57, color: FE_C }]);
		// costs as positive slices
		expect(cost).toEqual([
			{ name: "RAT", value: 3000, color: RAT_C },
			{ name: "C", value: 20, color: C_C },
		]);
	});

	it("splits the material delta into net production and consumption", async () => {
		const { wrapper } = await mountAnalysis();
		const { netProd, netCons } = pies(wrapper);

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
		const { exclProd, exclCons } = pies(wrapper);

		// H2O and C are both produced and consumed
		expect(exclProd).toEqual([{ name: "FE", value: 10, color: FE_C }]);
		expect(exclCons).toEqual([{ name: "RAT", value: 30, color: RAT_C }]);
	});

	it("maps profitable plans once there are at least 3", async () => {
		const { wrapper } = await mountAnalysis();

		// B loses money, C makes none
		expect(
			wrapper.findComponent(EmpirePlanMapChart).props("data")
		).toEqual([
			{
				name: "A",
				value: 100.13,
				cogc: "Metallurgy",
				color: "hsl(0, 60%, 40%)",
			},
			// unnamed plan, colours step 137.5° around the wheel
			{
				name: "",
				value: 50,
				cogc: "Food Industries",
				color: "hsl(137.5, 60%, 40%)",
			},
			{
				name: "E",
				value: 20,
				cogc: "Metallurgy",
				color: "hsl(275, 60%, 40%)",
			},
		]);
	});

	it("wraps plan colours around the wheel", async () => {
		const { wrapper } = await mountAnalysis(MATERIAL_IO, [
			plan("A", 1),
			plan("B", 1),
			plan("C", 1),
			plan("D", 1),
		]);

		const colors = (
			wrapper.findComponent(EmpirePlanMapChart).props("data") as {
				color: string;
			}[]
		).map((d) => d.color);
		// 3 * 137.5 = 412.5 -> 52.5
		expect(colors.at(3)).toBe("hsl(52.5, 60%, 40%)");
	});

	it("hides the plan map with fewer than 3 profitable plans", async () => {
		const { wrapper } = await mountAnalysis(MATERIAL_IO, PLANS.slice(0, 4));

		expect(wrapper.findComponent(EmpirePlanMapChart).exists()).toBe(false);
		expect(wrapper.text()).not.toContain("empire.analysis.profitable_plans");
	});

	it("renders empty charts without data", async () => {
		const { wrapper } = await mountAnalysis([], []);

		expect(Object.values(pies(wrapper))).toEqual([[], [], [], [], [], []]);
		expect(wrapper.findComponent(EmpirePlanMapChart).exists()).toBe(false);
	});
});
