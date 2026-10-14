import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanProfitBreakdown from "@/features/planning/components/tools/PlanProfitBreakdown.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IMaterialIO,
	IOverviewData,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

function mio(ticker: string, delta: number, price: number): IMaterialIO {
	return {
		ticker,
		input: Math.max(-delta, 0),
		output: Math.max(delta, 0),
		delta,
		individualWeight: 0,
		individualVolume: 0,
		totalWeight: 0,
		totalVolume: 0,
		price: delta * price,
	};
}

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

describe("PlanProfitBreakdown", () => {
	beforeEach(() => vi.mocked(trackEvent).mockClear());

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
		await wrapper.find("button[aria-label*='FE']").trigger("mouseenter");
		await nextTick();

		const tip = document.body.querySelector("[role=tooltip]")!.textContent;
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
});
