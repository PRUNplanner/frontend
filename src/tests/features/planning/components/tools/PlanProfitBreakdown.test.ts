import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanProfitBreakdown from "@/features/planning/components/tools/PlanProfitBreakdown.vue";
import PWaterfall from "@/ui/charts/PWaterfall.vue";
import { hoverTooltip, mountComponent } from "@/tests/mountComponent";
import {
	io,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type {
	IOverviewData,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

/** price is per unit, the row carries delta × price */
const mio = (ticker: string, delta: number, price: number) =>
	io(ticker, delta, { price: delta * price });

const WORKFORCE = [mio("RAT", -2, 100), mio("DW", -1, 50)];
const OVERVIEW: IOverviewData = {
	dailyCost: 0,
	dailyProfit: 0,
	totalConstructionCost: 18000,
	dailyDegradationCost: 100,
	// 1,000 − 200 − 250 − 100
	profit: 450,
	roi: 0,
};
const BUILDINGS = [
	{ name: "SME", amount: 1, dailyRevenue: 500, constructionCost: -9000 },
	{ name: "FRM", amount: 1, dailyRevenue: 50, constructionCost: -9000 },
] as IProductionBuilding[];

async function mountTool(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(
		PlanProfitBreakdown,
		{
			materialIO: [
				mio("FE", 10, 90),
				mio("LST", 1, 100),
				mio("C", -2, 100),
				...WORKFORCE,
			],
			workforceMaterialIO: WORKFORCE,
			buildings: BUILDINGS,
			overview: OVERVIEW,
			...props,
		},
		{ attach: true }
	);
	return wrapper;
}

const modeButtons = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w.findAll("[role=group] > button");

// the waterfall's columns as label, value and tone
const steps = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w
		.findComponent(PWaterfall)
		.props("columns")
		.map((c) => [c.label, c.value, c.tone]);

async function setView(w: Awaited<ReturnType<typeof mountTool>>, i: number) {
	const button = modeButtons(w)[i];
	if (button.attributes("aria-pressed") !== "true")
		await button.trigger("click");
}

describe("PlanProfitBreakdown", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});

	// the mode is module state, every test starts and ends on cost type
	afterEach(async () => {
		await setView(await mountTool(), 0);
	});

	it("shows the waterfall by cost type and the key figures", async () => {
		const wrapper = await mountTool();
		const text = wrapper.text();

		for (const step of ["output", "inputs", "workforce", "degradation"])
			expect(text).toContain(`plan.tools.profit_breakdown.steps.${step}`);
		expect(text).toContain("1,000");
		expect(text).toContain("-200");
		expect(text).toContain("-250");
		expect(text).toContain("450");
		// costs incl. degradation and the largest earner
		expect(text).toContain("550.00 ȼ");
		expect(text).toContain("45.0 %");
		expect(text).toContain(
			"plan.tools.profit_breakdown.key_figures.earner"
		);
		expect(text).toContain(
			"plan.tools.profit_breakdown.key_figures.workforce"
		);
	});

	it("shows a segment's numbers in its tooltip", async () => {
		const wrapper = await mountTool();
		const tip = await hoverTooltip(wrapper.find("button[aria-label*='FE']"));
		expect(tip).toContain("plan.tools.profit_breakdown.tooltip.produced");
		expect(tip).toContain("10.00");
		expect(tip).toContain("90.00 ȼ");
		expect(tip).toContain("900.00 ȼ");
		expect(tip).toContain("90.0 %");
	});

	it("switches to buildings, tracks it, and keeps the mode when reopened", async () => {
		const wrapper = await mountTool();
		await modeButtons(wrapper)[1].trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("plan:profit_breakdown_mode", {
			mode: "building",
		});
		// SME 500 + 50 back, FRM 50 + 50, then degradation: 650 − 100 = 550,
		// the plan says 450, so 100 are not attributed
		const text = wrapper.text();
		expect(text).toContain("SME");
		expect(text).toContain("FRM");
		expect(text).toContain(
			"plan.tools.profit_breakdown.steps.unattributed"
		);

		// clicking the active mode again sends nothing
		await modeButtons(wrapper)[1].trigger("click");
		expect(trackEvent).toHaveBeenCalledTimes(1);

		wrapper.unmount();
		const again = await mountTool();
		expect(modeButtons(again)[1].attributes("aria-pressed")).toBe("true");
		expect(again.text()).toContain("SME");

		await modeButtons(again)[0].trigger("click");
		expect(modeButtons(again)[0].attributes("aria-pressed")).toBe("true");
	});

	it("tells an empty plan to add production", async () => {
		const wrapper = await mountTool({
			materialIO: [],
			workforceMaterialIO: [],
			buildings: [],
			overview: { ...OVERVIEW, profit: 0, dailyDegradationCost: 0 },
		});

		expect(wrapper.text()).toContain("plan.tools.profit_breakdown.empty");
		expect(wrapper.find("[role=group][aria-label]").exists()).toBe(true);
	});

	it("colours a known material by its category and names it", async () => {
		const wrapper = await mountTool();

		expect(
			wrapper.find("button[aria-label*='FE'] span").classes()
		).toContain("material-category-metals");
		expect(wrapper.find("ul li span").classes()).toContain(
			"material-category-metals"
		);

		expect(
			await hoverTooltip(wrapper.find("button[aria-label*='FE']"))
		).toContain("iron");
	});

	it("falls back to a neutral chip for a ticker without game data", async () => {
		const wrapper = await mountTool({
			materialIO: [mio("ZZZ", 5, 100)],
			workforceMaterialIO: [],
			overview: { ...OVERVIEW, profit: 400 },
		});

		const chip = wrapper.find("button[aria-label*='ZZZ'] span");
		expect(chip.classes()).toContain("bg-black/70");
		expect(wrapper.find("ul li span").classes()).toContain("bg-black/40");

		const tip = await hoverTooltip(wrapper.find("button[aria-label*='ZZZ']"));
		expect(tip).toContain("ZZZ");
		expect(tip).toContain("500.00 ȼ");
	});

	it("shows a plan that loses money in the negative colour", async () => {
		const wrapper = await mountTool({
			overview: { ...OVERVIEW, profit: -50 },
		});

		const margin = wrapper.findAll("dd")[2];
		expect(margin.text()).toBe("-5.0 %");
		expect(margin.classes()).toContain("text-negative");
	});

	it("sums everything beyond the 3 largest items into one more segment", async () => {
		const wrapper = await mountTool({
			materialIO: [
				mio("FE", 10, 90),
				mio("LST", 5, 100),
				mio("H2O", 4, 50),
				mio("FEO", 1, 30),
				mio("C", -2, 100),
				mio("O", -3, 50),
				mio("H", -4, 20),
				mio("N", -1, 10),
				...WORKFORCE,
			],
		});

		const more = wrapper.findAll(
			"button[aria-label*='plan.tools.profit_breakdown.more']"
		);
		expect(more).toHaveLength(2);

		// output: the smallest item, no amount or price of its own
		let tip = await hoverTooltip(more[0]);
		expect(tip).toContain("30.00 ȼ");
		expect(tip).toContain("1.8 %");
		expect(tip).not.toContain("tooltip.produced");
		expect(tip).not.toContain("tooltip.price");

		// inputs are costs, so negative per day
		tip = await hoverTooltip(more[1]);
		expect(tip).toContain("-10.00 ȼ");
		expect(tip).not.toContain("tooltip.consumed");
	});

	describe("by building", () => {
		// 9 buildings, top 7 by size; the 2 smallest sum to -30
		const revenues = [90, 80, 70, 60, 50, 40, -35, -20, -10];
		const many = revenues.map((dailyRevenue, i) => ({
			name: `B${i}`,
			amount: 1,
			dailyRevenue,
			constructionCost: 0,
		})) as IProductionBuilding[];
		// 325 − 100 degradation = 225 attributed
		const overview = (profit: number) => ({ ...OVERVIEW, profit });

		it("folds the smallest buildings into one step and colours a loss", async () => {
			const wrapper = await mountTool({
				buildings: many,
				overview: overview(300),
			});
			await setView(wrapper, 1);

			const text = wrapper.text();
			expect(text).toContain(
				"plan.tools.profit_breakdown.more_buildings"
			);
			expect(text).not.toContain("B7");
			// largest first; B6 (-35) and the folded steps (-30) lose, the 75
			// not attributed do not
			const key = "plan.tools.profit_breakdown";
			expect(steps(wrapper)).toEqual([
				["B0", 90, "neutral"],
				["B1", 80, "neutral"],
				["B2", 70, "neutral"],
				["B3", 60, "neutral"],
				["B4", 50, "neutral"],
				["B5", 40, "neutral"],
				[`${key}.more_buildings`, -30, "negative"],
				["B6", -35, "negative"],
				[`${key}.steps.unattributed`, 75, "neutral"],
				[`${key}.steps.degradation`, -100, "hatched"],
				[`${key}.steps.profit`, 300, "positive"],
			]);
		});

		it("explains what is not attributed, and colours a negative rest", async () => {
			const wrapper = await mountTool({
				buildings: many,
				overview: overview(200),
			});
			await setView(wrapper, 1);

			expect(steps(wrapper)[8]).toEqual([
				"plan.tools.profit_breakdown.steps.unattributed",
				-25,
				"negative",
			]);
			const tip = await hoverTooltip(
				wrapper.find("button[aria-label*='steps.unattributed']")
			);
			expect(tip).toContain("-25.00 ȼ");
			expect(tip).toContain(
				"plan.tools.profit_breakdown.tooltip.unattributed"
			);
			expect(tip).not.toContain("tooltip.produced");
			expect(tip).not.toContain("tooltip.price");
		});

		it("leaves out the step when the buildings explain the profit", async () => {
			const wrapper = await mountTool({
				buildings: many,
				overview: overview(225),
			});
			await setView(wrapper, 1);

			expect(wrapper.text()).not.toContain("steps.unattributed");
			expect(wrapper.text()).toContain("steps.profit");
		});
	});

	it("tells what a cost item consumes and names the largest cost", async () => {
		const wrapper = await mountTool({
			materialIO: [mio("FE", 10, 90), mio("ZZZ", -2, 100)],
			workforceMaterialIO: [],
		});

		const tip = await hoverTooltip(
			wrapper.find(
				"button[aria-label^='plan.tools.profit_breakdown.steps.inputs: ZZZ']"
			)
		);
		expect(tip).toContain("plan.tools.profit_breakdown.tooltip.consumed");
		expect(tip).not.toContain("tooltip.produced");
		expect(tip).toContain("-200.00 ȼ");

		// no game data for ZZZ: neutral chip next to the largest cost
		const costChip = wrapper.findAll("ul li")[1].find("span");
		expect(costChip.text()).toBe("ZZZ");
		expect(costChip.classes()).toContain("bg-black/40");
	});
});
