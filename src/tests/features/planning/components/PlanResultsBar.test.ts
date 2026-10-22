import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";
import { mountComponent } from "@/tests/mountComponent";
import { formatPayback } from "@/util/numbers";
import plan from "@/locales/en_US/plan.json";

// Types & Interfaces
import type {
	IAreaResult,
	IOverviewData,
	IVisitationData,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";

// has its own test
vi.mock("@/features/sharing/components/SharedPlanDeltas.vue", () => ({
	default: {
		name: "SharedPlanDeltas",
		props: { compare: Object },
		render: () => h("div"),
	},
}));

const OVERVIEW: IOverviewData = {
	dailyCost: 3765.5,
	dailyProfit: 1234.5,
	totalConstructionCost: 1500000,
	dailyDegradationCost: 12,
	profit: 1234.5,
	roi: 123.456,
};

const AREA: IAreaResult = {
	permits: 2,
	areaUsed: 250,
	areaTotal: 500,
	areaLeft: 250,
};

const VISITATION: IVisitationData = {
	storageFilled: 12.345,
	dailyWeightImport: 1,
	dailyWeightExport: 4.56,
	dailyVolumeImport: 1,
	dailyVolumeExport: 7.04,
	dailyWeight: 5.56,
	dailyVolume: 8.04,
};

async function mountBar(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanResultsBar,
		{
			overview: OVERVIEW,
			area: AREA,
			visitation: VISITATION,
			revenue: 5000,
			cost: 3765.5,
			...props,
		},
		// real texts, so the values in them show
		{ messages: { plan } }
	);
}

/** the figure cells: profit, payback, profit / area, area, storage */
const cell = (wrapper: VueWrapper, index: number) =>
	wrapper.findAll("section > div > div").at(index)!;

describe("PlanResultsBar", () => {
	it("shows the profit with revenue and cost", async () => {
		const { wrapper } = await mountBar();

		expect(cell(wrapper, 0).text()).toContain("Profit / day");
		expect(cell(wrapper, 0).text()).toContain("+1,234.50");
		expect(cell(wrapper, 0).find(".text-positive").exists()).toBe(true);
		expect(cell(wrapper, 0).text()).toContain(
			"Revenue 5,000.00 · cost 3,765.50"
		);
	});

	it("colors a loss negative", async () => {
		const { wrapper } = await mountBar({
			overview: { ...OVERVIEW, profit: -20 },
		});

		expect(cell(wrapper, 0).text()).toContain("-20.00");
		expect(cell(wrapper, 0).find(".text-negative").exists()).toBe(true);
	});

	it("shows the payback and the build cost", async () => {
		const { wrapper } = await mountBar();

		// 123.456 days
		expect(cell(wrapper, 1).text()).toContain("123.46 d");
		expect(cell(wrapper, 1).text()).toContain(formatPayback(123.456));
		expect(cell(wrapper, 1).text()).toContain("Build 1,500,000 ȼ");
	});

	it("shows a payback that never comes", async () => {
		const { wrapper } = await mountBar({
			overview: { ...OVERVIEW, roi: Infinity },
		});

		expect(cell(wrapper, 1).text()).toContain(formatPayback(Infinity));
		expect(cell(wrapper, 1).text()).not.toContain(" d");
	});

	it("shows the profit per used area", async () => {
		const { wrapper } = await mountBar();

		// 1,234.5 / 250 = 4.938
		expect(cell(wrapper, 2).text()).toContain("+4.94");
		expect(cell(wrapper, 2).text()).not.toContain("Empire");
	});

	it("shows no profit per area without used area", async () => {
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 0, areaLeft: 500 },
		});

		expect(cell(wrapper, 2).find(".text-lg").text()).toBe("0.00");
	});

	it("shows the empire average only when given", async () => {
		const { wrapper } = await mountBar({ empireProfitPerArea: 3.2 });

		expect(cell(wrapper, 2).text()).toContain("Empire +3.20");
	});

	it("shows the used of the total area", async () => {
		const { wrapper } = await mountBar();

		expect(cell(wrapper, 3).text()).toContain("250");
		expect(cell(wrapper, 3).text()).toContain("/ 500");
		expect(cell(wrapper, 3).find(".text-negative").exists()).toBe(false);
		// 250 / 500
		expect(
			cell(wrapper, 3).find("[role=img] > div").attributes("style")
		).toContain("width: 50%");
	});

	it("colors overused area negative", async () => {
		// 520 used of 500 leaves 500 - 520 = -20
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 520, areaLeft: -20 },
		});

		expect(cell(wrapper, 3).find(".text-negative").text()).toBe("520");
	});

	it("keeps exactly full area neutral", async () => {
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 500, areaLeft: 0 },
		});

		expect(cell(wrapper, 3).find(".text-negative").exists()).toBe(false);
	});

	it("shows the storage days and the exported weight and volume", async () => {
		const { wrapper } = await mountBar();

		// 12.345 -> 12.3 days, 4.56 t -> 4.6, 7.04 m³ -> 7.0
		expect(cell(wrapper, 4).text()).toContain("12.3");
		expect(cell(wrapper, 4).text()).toContain("days to full");
		expect(cell(wrapper, 4).text()).toContain("4.6 t · 7.0 m³ out / day");
	});

	it("shows the shared plan's deltas only with a comparison", async () => {
		const { wrapper, setProps } = await mountBar();
		expect(wrapper.findComponent(SharedPlanDeltas).exists()).toBe(false);

		const compare: IPlanCompare = {
			before: { profit: 1, roi: 2, area: 3, workforce: 4, buildings: 5 },
			after: { profit: 2, roi: 2, area: 3, workforce: 4, buildings: 5 },
		};
		await setProps({ compare });

		expect(wrapper.findComponent(SharedPlanDeltas).props("compare")).toEqual(
			compare
		);
	});
});
