import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

const execute = vi.hoisted(() => vi.fn());

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (_name: string, params: unknown) => ({
		execute: () => execute(params),
	}),
}));

const v2 = {
	status: "success",
	planet_natural_id: "KW-688c",
	total_plans_analyzed: 24,
	total_users: 12,
	insights_data: {
		expert_distribution: [],
		building_distribution: [],
		recipe_distribution: {},
		experts: [],
		buildings: [
			{
				ticker: "PP1",
				plans: 6,
				users: 10,
				percentage: 25,
				median_amount: 1,
				recipes: [
					{ recipe_id: "PP1#b", plans: 3, percentage: 40, median_amount: 0 },
					{ recipe_id: "PP1#a", plans: 4, percentage: 60, median_amount: 2 },
				],
				mixes: [],
			},
			{
				ticker: "FRM",
				plans: 24,
				users: 12,
				percentage: 100,
				median_amount: 3,
				recipes: [
					{ recipe_id: "FRM#a", plans: 24, percentage: 100, median_amount: 2 },
				],
				mixes: [
					{
						recipe_ids: ["FRM#a", "FRM#b"],
						plans: 10,
						percentage: 42,
						median_building_amount: 3,
						recipe_amounts: { "FRM#a": 2, "FRM#b": 1 },
					},
					{
						recipe_ids: ["FRM#a", "FRM#c"],
						plans: 12,
						percentage: 50,
						median_building_amount: 3,
						recipe_amounts: { "FRM#a": 3, "FRM#c": 4 },
					},
				],
			},
			{
				ticker: "CHP",
				plans: 4,
				users: 10,
				percentage: 17,
				median_amount: 1,
				recipes: [],
				mixes: [],
			},
		],
	},
	last_updated: "2026-10-01T03:43:09.504511Z",
};

describe("usePlanetInsights", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		execute.mockReset();
		execute.mockResolvedValue(v2);
	});

	it("makes no request while plan suggestions are off", async () => {
		useUserStore().preferences.planSuggestions = false;

		const { isAvailable } = usePlanetInsights("KW-688c");
		await flushPromises();

		expect(execute).not.toHaveBeenCalled();
		expect(isAvailable.value).toBe(false);
	});

	it("loads when the setting is turned on and clears when off", async () => {
		const userStore = useUserStore();
		userStore.preferences.planSuggestions = false;
		const { isAvailable } = usePlanetInsights("KW-688c");

		userStore.preferences.planSuggestions = true;
		await flushPromises();
		expect(execute).toHaveBeenCalledWith({ planetNaturalId: "KW-688c" });
		expect(isAvailable.value).toBe(true);

		userStore.preferences.planSuggestions = false;
		await nextTick();
		expect(isAvailable.value).toBe(false);
	});

	it("exposes popularity, most planned first", async () => {
		const {
			isAvailable,
			totalPlans,
			popularBuildings,
			buildingPopularity,
			recipePopularity,
			mostPlannedRecipe,
		} = usePlanetInsights("KW-688c");
		await flushPromises();

		expect(isAvailable.value).toBe(true);
		expect(totalPlans.value).toBe(24);
		expect(popularBuildings.value.map((b) => b.ticker)).toStrictEqual([
			"FRM",
			"PP1",
			"CHP",
		]);
		expect(buildingPopularity("FRM")).toBe(100);
		expect(buildingPopularity("XXX")).toBeUndefined();
		expect(recipePopularity("PP1", "PP1#b")).toBe(40);
		expect(recipePopularity("PP1", "PP1#x")).toBeUndefined();
		expect(mostPlannedRecipe("PP1")).toBe("PP1#a");
		expect(mostPlannedRecipe("CHP")).toBeUndefined();
	});

	it("gives the typical mix, else the most planned recipe, else nothing", async () => {
		const { typicalRecipes } = usePlanetInsights("KW-688c");
		await flushPromises();

		expect(typicalRecipes("FRM")).toStrictEqual({
			percentage: 50,
			recipes: [
				{ recipeid: "FRM#a", amount: 3 },
				{ recipeid: "FRM#c", amount: 4 },
			],
		});
		// median 2 slots, never below one
		expect(typicalRecipes("PP1")).toStrictEqual({
			percentage: 60,
			recipes: [{ recipeid: "PP1#a", amount: 2 }],
		});
		expect(typicalRecipes("CHP")).toBeUndefined();
		expect(typicalRecipes("XXX")).toBeUndefined();
	});

	it("has no data for a v1 row, below threshold or an error", async () => {
		const { buildings: _, ...v1Data } = v2.insights_data;
		execute.mockResolvedValueOnce({
			...v2,
			insights_data: { ...v1Data, buildings: [] },
		});
		expect(usePlanetInsights("A").isAvailable.value).toBe(false);

		execute.mockResolvedValueOnce({
			status: "below_threshold",
			planet_natural_id: "B",
			total_plans_analyzed: 0,
			insights_data: null,
		});
		const below = usePlanetInsights("B");

		execute.mockRejectedValueOnce(new Error("500"));
		const failed = usePlanetInsights("C");
		await flushPromises();

		expect(below.isAvailable.value).toBe(false);
		expect(failed.isAvailable.value).toBe(false);
	});

	it("follows the planet", async () => {
		const planet = ref("KW-688c");
		const { isAvailable } = usePlanetInsights(planet);
		await flushPromises();
		expect(isAvailable.value).toBe(true);

		execute.mockResolvedValueOnce({
			status: "below_threshold",
			planet_natural_id: "B",
			total_plans_analyzed: 0,
		});
		planet.value = "B";
		await flushPromises();
		expect(execute).toHaveBeenLastCalledWith({ planetNaturalId: "B" });
		expect(isAvailable.value).toBe(false);
	});

	it("exposes the v2 experts, empty without insights", async () => {
		const experts = [
			{ type: "Chemistry", plans_percentage: 80, median_amount: 2 },
		];
		execute.mockResolvedValue({
			...v2,
			insights_data: { ...v2.insights_data, experts },
		});
		const insights = usePlanetInsights("KW-688c");
		expect(insights.experts.value).toStrictEqual([]);

		await flushPromises();
		expect(insights.experts.value).toStrictEqual(experts);
	});
});
