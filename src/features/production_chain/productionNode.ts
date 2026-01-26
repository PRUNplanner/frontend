// Composables
import { useBuildingData } from "@/database/services/useBuildingData";

// Types & Interfaces
import {
	IBuilding,
	IRecipe,
	IRecipeMaterial,
} from "@/features/api/gameData.types";
import { IProductionGraphIO } from "@/features/production_chain/productionGraph.types";

/**
 * Map of extractable material tickers to their extraction building tickers.
 * Populated dynamically from planet resource data.
 * Key: material ticker (e.g., "SIO", "H2O", "O")
 * Value: building ticker (e.g., "EXT", "RIG", "COL")
 */
let extractableMaterials: Record<string, string> = {};

/**
 * Sets the extractable materials map. Called by ProductionGraph after loading
 * planet data to register all materials that can be extracted as natural resources.
 *
 * @param materials Map of material tickers to their extraction building tickers
 */
export function setExtractableMaterials(
	materials: Record<string, string>
): void {
	extractableMaterials = materials;
}

/**
 * Checks if a material is extractable (can be obtained from extraction buildings).
 *
 * @param materialTicker The material ticker to check
 * @returns True if the material can be extracted from COL/EXT/RIG
 */
export function isExtractable(materialTicker: string): boolean {
	return materialTicker in extractableMaterials;
}

/**
 * Gets the extraction building ticker for a material.
 *
 * @param materialTicker The material ticker
 * @returns The building ticker (COL/EXT/RIG) or undefined if not extractable
 */
function getExtractionBuilding(materialTicker: string): string | undefined {
	return extractableMaterials[materialTicker];
}

export class ProductionNode {
	readonly materialTicker: string;
	recipes: IRecipe[];
	amount: number = 0;
	recipeAmount: number = 1;
	hasInput: boolean = false;
	hasOutput: boolean = false;

	public constructor(materialTicker: string) {
		this.materialTicker = materialTicker;
		this.recipes = [];
	}

	get id(): string {
		return `NODE#${this.materialTicker}`;
	}

	get type(): string {
		return "chain";
	}

	addRecipe(recipe: IRecipe): void {
		if (!this.recipes.includes(recipe)) this.recipes.push(recipe);
	}

	getOutput(
		ticker: string,
		selectedRecipes: string[]
	): undefined | IProductionGraphIO {
		const recipe: IRecipe | undefined = this.getRecipe(selectedRecipes);

		if (recipe) {
			const output: IRecipeMaterial[] = recipe.Outputs.filter(
				(o) => o.Ticker === ticker
			);

			if (output.length > 0)
				return {
					materialTicker: output[0].Ticker,
					quantity: output[0].Amount,
				};
		}

		return undefined;
	}

	getInput(selectedRecipes: string[]): IProductionGraphIO[] {
		const inputs: IProductionGraphIO[] = [];

		// find the correct recipe
		const recipe: IRecipe | undefined = this.getRecipe(selectedRecipes);

		if (recipe)
			recipe.Inputs.map((i) => {
				inputs.push({
					materialTicker: i.Ticker,
					quantity: i.Amount,
				});
			});

		return inputs;
	}

	getRecipe(selectedRecipes: string[]): IRecipe | undefined {
		// skip if there is no recipe and not extractable
		if (
			!isExtractable(this.materialTicker) &&
			this.recipes.length === 0
		)
			return undefined;

		// Build the extraction recipe if this material is extractable
		const extractionRecipe: IRecipe | undefined = isExtractable(
			this.materialTicker
		)
			? {
					RecipeId: `${getExtractionBuilding(this.materialTicker) ?? "EXT"}#=>${this.materialTicker}`,
					BuildingTicker:
						getExtractionBuilding(this.materialTicker) ?? "EXT",
					RecipeName: `=>${this.materialTicker}`,
					TimeMs: 0,
					Inputs: [],
					Outputs: [{ Amount: 1, Ticker: this.materialTicker }],
			  }
			: undefined;

		// Check if user selected a specific recipe
		if (selectedRecipes.length > 0) {
			// Check if extraction recipe is selected
			if (
				extractionRecipe &&
				selectedRecipes.includes(extractionRecipe.RecipeId)
			) {
				return extractionRecipe;
			}

			// Check if a production recipe is selected
			const selectionMatch: IRecipe[] = this.recipes.filter((f) =>
				selectedRecipes.includes(f.RecipeId)
			);

			if (selectionMatch.length > 1) {
				throw new Error(
					`There can't be multiple matches for: ${this.materialTicker}, ${selectedRecipes}`
				);
			}
			if (selectionMatch.length === 1) return selectionMatch[0];
		}

		// Default: prefer extraction for extractable materials, otherwise first recipe
		if (extractionRecipe) return extractionRecipe;
		return this.recipes[0];
	}

	async getBuildingData(
		selectedRecipes: string[]
	): Promise<IBuilding | undefined> {
		const recipe: IRecipe | undefined = this.getRecipe(selectedRecipes);
		const { getBuilding } = await useBuildingData();

		if (recipe) return await getBuilding(recipe.BuildingTicker);
		return undefined;
	}
}
