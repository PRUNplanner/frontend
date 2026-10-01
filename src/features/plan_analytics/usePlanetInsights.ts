import {
	computed,
	type ComputedRef,
	type MaybeRefOrGetter,
	shallowRef,
	toValue,
	watch,
} from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { usePreferences } from "@/features/preferences/usePreferences";

// Types & Interfaces
import type {
	AnalyticsPlanetInsightsBuilding,
	AnalyticsPlanetInsightsData,
} from "@/features/api/schemas/analyticsData.schemas";
import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";

/** highest percentage first, undefined for an empty list */
function top<T extends { percentage: number }>(items: T[]): T | undefined {
	return items.reduce<T | undefined>(
		(best, item) =>
			best === undefined || item.percentage > best.percentage
				? item
				: best,
		undefined
	);
}

/**
 * # Planet Insights
 *
 * Popularity of buildings and recipes on a planet (aggregate v2), for the
 * plan editor's pickers. Nothing is requested while the user's "Plan
 * suggestions" preference is off. Every caller executes the same named
 * query, the query store shares one request and its cache per planet.
 *
 * @author jplacht
 *
 * @param {MaybeRefOrGetter<string>} planetNaturalId Planet Natural Id
 */
export function usePlanetInsights(planetNaturalId: MaybeRefOrGetter<string>) {
	const { planSuggestions: isEnabled } = usePreferences();
	const insights = shallowRef<AnalyticsPlanetInsightsData | null>(null);

	watch(
		[() => toValue(planetNaturalId), isEnabled],
		([planet, enabled]) => {
			insights.value = null;
			if (!enabled) return;

			useQuery("GetAnalyticsPlanetInsights", { planetNaturalId: planet })
				.execute()
				.then((data) => {
					// planet or setting changed while loading
					if (
						data.status !== "success" ||
						planet !== toValue(planetNaturalId) ||
						!isEnabled.value
					)
						return;
					insights.value = data;
				})
				// insights are optional, the pickers stay as they are
				.catch(() => {});
		},
		{ immediate: true }
	);

	const buildings: ComputedRef<Map<string, AnalyticsPlanetInsightsBuilding>> =
		computed(
			() =>
				new Map(
					(insights.value?.insights_data.buildings ?? []).map((b) => [
						b.ticker,
						b,
					])
				)
		);

	const isAvailable: ComputedRef<boolean> = computed(
		() => buildings.value.size > 0
	);

	/** v2 expert counts, empty for v1 rows */
	const experts: ComputedRef<
		AnalyticsPlanetInsightsData["insights_data"]["experts"]
	> = computed(() => insights.value?.insights_data.experts ?? []);

	const totalPlans: ComputedRef<number> = computed(
		() => insights.value?.total_plans_analyzed ?? 0
	);

	/** buildings of the aggregate, most planned first */
	const popularBuildings: ComputedRef<AnalyticsPlanetInsightsBuilding[]> =
		computed(() =>
			[...buildings.value.values()].sort(
				(a, b) => b.percentage - a.percentage
			)
		);

	function buildingPopularity(ticker: string): number | undefined {
		return buildings.value.get(ticker)?.percentage;
	}

	function recipePopularity(
		ticker: string,
		recipeId: string
	): number | undefined {
		return buildings.value
			.get(ticker)
			?.recipes.find((r) => r.recipe_id === recipeId)?.percentage;
	}

	function mostPlannedRecipe(ticker: string): string | undefined {
		return top(buildings.value.get(ticker)?.recipes ?? [])?.recipe_id;
	}

	/**
	 * The recipes a building typically runs here: its most planned mix with
	 * the median slots of each recipe, else its most planned recipe with
	 * its median slots, else undefined
	 *
	 * @param {string} ticker Building Ticker
	 * @returns {ITypicalRecipes | undefined} Typical recipes
	 */
	function typicalRecipes(ticker: string): ITypicalRecipes | undefined {
		const building = buildings.value.get(ticker);
		if (!building) return undefined;

		const mix = top(building.mixes);
		if (mix)
			return {
				percentage: mix.percentage,
				recipes: mix.recipe_ids.map((recipeid) => ({
					recipeid,
					amount: Math.max(1, mix.recipe_amounts[recipeid] ?? 1),
				})),
			};

		const recipe = top(building.recipes);
		if (recipe)
			return {
				percentage: recipe.percentage,
				recipes: [
					{
						recipeid: recipe.recipe_id,
						amount: Math.max(1, recipe.median_amount),
					},
				],
			};

		return undefined;
	}

	return {
		isEnabled,
		isAvailable,
		totalPlans,
		experts,
		popularBuildings,
		buildingPopularity,
		recipePopularity,
		mostPlannedRecipe,
		typicalRecipes,
	};
}
