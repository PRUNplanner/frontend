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
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type { IMarketCheck } from "@/features/cx/marketCheck.types";
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

const wf = (
	name: IWorkforceElement["name"],
	data: Partial<IWorkforceElement> = {}
): IWorkforceElement => ({
	name,
	required: 0,
	capacity: 0,
	left: 0,
	lux1: true,
	lux2: true,
	efficiency: 0,
	...data,
});

// pioneers fully happy, settlers at 86.7 % without their second luxury,
// technicians housed but not needed
const WORKFORCE: IWorkforceRecord = {
	pioneer: wf("pioneer", { required: 100, capacity: 100, efficiency: 1 }),
	settler: wf("settler", {
		required: 50,
		capacity: 60,
		left: 10,
		lux2: false,
		efficiency: 0.8667,
	}),
	technician: wf("technician", { capacity: 50, left: 50, lux1: false }),
	engineer: wf("engineer"),
	scientist: wf("scientist"),
};

const check = (ticker: string, level: IMarketCheck["level"]) =>
	[ticker, { ticker, level } as IMarketCheck] as const;

async function mountBar(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanResultsBar,
		{
			overview: OVERVIEW,
			area: AREA,
			visitation: VISITATION,
			workforce: WORKFORCE,
			checks: new Map(),
			revenue: 5000,
			cost: 3765.5,
			...props,
		},
		// real texts, so the values in them show
		{ messages: { plan } }
	);
}

/** the cells: profit, payback, area with profit / area, storage, workforce, market */
const cell = (wrapper: VueWrapper, index: number) =>
	wrapper.findAll("section > div > *").at(index)!;

describe("PlanResultsBar", () => {
	it("shows the profit with revenue and cost", async () => {
		const { wrapper } = await mountBar();

		expect(cell(wrapper, 0).text()).toContain("Profit / day");
		expect(cell(wrapper, 0).text()).toContain("+1,234.50");
		expect(cell(wrapper, 0).find(".text-positive").exists()).toBe(true);
		expect(cell(wrapper, 0).text()).toContain(
			"Revenue 5,000.00 · cost 3,765.50 incl. 12.00 degradation"
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

		expect(cell(wrapper, 2).find("[data-profit-area] .text-sm").text()).toBe("0.00");
	});

	it("shows the empire average only when given", async () => {
		const { wrapper } = await mountBar({ empireProfitPerArea: 3.2 });

		expect(cell(wrapper, 2).text()).toContain("Empire +3.20");
	});

	it("shows the used of the total area", async () => {
		const { wrapper } = await mountBar();

		expect(cell(wrapper, 2).text()).toContain("250");
		expect(cell(wrapper, 2).text()).toContain("/ 500");
		expect(cell(wrapper, 2).find(".text-negative").exists()).toBe(false);
		// 250 / 500
		expect(
			cell(wrapper, 2).find("[role=img] > div").attributes("style")
		).toContain("width: 50%");
	});

	it("colors overused area negative", async () => {
		// 520 used of 500 leaves 500 - 520 = -20
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 520, areaLeft: -20 },
		});

		expect(cell(wrapper, 2).find(".text-negative").text()).toBe("520");
	});

	it("keeps exactly full area neutral", async () => {
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 500, areaLeft: 0 },
		});

		expect(cell(wrapper, 2).find(".text-negative").exists()).toBe(false);
	});

	it("shows the storage days and the weight in and out, volume on hover", async () => {
		const { wrapper } = await mountBar();

		// 12.345 -> 12.3 days, 1 t in, 4.56 t -> 4.6 out, 1 m³ in, 7.04 m³ -> 7.0 out
		expect(cell(wrapper, 3).text()).toContain("12.3");
		expect(cell(wrapper, 3).text()).toContain("days to full");
		const note = cell(wrapper, 3).find("[title]");
		expect(note.text()).toBe("1.0\u00a0t in · 4.6\u00a0t out\u00a0/\u00a0day");
		expect(note.attributes("title")).toBe(
			"1.0\u00a0m³ in · 7.0\u00a0m³ out\u00a0/\u00a0day"
		);
	});

	it("shows the lowest efficiency of the needed workforce and missing luxuries", async () => {
		const { wrapper } = await mountBar();

		// settler 0.8667 -> 86.7 %; the unneeded technicians don't count
		expect(cell(wrapper, 4).text()).toContain("Workforce");
		expect(cell(wrapper, 4).text()).toContain("86.7 %");
		expect(cell(wrapper, 4).find("[data-workforce-note]").text()).toBe(
			"1 luxury off"
		);
		expect(cell(wrapper, 4).find(".text-negative\\!").exists()).toBe(false);
	});

	it("puts short beds first, in red", async () => {
		const { wrapper } = await mountBar({
			workforce: {
				...WORKFORCE,
				settler: wf("settler", {
					required: 80,
					capacity: 60,
					left: -20,
					lux2: false,
					efficiency: 0.5,
				}),
			},
		});

		const note = cell(wrapper, 4).find("[data-workforce-note]");
		expect(note.text()).toBe("Game.workforce Type.settler: 20 beds short");
		expect(note.classes()).toContain("text-negative!");
		expect(cell(wrapper, 4).text()).toContain("50.0 %");
	});

	it("says all housed, and shows no efficiency without needed workforce", async () => {
		const happy = await mountBar({
			workforce: { ...WORKFORCE, settler: wf("settler") },
		});
		expect(
			cell(happy.wrapper, 4).find("[data-workforce-note]").text()
		).toBe("All housed, all luxuries");
		expect(cell(happy.wrapper, 4).text()).toContain("100.0 %");

		const none = await mountBar({
			workforce: { ...WORKFORCE, pioneer: wf("pioneer"), settler: wf("settler") },
		});
		expect(cell(none.wrapper, 4).text()).toContain("—");
	});

	it("shows the market flags, worst first, and opens Plan check", async () => {
		const { wrapper, setProps, component } = await mountBar();
		const market = () => wrapper.find("[data-market]");

		expect(market().text()).toContain("No flags");
		expect(market().text()).toContain("Plan check →");

		await setProps({ checks: new Map([check("FE", "amber"), check("CU", "amber")]) });
		expect(market().find(".text-warning\\!").text()).toBe("2 large shares");

		await setProps({
			checks: new Map([check("PE", "red"), check("FE", "amber"), check("H2O", null)]),
		});
		expect(market().find(".text-negative\\!").text()).toBe("1 can't trade");
		expect(market().text()).toContain("1 large share ·");

		await market().trigger("click");
		expect(component.emitted("open:planCheck")).toHaveLength(1);
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
