// Util
import type { BOUNDARY_DESCRIPTOR } from "@/util/numbers.types";
import { boundaryDescriptor } from "@/util/numbers";
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";
import { combineMaterialIOMinimal } from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type {
	Building,
	Planet,
	PlanetResource,
	Recipe,
	PlanetResourceType,
} from "@/features/api/schemas/gameData.schemas";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";

/**
 * Game data helpers of the planning engine: building lookup, construction
 * materials and recipes. Plain functions over plain data.
 */

/**
 * Planetary type static boundaries
 */

// Gravity
export const boundaryGravityLow: number = 0.25;
export const boundaryGravityHigh: number = 2.5;

// Pressure
export const boundaryPressureLow: number = 0.25;
export const boundaryPressureHigh: number = 2.0;

// Temperature
export const boundaryTemperatureLow: number = -25.0;
export const boundaryTemperatureHigh: number = 75.0;

/**
 * Synchronous building lookup, throws if the ticker is unknown
 */
export function getBuilding(
	buildings: ReadonlyMap<string, Building>,
	buildingTicker: string
): Building {
	const building = buildings.get(buildingTicker);

	if (!building) throw new Error(`Building ${buildingTicker} not available.`);

	return building;
}

export function getTotalWorkforce(building: Building): number {
	return (
		building.pioneers +
		building.settlers +
		building.technicians +
		building.engineers +
		building.scientists
	);
}

/**
 * Gets a planets additional building materials based on
 * its conditions like Surface, Temperature or Gravity
 *
 * @author jplacht
 *
 * @param {Planet} planet Planet Data
 * @param {number} areaCost Buildings AreaCost
 * @returns {IMaterialIOMinimal[]} Special Construction Materials
 */
export function getPlanetSpecialMaterials(
	planet: Planet,
	areaCost: number
): IMaterialIOMinimal[] {
	const additions: IMaterialIOMinimal[] = [];

	// Rocky
	if (planet.surface)
		additions.push({ ticker: "MCG", input: areaCost * 4, output: 0 });
	// Gaseous
	else
		additions.push({
			ticker: "AEF",
			input: Math.ceil(areaCost / 3),
			output: 0,
		});

	const gravityType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
		planet.gravity,
		boundaryGravityLow,
		boundaryGravityHigh
	);

	const pressureType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
		planet.pressure,
		boundaryPressureLow,
		boundaryPressureHigh
	);

	const temperatureType: BOUNDARY_DESCRIPTOR = boundaryDescriptor(
		planet.temperature,
		boundaryTemperatureLow,
		boundaryTemperatureHigh
	);

	// Gravity
	if (gravityType === "LOW")
		additions.push({ ticker: "MGC", input: 1, output: 0 });
	else if (gravityType === "HIGH")
		additions.push({ ticker: "BL", input: 1, output: 0 });

	// Pressure
	if (pressureType === "LOW")
		additions.push({ ticker: "SEA", input: areaCost, output: 0 });
	else if (pressureType === "HIGH")
		additions.push({ ticker: "HSE", input: 1, output: 0 });

	// Temperature
	if (temperatureType === "LOW")
		additions.push({ ticker: "INS", input: areaCost * 10, output: 0 });
	else if (temperatureType === "HIGH")
		additions.push({ ticker: "TSH", input: 1, output: 0 });

	return additions;
}

/**
 * A building's construction materials, including the planet's additional
 * materials if a planet is given
 * @author jplacht
 *
 * @param {Building} building Building Data
 * @param {Planet | undefined} planet Planet Data
 * @returns {IMaterialIOMinimal[]} Construction Materials
 */
export function getBuildingConstructionMaterials(
	building: Building,
	planet: Planet | undefined
): IMaterialIOMinimal[] {
	const materials: IMaterialIOMinimal[] = [];

	building.costs.forEach((m) => {
		materials.push({
			ticker: m.material_ticker,
			input: m.material_amount,
			output: 0,
		});
	});

	// get and add additional planet construction materials
	if (planet) {
		return combineMaterialIOMinimal([
			materials,
			getPlanetSpecialMaterials(planet, building.area_cost),
		]);
	} else {
		return materials;
	}
}

// extraction buildings and the resource type they extract
export const resourceBuildingTicker: Record<string, PlanetResourceType> = {
	EXT: "MINERAL",
	COL: "GASEOUS",
	RIG: "LIQUID",
};

/**
 * A building's recipes. Extraction buildings get one recipe per matching
 * planet resource; they have none without planet resources.
 * @author jplacht
 *
 * @param {Readonly<Record<string, Recipe[]>>} recipesByBuilding Recipes
 * @param {string} buildingTicker Building Ticker
 * @param {PlanetResource[]} planetResources Planet Resources
 * @returns {Recipe[]} Recipes
 */
export function getBuildingRecipes(
	recipesByBuilding: Readonly<Record<string, Recipe[]>>,
	buildingTicker: string,
	planetResources: PlanetResource[] = []
): Recipe[] {
	/**
	 * Resource extraction buildings can only hold recipe options if
	 * there is a planetary resource available matching their potential
	 * extraction type.
	 */
	if (Object.keys(resourceBuildingTicker).includes(buildingTicker)) {
		// use planet resources to fetch recipes
		if (planetResources.length === 0) return [];

		const searchType: PlanetResourceType =
			resourceBuildingTicker[buildingTicker];
		const relevantResources: PlanetResource[] = planetResources.filter(
			(r) => r.resource_type === searchType
		);

		// create individual resource recipes
		return relevantResources.map((res) => {
			const { timeMs, extractionAmount } = calculateExtraction(
				res.resource_type,
				res.daily_extraction
			);

			return {
				recipe_id: `${buildingTicker}#${res.material_ticker}`,
				building_ticker: buildingTicker,
				recipe_name: buildingTicker,
				time_ms: timeMs,
				inputs: [],
				outputs: [
					{
						material_ticker: res.material_ticker,
						material_amount: extractionAmount,
					},
				],
			};
		});
	}

	if (!Object.keys(recipesByBuilding).includes(buildingTicker)) {
		throw new Error(
			`No recipe data: Building '${buildingTicker}'. Ensure ticker is valid and game data has been loaded.`
		);
	}

	return recipesByBuilding[buildingTicker];
}

/**
 * Groups recipes by their building, keeping their order
 * @param {Iterable<Recipe>} recipes Recipes
 * @returns {Record<string, Recipe[]>} Recipes by building ticker
 */
export function groupRecipesByBuilding(
	recipes: Iterable<Recipe>
): Record<string, Recipe[]> {
	const map: Record<string, Recipe[]> = {};
	for (const recipe of recipes) {
		const list: Recipe[] | undefined = map[recipe.building_ticker];
		if (list) list.push(recipe);
		else map[recipe.building_ticker] = [recipe];
	}
	return map;
}
