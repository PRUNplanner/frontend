import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import PlanAnalyticsBox from "@/features/plan_analytics/components/PlanAnalyticsBox.vue";
import { mountComponent } from "@/tests/mountComponent";

const mock = new AxiosMockAdapter(apiService.client);

const PLANET = "ZV-307c";
const URL = new RegExp(`analytics/planet_insights/${PLANET}/$`);

const expert = (type: string, percentage: number) => ({ type, percentage });

// 8 experts, more than there are segment colours
const EXPERTS = [
	expert("Metallurgy", 45.5),
	expert("Food Industries", 20),
	expert("Resource Extraction", 10),
	expert("Chemistry", 8),
	expert("Construction", 6),
	expert("Electronics", 5),
	expert("Agriculture", 3.25),
	expert("Manufacturing", 2.25),
];

const INSIGHTS = {
	status: "success",
	planet_natural_id: PLANET,
	total_plans_analyzed: 42,
	insights_data: {
		expert_distribution: EXPERTS,
		building_distribution: [
			{ ticker: "SME", percentage: 60 },
			{ ticker: "FP", percentage: 40 },
		],
		// unsorted on purpose, shown sorted by building
		recipe_distribution: {
			SME: [
				{ recipe_id: "SME#1xC 4xFEO=>1xFE", percentage: 70 },
				{ recipe_id: "no-building", percentage: 20 },
				{ recipe_id: "SME#", percentage: 10 },
			],
			FP: [{ recipe_id: "FP#1xH2O=>1xDW", percentage: 100 }],
			BMP: [],
		},
	},
	last_updated: "2026-09-01T12:00:00Z",
};

async function mountBox(response: [number, unknown?] = [200, INSIGHTS]) {
	mock.onGet(URL).reply(...response);
	const mounted = await mountComponent(PlanAnalyticsBox, {
		planetNaturalId: PLANET,
	});
	await flushPromises();
	return mounted;
}

const toggle = (wrapper: VueWrapper) =>
	wrapper.find('button[aria-label="Toggle Insights"]');

async function open(wrapper: VueWrapper) {
	await toggle(wrapper).trigger("click");
}

/** the collapsible recipe groups, one button per building */
const recipeButtons = (wrapper: VueWrapper) =>
	wrapper.findAll("button.font-mono");

describe("PlanAnalyticsBox", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
	});

	it("loads the planet's insights once", async () => {
		const { wrapper } = await mountBox();

		expect(mock.history.get).toHaveLength(1);
		expect(toggle(wrapper).exists()).toBe(true);
		// closed until toggled
		expect(wrapper.text()).not.toContain("plan.tools.plan_analytics.title");
	});

	it("opens and closes the insights", async () => {
		const { wrapper } = await mountBox();

		await open(wrapper);
		expect(wrapper.text()).toContain("plan.tools.plan_analytics.title");

		// the close button in the header
		await wrapper.find("h3 + button").trigger("click");
		expect(wrapper.text()).not.toContain("plan.tools.plan_analytics.title");

		await open(wrapper);
		await open(wrapper);
		expect(wrapper.text()).not.toContain("plan.tools.plan_analytics.title");
	});

	it("shows the expert distribution with segment colours", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);

		const segments = wrapper.findAll("[title]");
		expect(segments.map((s) => s.attributes("title"))).toEqual(
			EXPERTS.map((e) => `${e.type}: ${e.percentage}%`)
		);
		expect(segments.at(0)!.attributes("style")).toBe("width: 45.5%;");

		const colours = segments.map((s) =>
			s.classes().find((c) => c.startsWith("bg-"))
		);
		// the last colour repeats for the 8th expert
		expect(colours).toEqual([
			"bg-prunplanner",
			"bg-white",
			"bg-white/80",
			"bg-white/60",
			"bg-white/40",
			"bg-white/20",
			"bg-white/10",
			"bg-white/10",
		]);
	});

	it("lists the experts with translated names and percentages", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);

		const items = wrapper.findAll("li").map((li) => li.text());
		expect(items.at(0)).toBe("game.expertise.METALLURGY45.50%");
		// spaces become underscores
		expect(items.at(1)).toBe("game.expertise.FOOD_INDUSTRIES20.00%");
		expect(items.at(2)).toBe("game.expertise.RESOURCE_EXTRACTION10.00%");
		expect(items).toHaveLength(8);
	});

	it("shows the building distribution", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);

		const bars = wrapper.findAll(".group");
		expect(bars.map((b) => b.text())).toEqual(["SME60%", "FP40%"]);
		expect(bars.at(1)!.find(".bg-prunplanner").attributes("style")).toBe(
			"width: 40%;"
		);
	});

	it("lists recipe groups sorted by building, collapsed", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);

		// building, recipe count and the arrow, the spans have no spaces
		expect(recipeButtons(wrapper).map((b) => b.text())).toEqual([
			"BMP0 ▼",
			"FP1 ▼",
			"SME3 ▼",
		]);
		expect(wrapper.text()).not.toContain("➔");
	});

	it("expands and collapses a building's recipes", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);
		const sme = () => recipeButtons(wrapper).at(2)!;

		await sme().trigger("click");
		expect(sme().find(".rotate-180").exists()).toBe(true);
		const recipes = wrapper
			.findAll(".mb-3.last\\:mb-0")
			.map((r) => r.text());
		expect(recipes).toEqual([
			// the recipe part after the building, arrow instead of =>
			"1xC 4xFEO ➔ 1xFE70%",
			// without a recipe part the id is shown as is
			"no-building20%",
			"SME#10%",
		]);

		// FP stays collapsed
		expect(wrapper.text()).not.toContain("1xH2O");

		await sme().trigger("click");
		expect(sme().find(".rotate-180").exists()).toBe(false);
		expect(wrapper.text()).not.toContain("➔");
	});

	it("keeps several buildings expanded", async () => {
		const { wrapper } = await mountBox();
		await open(wrapper);

		await recipeButtons(wrapper).at(1)!.trigger("click");
		await recipeButtons(wrapper).at(2)!.trigger("click");

		expect(wrapper.text()).toContain("1xH2O ➔ 1xDW");
		expect(wrapper.text()).toContain("1xC 4xFEO ➔ 1xFE");
	});

	it("renders nothing below the analysis threshold", async () => {
		const { wrapper } = await mountBox([
			200,
			{
				status: "below_threshold",
				planet_natural_id: PLANET,
				total_plans_analyzed: 0,
			},
		]);

		expect(mock.history.get).toHaveLength(1);
		expect(toggle(wrapper).exists()).toBe(false);
		expect(wrapper.text()).toBe("");
	});

	it("renders nothing when loading the insights fails", async () => {
		const { wrapper } = await mountBox([500]);

		expect(mock.history.get).toHaveLength(1);
		expect(toggle(wrapper).exists()).toBe(false);
	});

	it("renders nothing for an invalid response", async () => {
		// fewer than 15 plans are no valid insights
		const { wrapper } = await mountBox([
			200,
			{ ...INSIGHTS, total_plans_analyzed: 3 },
		]);

		expect(toggle(wrapper).exists()).toBe(false);
	});
});
