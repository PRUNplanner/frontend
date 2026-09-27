import { computed } from "vue";
import { i18n } from "@/lib/i18n";
import type { Composer } from "vue-i18n";

import { useDB } from "@/database/composables/useDB";
import { recipesStore, buildingsStore } from "@/database/stores";

import {
	getBuildingConstructionMaterials,
	getBuildingRecipes as getRecipes,
	getTotalWorkforce,
	resourceBuildingTicker,
} from "@/features/planning/engine/buildings";
import { getBuildingWorkforceMaterials } from "@/features/planning/engine/workforce";

// Types & Interfaces
import type {
	Building,
	PlanetResource,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import { PSelectOption } from "@/ui/ui.types";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

const buildingsCache = new Map<string, Building>();

export function useBuildingData() {
	const {
		allData: allDataBuildings,
		get: getStoreBuilding,
		preload: preloadBuildings,
	} = useDB(buildingsStore);

	const {
		allData: allDataRecipes,
		get: _getStoreRecipe,
		preload: preloadRecipes,
	} = useDB(recipesStore);

	const { t } = i18n.global as unknown as Composer;

	const buildingsMap = computed((): Record<string, Building> => {
		return (allDataBuildings.value ?? []).reduce(
			(acc, building) => {
				acc[building.building_ticker] = building;
				return acc;
			},
			{} as Record<string, Building>
		);
	});

	const recipeBuildingMap = computed((): Record<string, Recipe[]> => {
		return (allDataRecipes.value ?? []).reduce(
			(acc, recipe) => {
				if (acc[recipe.building_ticker])
					acc[recipe.building_ticker].push(recipe);
				else acc[recipe.building_ticker] = [recipe];

				return acc;
			},
			{} as Record<string, Recipe[]>
		);
	});

	async function getBuilding(buildingTicker: string): Promise<Building> {
		if (buildingsCache.has(buildingTicker))
			return buildingsCache.get(buildingTicker)!;

		const building = await getStoreBuilding(buildingTicker);

		if (!building)
			throw new Error(`Building ${buildingTicker} not available.`);

		buildingsCache.set(buildingTicker, building);
		return building;
	}

	function getAllBuildingRecipes(): Record<string, Recipe[]> {
		return recipeBuildingMap.value;
	}

	function getProductionBuildingOptions(
		existing: string[],
		cogc: PlanCOGCProgram | undefined = undefined
	): PSelectOption[] {
		const options: PSelectOption[] = [];

		Object.values(buildingsMap.value)
			.filter(
				(b) =>
					b.habitations === null &&
					b.building_type !== "PLANETARY" &&
					b.building_type !== "INFRASTRUCTURE"
			)
			.forEach((building) => {
				// only production buildings that are not in existing list
				if (!existing.includes(building.building_ticker)) {
					// check for matching COGC
					if (cogc && building.expertise != cogc) {
						return [];
					}

					options.push({
						value: building.building_ticker,
						label: `${building.building_ticker} (${t(`game.building.${building.building_ticker}`)})`,
					});
				}
			});

		return options;
	}
	/**
	 * A building's recipes, extraction buildings from planet resources.
	 * See getBuildingRecipes in the planning engine (engine/buildings.ts).
	 *
	 * @param {string} buildingTicker Building Ticker
	 * @param {PlanetResource[]} planetResources Planet Resources
	 * @returns {Recipe[]} Recipes
	 */
	function getBuildingRecipes(
		buildingTicker: string,
		planetResources: PlanetResource[] = []
	): Recipe[] {
		// extraction recipes come from planet resources, skip the recipe map
		return getRecipes(
			buildingTicker in resourceBuildingTicker
				? {}
				: recipeBuildingMap.value,
			buildingTicker,
			planetResources
		);
	}

	return {
		preloadBuildings,
		preloadRecipes,
		//
		allDataBuildings,
		// computed maps
		buildingsMap,
		recipeBuildingMap,
		// functions
		getBuilding,
		getAllBuildingRecipes,
		getProductionBuildingOptions,
		getBuildingRecipes,
		getTotalWorkforce,
		getBuildingConstructionMaterials,
		getBuildingWorkforceMaterials,
		// static data
		resourceBuildingTicker,
	};
}
