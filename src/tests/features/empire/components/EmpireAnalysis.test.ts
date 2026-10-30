import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h, nextTick } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
import EmpireBarChart from "@/ui/charts/EmpireBarChart.vue";
import EmpireRevenueSplit from "@/features/empire/components/EmpireRevenueSplit.vue";
import EmpireMaterialButterfly from "@/features/empire/components/EmpireMaterialButterfly.vue";
import PDivergingBar from "@/ui/charts/PDivergingBar.vue";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpirePlanListData,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent,
}));

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
		revenue: 100 + profit,
		inputs: 60,
		workforce: 30,
		degradation: 10,
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
	planListData = PLANS,
	moreChartsOpen = true
) {
	localStorage.setItem(
		"prunplanner_empire_more_charts",
		moreChartsOpen ? "1" : "0"
	);
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

	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
		trackEvent.mockClear();
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

	describe("More charts", () => {
		const details = (wrapper: VueWrapper) =>
			wrapper.find("details").element as HTMLDetailsElement;

		async function toggle(wrapper: VueWrapper, open: boolean) {
			details(wrapper).open = open;
			await wrapper.find("details").trigger("toggle");
			await nextTick();
		}

		it("is closed by default and mounts no chart", async () => {
			const { wrapper } = await mountComponent(EmpireAnalysis, {
				empireMaterialIO: MATERIAL_IO,
				planListData: PLANS,
			});

			expect(details(wrapper).open).toBe(false);
			expect(wrapper.findAllComponents(EmpireBarChart)).toHaveLength(0);
		});

		it("mounts the charts when opened, remembers it and tracks it", async () => {
			const { wrapper } = await mountAnalysis(MATERIAL_IO, PLANS, false);

			await toggle(wrapper, true);
			expect(wrapper.findAllComponents(EmpireBarChart)).toHaveLength(7);
			expect(localStorage.getItem("prunplanner_empire_more_charts")).toBe(
				"1"
			);
			expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
				"empire:analysis_more_charts"
			);

			// closing is remembered and not tracked
			await toggle(wrapper, false);
			expect(localStorage.getItem("prunplanner_empire_more_charts")).toBe(
				"0"
			);
			expect(trackEvent).toHaveBeenCalledTimes(1);
		});

		it("opens with the remembered state, without tracking", async () => {
			const { wrapper } = await mountAnalysis();

			expect(details(wrapper).open).toBe(true);
			expect(trackEvent).not.toHaveBeenCalled();
		});
	});

	describe("revenue split", () => {
		// 12 profitable plans, two losses
		const MANY = [
			...Array.from({ length: 12 }, (_, i) => plan(`G${i}`, 10 + i)),
			plan("L1", -5),
			plan("L2", -40),
		];
		const links = (wrapper: VueWrapper) =>
			wrapper
				.findComponent(EmpireRevenueSplit)
				.findAll("a")
				.map((a) => a.text());

		it("lists the top 10, every loss and Other, which expands inline", async () => {
			const { wrapper } = await mountAnalysis(MATERIAL_IO, MANY, false);

			expect(links(wrapper)).toEqual([
				...Array.from({ length: 10 }, (_, i) => `G${11 - i}`),
				"L1",
				"L2",
			]);
			const other = wrapper
				.findComponent(EmpireRevenueSplit)
				.find("button[aria-expanded]");
			expect(other.text()).toContain(
				"empire.analysis.revenue_split.other"
			);

			await other.trigger("click");
			expect(links(wrapper).slice(-2)).toEqual(["G1", "G0"]);
			expect(other.attributes("aria-expanded")).toBe("true");
		});

		it("hatches the cost a loss-making plan doesn't cover", async () => {
			const { wrapper } = await mountAnalysis(
				MATERIAL_IO,
				[plan("A", 20), plan("B", -40)],
				false
			);
			const hatches = wrapper
				.findComponent(EmpireRevenueSplit)
				.findAll("[data-key=hatch]");

			// B: 60 revenue of 100 cost, 40 % not covered
			expect(hatches).toHaveLength(1);
			expect(hatches[0].attributes("style")).toContain("left: 60%");
			expect(wrapper.text()).toContain("-66.7 %");
		});
	});

	describe("materials butterfly", () => {
		const butterfly = (wrapper: VueWrapper) =>
			wrapper.findComponent(EmpireMaterialButterfly);

		it("ranks materials by ¢ per day, bought left and sold right", async () => {
			const { wrapper } = await mountAnalysis(MATERIAL_IO, PLANS, false);
			const bars = butterfly(wrapper).findAllComponents(PDivergingBar);

			// H2O moves no ¢
			expect(bars.map((b) => b.props("value"))).toEqual([
				-3000.004, 1234.567, -20,
			]);
			expect(bars[0].props("maxAbs")).toBe(3000.004);
		});

		it("switches to units per day", async () => {
			const { wrapper } = await mountAnalysis(MATERIAL_IO, PLANS, false);
			await butterfly(wrapper)
				.findAll("button")
				.find((b) => b.text() === "empire.analysis.butterfly.amount")!
				.trigger("click");

			expect(
				butterfly(wrapper)
					.findAllComponents(PDivergingBar)
					.map((b) => b.props("value"))
			).toEqual([-30, 10, 0]);
		});

		it("opens a clicked material in Material I/O", async () => {
			const { wrapper, component } = await mountAnalysis(
				MATERIAL_IO,
				PLANS,
				false
			);
			await butterfly(wrapper).findAll("li button")[1].trigger("click");

			expect(component.emitted("open:material")).toEqual([["FE"]]);
		});
	});
});
