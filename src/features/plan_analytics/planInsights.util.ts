// Types & Interfaces
import {
	type ExpertType,
	ExpertTypeSchema,
} from "@/features/api/schemas/planningData.schemas";
import type {
	AnalyticsPlanetInsightsBuilding,
	AnalyticsPlanetInsightsData,
} from "@/features/api/schemas/analyticsData.schemas";
import type { Recipe } from "@/features/api/schemas/gameData.schemas";
import type { ITypicalRecipes } from "@/features/plan_analytics/usePlanetInsights.types";

// Engine
import {
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
} from "@/features/planning/engine/efficiency";

/** buildings the starter card lists, most planned first */
export const STARTER_MAX_BUILDINGS = 8;
/** buildings in at least this % of plans start checked */
export const STARTER_PRESELECT_PERCENTAGE = 20;
/** expert types in at least this % of plans are added */
const STARTER_EXPERT_PERCENTAGE = 50;

/**
 * Colour of a segment in an insights split bar, the first one in the
 * brand colour
 *
 * @param {number} index Segment index
 * @returns {string} Tailwind background class
 */
export function segmentColor(index: number): string {
	const colors = [
		"bg-prunplanner",
		"bg-white",
		"bg-white/80",
		"bg-white/60",
		"bg-white/40",
		"bg-white/20",
		"bg-white/10",
	];
	return colors[index] || colors[colors.length - 1];
}

/**
 * The experts a typical setup adds: types in at least half of the
 * planet's plans with their median amount, within the expert limits
 * (most planned types first)
 *
 * @param experts v2 experts of the planet insights
 * @returns Expert types and amounts
 */
export function starterExperts(
	experts: AnalyticsPlanetInsightsData["insights_data"]["experts"]
): { type: ExpertType; amount: number }[] {
	let left = MAX_EXPERTS_TOTAL;
	return [...experts]
		.sort((a, b) => b.plans_percentage - a.plans_percentage)
		.flatMap((e) => {
			const type = ExpertTypeSchema.safeParse(e.type);
			if (!type.success || e.plans_percentage < STARTER_EXPERT_PERCENTAGE)
				return [];
			const amount = Math.min(
				Math.round(e.median_amount),
				MAX_EXPERTS_PER_TYPE,
				left
			);
			left -= amount;
			return amount > 0 ? [{ type: type.data, amount }] : [];
		});
}

/** highest percentage first, undefined for an empty list */
export function mostPlanned<T extends { percentage: number }>(
	items: T[]
): T | undefined {
	return items.reduce<T | undefined>(
		(best, item) =>
			best === undefined || item.percentage > best.percentage
				? item
				: best,
		undefined
	);
}

/**
 * The recipes a building typically runs here: its most planned mix with
 * the median slots of each recipe, else its most planned recipe with
 * its median slots, else undefined
 *
 * @param building Insights building, undefined if not in the aggregate
 * @returns Typical recipes
 */
export function typicalRecipes(
	building: AnalyticsPlanetInsightsBuilding | undefined
): ITypicalRecipes | undefined {
	if (!building) return undefined;

	const mix = mostPlanned(building.mixes);
	if (mix)
		return {
			percentage: mix.percentage,
			recipes: mix.recipe_ids.map((recipeid) => ({
				recipeid,
				amount: Math.max(1, mix.recipe_amounts[recipeid] ?? 1),
			})),
		};

	const recipe = mostPlanned(building.recipes);
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

/**
 * The buildings the starter card lists: the most planned ones with their
 * typical amount and the typical recipes the building can run on the
 * planet, plus what those recipes make
 *
 * @param popular Insights buildings, most planned first
 * @param typical Typical recipes of a building
 * @param recipesFor Recipes a building can run on the planet
 * @returns Starter candidates
 */
export function starterCandidates(
	popular: Pick<
		AnalyticsPlanetInsightsBuilding,
		"ticker" | "percentage" | "median_amount"
	>[],
	typical: (ticker: string) => ITypicalRecipes | undefined,
	recipesFor: (ticker: string) => Recipe[]
) {
	return popular.slice(0, STARTER_MAX_BUILDINGS).map((b) => {
		// only recipes the building can run here
		const options = recipesFor(b.ticker);
		const recipes = (typical(b.ticker)?.recipes ?? []).filter((r) =>
			options.some((o) => o.recipe_id === r.recipeid)
		);
		return {
			ticker: b.ticker,
			percentage: b.percentage,
			amount: Math.max(1, Math.round(b.median_amount)),
			recipes,
			outputs: recipes.flatMap(
				(r) =>
					options
						.find((o) => o.recipe_id === r.recipeid)
						?.outputs.map((m) => m.material_ticker) ?? []
			),
		};
	});
}
