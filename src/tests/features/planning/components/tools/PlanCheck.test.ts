import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { nextTick } from "vue";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanCheck from "@/features/planning/components/tools/PlanCheck.vue";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia } from "pinia";
import { usePlanningStore } from "@/stores/planningStore";
import { mountComponent } from "@/tests/mountComponent";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { PInputNumber } from "@/ui";

import type { ISensitivityRow } from "@/features/planning/util/whatIf.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	emptyPlan,
	etherwindPlan,
	largePlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
// the rows can be swapped for crafted ones, the plan is still calculated
const crafted = vi.hoisted(() => ({
	rows: undefined as ISensitivityRow[] | undefined,
}));
vi.mock("@/features/planning/util/whatIf.util", async (importActual) => {
	const actual =
		await importActual<
			typeof import("@/features/planning/util/whatIf.util")
		>();
	return {
		...actual,
		priceSensitivity: (
			...args: Parameters<typeof actual.priceSensitivity>
		) => {
			const sensitivity = actual.priceSensitivity(...args);
			return crafted.rows
				? { ...sensitivity, rows: crafted.rows }
				: sensitivity;
		},
	};
});
const explorationQuery = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (_name: string, params: unknown) => ({
		execute: () => explorationQuery(params),
	}),
}));

async function mountTool(plan = etherwindPlan()) {
	const { wrapper } = await mountComponent(
		PlanCheck,
		{
			plan,
			planUuid: undefined,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		},
		{ attach: true }
	);
	return wrapper;
}

const pctButtons = (w: Awaited<ReturnType<typeof mountTool>>) =>
	w.findAll("[aria-labelledby=plancheck-pct-label] > button");

describe("PlanCheck", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		explorationQuery.mockReset().mockResolvedValue([]);
		usePlanCheckView().view.value = "sensitivity";
		crafted.rows = undefined;
	});

	it("opens on Market check, before the price sensitivity", async () => {
		usePlanCheckView().view.value = "market";
		const wrapper = await mountTool();
		await flushPromises();
		const buttons = wrapper.findAll(
			"[aria-label='plan.tools.plan_check.view_label'] > button"
		);

		expect(buttons.map((b) => b.text())).toEqual([
			"plan.tools.plan_check.views.market",
			"plan.tools.plan_check.views.sensitivity",
		]);
		expect(buttons[0].attributes("aria-pressed")).toBe("true");
		// no CX preference: no real prices, a hint to set one
		const real = wrapper.find("[data-real-prices]");
		expect(real.find("[data-ask-bid]").text()).toBe(
			"cx.market_flags.popover.none"
		);
		expect(real.text()).toContain(
			"plan.tools.plan_check.market.real.no_cx"
		);
		expect(wrapper.text()).toContain("cx.market_flags.exchange.no_cx");

		await buttons[1].trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_change", {
			view: "sensitivity",
		});
		expect(wrapper.find("[data-real-prices]").exists()).toBe(false);
	});

	it("names a UNIVERSE preference as the plan's, without a hint to set one", async () => {
		usePlanCheckView().view.value = "market";
		const pinia = createPinia();
		usePlanningStore(pinia).setCXs([
			// @ts-expect-error mock data
			{
				uuid: "cx-universe",
				cx_name: "Universe",
				empires: [],
				cx_data: {
					cx_empire: [{ type: "BOTH", exchange: "UNIVERSE_30D" }],
					cx_planets: [],
					ticker_empire: [],
					ticker_planets: [],
				},
			},
		]);
		const { wrapper } = await mountComponent(
			PlanCheck,
			{
				plan: etherwindPlan(),
				planUuid: undefined,
				empire: undefined,
				cxUuid: "cx-universe",
				planet: planet_etherwind,
			},
			{ pinia }
		);
		await flushPromises();

		expect(wrapper.find("[data-exchange-caption]").text()).toBe(
			"cx.market_flags.exchange.all"
		);
		expect(wrapper.text()).toContain("cx.market_flags.exchange.from_plan");
		expect(wrapper.text()).not.toContain("cx.market_flags.exchange.no_cx");
		const real = wrapper.find("[data-real-prices]");
		expect(real.find("[data-kept-universe]").exists()).toBe(true);
		expect(real.text()).not.toContain("real.kept_fallback");
	});

	it("links flagged materials to their price rule in Exchanges", async () => {
		usePlanCheckView().view.value = "market";
		const pinia = createPinia();
		const planet = planet_etherwind.planet_natural_id;
		usePlanningStore(pinia).setCXs([
			// @ts-expect-error mock data
			{
				uuid: "cx-fixed",
				cx_name: "Fixed",
				empires: [],
				cx_data: {
					cx_empire: [],
					cx_planets: [],
					ticker_empire: [],
					// RAT fixed at 0 here: no price; the rest from Universe
					ticker_planets: [
						{
							planet,
							preferences: [
								{ type: "BOTH", ticker: "RAT", value: 0 },
							],
						},
					],
				},
			},
		]);
		const { wrapper } = await mountComponent(
			PlanCheck,
			{
				plan: etherwindPlan(),
				planUuid: undefined,
				empire: undefined,
				cxUuid: "cx-fixed",
				planet: planet_etherwind,
				own: true,
			},
			{ pinia }
		);
		await flushPromises();

		const ruleLinks = () =>
			wrapper
				.findAllComponents(RouterLinkStub)
				.filter((l) => l.attributes("data-rule-link") !== undefined);
		const links = ruleLinks().map((l) => l.props("to"));
		expect(new Set(links)).toEqual(
			new Set([
				`/exchanges/cx-fixed?scope=${planet}`,
				"/exchanges/cx-fixed?scope=all",
			])
		);
		// only RAT is fixed on the planet
		const rat = wrapper
			.findAll("tbody tr")
			.find((r) => r.text().startsWith("RAT"))!;
		expect(rat.findComponent(RouterLinkStub).props("to")).toBe(
			`/exchanges/cx-fixed?scope=${planet}`
		);
	});

	it("solves a target price and fetches the 30-day range only once used", async () => {
		const wrapper = await mountTool();
		const card = () => wrapper.find("[data-target-price]");

		expect(card().exists()).toBe(true);
		expect(card().find("[data-target-range]").exists()).toBe(false);
		expect(explorationQuery).not.toHaveBeenCalled();

		explorationQuery.mockResolvedValue([
			{ date_epoch: 1, traded: 5, low_p: 10, high_p: 20 },
		]);
		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 1_000_000);
		await flushPromises();

		expect(explorationQuery).toHaveBeenCalled();
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_target", {
			has_target: true,
		});
		expect(card().find("[data-target-result]").text()).not.toBe("");
		expect(card().find("[data-target-range]").text()).toContain("10 – 20");
	});

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
			"width: 100%"
		);
		expect(rows[0].text()).toMatch(
			/plan\.tools\.plan_check\.side\.(buy|sell)/
		);
		expect(rows[0].text()).toMatch(/–/);

		const text = wrapper.text();
		expect(text).toContain("plan.tools.plan_check.means.title");
		expect(text).toContain("plan.tools.plan_check.means.source_universe");
		expect(text).toContain("plan.tools.plan_check.footnote.centre");
	});

	it("caps the list at 10, sums up the rest and shows all on request", async () => {
		const wrapper = await mountTool(largePlan());

		expect(wrapper.findAll("tbody tr")).toHaveLength(10);
		expect(wrapper.text()).toContain("plan.tools.plan_check.more");

		const toggle = wrapper.find("button[aria-expanded]");
		expect(toggle.text()).toBe("common.buttons.show_all");
		await toggle.trigger("click");

		expect(wrapper.findAll("tbody tr").length).toBeGreaterThan(10);
		expect(wrapper.text()).not.toContain("plan.tools.plan_check.more");
		expect(toggle.text()).toBe("common.buttons.show_fewer");
	});

	it("shows profit at both price changes in the bar's tooltip", async () => {
		const wrapper = await mountTool();
		await wrapper.find("tbody tr .ptooltip").trigger("mouseenter");
		await nextTick();

		const tip = document.body.querySelector("[role=tooltip]")!.textContent;
		expect(tip).toContain("plan.tools.plan_check.tooltip.value");
		expect(tip).toContain("plan.tools.plan_check.tooltip.profit");
	});

	it("switches the price change, tracks it, and keeps it when reopened", async () => {
		const wrapper = await mountTool();
		const before = wrapper.find("tbody tr").text();
		await pctButtons(wrapper)[3].trigger("click");

		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_change", {
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

		expect(wrapper.text()).toContain("plan.tools.plan_check.empty");
		expect(wrapper.find("table").exists()).toBe(false);
	});

	it("falls back to Market check when a logged-out user's view is Compare", async () => {
		usePlanCheckView().view.value = "compare";
		const wrapper = await mountTool();
		const buttons = wrapper.findAll(
			"[aria-label='plan.tools.plan_check.view_label'] > button"
		);

		expect(buttons).toHaveLength(2);
		expect(buttons[0].attributes("aria-pressed")).toBe("true");
		expect(wrapper.find("[data-real-prices]").exists()).toBe(true);

		// choosing it stores the view, once
		await buttons[0].trigger("click");
		await buttons[0].trigger("click");
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_change", {
			view: "market",
		});
	});

	describe("with crafted rows", () => {
		const ROWS: ISensitivityRow[] = [
			// a bought material hurts when its price rises
			{ ticker: "ZZZ", side: "buy", slope: -4000, breakEven: 35 },
			{ ticker: "FE", side: "sell", slope: 1000, breakEven: "never" },
		];

		it("reads a bought top material as a price rise, with its break-even", async () => {
			crafted.rows = ROWS;
			const wrapper = await mountTool();
			const means = wrapper.text();

			expect(means).toContain("plan.tools.plan_check.means.higher");
			expect(means).not.toContain("plan.tools.plan_check.means.lower");
			expect(means).toContain("plan.tools.plan_check.means.break_even");
		});

		it("shows an unknown ticker with a neutral chip and no material name", async () => {
			crafted.rows = ROWS;
			const wrapper = await mountTool();
			const [zzz, fe] = wrapper.findAll("tbody tr");

			expect(zzz.find("span").classes()).toContain("bg-black/40");
			expect(fe.find("span").classes()).toContain(
				"material-category-metals"
			);
			await zzz.find(".ptooltip").trigger("mouseenter");
			await nextTick();
			const tip = document.body.querySelector("[role=tooltip]")!;
			expect(tip.textContent).toContain("ZZZ");
			expect(tip.textContent).not.toContain("iron");
		});

		it("has no show all button and no summary for 10 materials or fewer", async () => {
			crafted.rows = ROWS;
			const wrapper = await mountTool();

			expect(wrapper.findAll("tbody tr")).toHaveLength(2);
			expect(wrapper.find("button[aria-expanded]").exists()).toBe(false);
			expect(wrapper.text()).not.toContain("plan.tools.plan_check.more");
		});

		it("names the plan's CX as the price source", async () => {
			crafted.rows = ROWS;
			const pinia = createPinia();
			usePlanningStore(pinia).setCXs([
				// @ts-expect-error mock data
				{
					uuid: "cx-1",
					cx_name: "My CX",
					empires: [],
					cx_data: {
						cx_empire: [],
						cx_planets: [],
						ticker_empire: [],
						ticker_planets: [],
					},
				},
			]);
			const { wrapper } = await mountComponent(
				PlanCheck,
				{
					plan: etherwindPlan(),
					planUuid: undefined,
					empire: undefined,
					cxUuid: "cx-1",
					planet: planet_etherwind,
				},
				{ pinia }
			);
			await flushPromises();

			expect(wrapper.text()).toContain(
				"plan.tools.plan_check.means.source_cx"
			);
			expect(wrapper.text()).not.toContain(
				"plan.tools.plan_check.means.source_universe"
			);
		});
	});
});
