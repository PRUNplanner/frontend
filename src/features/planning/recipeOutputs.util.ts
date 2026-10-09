// Types & Interfaces
import type { Recipe } from "@/features/api/schemas/gameData.schemas";

/** A recipe's output tickers as one comparable key, e.g. "COF DW" */
function outputKey(recipe: Pick<Recipe, "outputs">): string {
	return recipe.outputs
		.map((o) => o.material_ticker)
		.sort()
		.join(" ");
}

/**
 * Another recipe of the building makes the same outputs, so a row of
 * this recipe needs its inputs to tell them apart (e.g. RAT recipes)
 *
 * @author jplacht
 *
 * @param {Recipe} recipe Recipe
 * @param {Recipe[]} options Recipes of the same building
 * @returns {boolean} Outputs collide
 */
export function hasOutputTwin(
	recipe: Pick<Recipe, "recipe_id" | "outputs">,
	options: Pick<Recipe, "recipe_id" | "outputs">[]
): boolean {
	const key: string = outputKey(recipe);
	return options.some(
		(o) => o.recipe_id !== recipe.recipe_id && outputKey(o) === key
	);
}
