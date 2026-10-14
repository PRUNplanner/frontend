import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { nextTick } from "vue";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanWhatIf from "@/features/planning/components/tools/PlanWhatIf.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	emptyPlan,
	etherwindPlan,
	largePlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

async function mountTool(plan = etherwindPlan()) {
	const { wrapper } = await mountComponent(
		PlanWhatIf,
		{
			plan,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		},
		{ attach: true }
	);
	return wrapper;
}

const pctButtons = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w.findAll("[aria-labelledby=whatif-pct-label] > button");

describe("PlanWhatIf", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});
	beforeEach(() => vi.mocked(trackEvent).mockClear());

	it("lists materials by impact with a mirrored bar, range and break-even", async () => {
		const wrapper = await mountTool();
		const rows = wrapper.findAll("tbody tr");

		expect(rows.length).toBeGreaterThan(1);
		expect(rows.length).toBeLessThanOrEqual(10);
		// each bar draws both sides around today's profit
		expect(rows[0].find(".bg-negative").exists()).toBe(true);
		expect(rows[0].find(".bg-positive").exists()).toBe(true);
		// the largest impact fills its side
		expect(rows[0].find(".bg-positive").attributes("style")).toContain(
			"width: 50%"
		);
		expect(rows[0].text()).toMatch(/plan\.tools\.whatif\.side\.(buy|sell)/);
		expect(rows[0].text()).toMatch(/–/);

		const text = wrapper.text();
		expect(text).toContain("plan.tools.whatif.means.title");
		expect(text).toContain("plan.tools.whatif.means.source_universe");
		expect(text).toContain("plan.tools.whatif.footnote.centre");
	});

	it("caps the list at 10 and sums up the rest", async () => {
		const wrapper = await mountTool(largePlan());

		expect(wrapper.findAll("tbody tr")).toHaveLength(10);
		expect(wrapper.text()).toContain("plan.tools.whatif.more");
	});

	it("shows profit at both price changes in the bar's tooltip", async () => {
		const wrapper = await mountTool();
		await wrapper
			.find("tbody tr .ptooltip")
			.trigger("mouseenter");
		await nextTick();

		const tip = document.body.querySelector("[role=tooltip]")!.textContent;
		expect(tip).toContain("plan.tools.whatif.tooltip.value");
		expect(tip).toContain("plan.tools.whatif.tooltip.profit");
	});

	it("switches the price change, tracks it, and keeps it when reopened", async () => {
		const wrapper = await mountTool();
		const before = wrapper.find("tbody tr").text();
		await pctButtons(wrapper)[3].trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("plan:whatif_change", {
			view: "sensitivity",
			pct: 50,
		});
		expect(wrapper.find("tbody tr").text()).not.toBe(before);

		// clicking the active change again sends nothing
		await pctButtons(wrapper)[3].trigger("click");
		expect(trackEvent).toHaveBeenCalledTimes(1);

		wrapper.unmount();
		const again = await mountTool();
		expect(pctButtons(again)[3].attributes("aria-pressed")).toBe("true");
		await pctButtons(again)[1].trigger("click");
	});

	it("tells an empty plan to add production", async () => {
		const wrapper = await mountTool(emptyPlan());

		expect(wrapper.text()).toContain("plan.tools.whatif.empty");
		expect(wrapper.find("table").exists()).toBe(false);
	});
});
