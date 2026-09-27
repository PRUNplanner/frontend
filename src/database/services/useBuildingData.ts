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
import {
	IBuilding,
	IPlanetResource,
	IRecipe,
} from "@/features/api/gameData.types";
import { PSelectOption } from "@/ui/ui.types";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

const buildingsCache = new Map<string, IBuilding>();

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

	const buildingsMap = computed((): Record<string, IBuilding> => {
		return (allDataBuildings.value ?? []).reduce(
			(acc, building) => {
				acc[building.building_ticker] = building;
				return acc;
			},
			{} as Record<string, IBuilding>
		);
	});

	const recipeBuildingMap = computed((): Record<string, IRecipe[]> => {
		return (allDataRecipes.value ?? []).reduce(
			(acc, recipe) => {
				if (acc[recipe.building_ticker])
					acc[recipe.building_ticker].push(recipe);
				else acc[recipe.building_ticker] = [recipe];

				return acc;
			},
			{} as Record<string, IRecipe[]>
		);
	});

	async function getBuilding(buildingTicker: string): Promise<IBuilding> {
		if (buildingsCache.has(buildingTicker))
			return buildingsCache.get(buildingTicker)!;

		const building = await getStoreBuilding(buildingTicker);

		if (!building)
			throw new Error(`Building ${buildingTicker} not available.`);

		buildingsCache.set(buildingTicker, building);
		return building;
	}

	function getAllBuildingRecipes(): Record<string, IRecipe[]> {
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
	 * @param {IPlanetResource[]} planetResources Planet Resources
	 * @returns {IRecipe[]} Recipes
	 */
	function getBuildingRecipes(
		buildingTicker: string,
		planetResources: IPlanetResource[] = []
	): IRecipe[] {
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
