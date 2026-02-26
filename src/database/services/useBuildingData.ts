import { computed } from "vue";

import { useDB } from "@/database/composables/useDB";
import { recipesStore, buildingsStore } from "@/database/stores";
import { usePlanetData } from "@/database/services/usePlanetData";

import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import { useWorkforceCalculation } from "@/features/planning/calculations/workforceCalculations";

// Types & Interfaces
import {
	IBuilding,
	IPlanet,
	IPlanetResource,
	IRecipe,
	PLANET_RESOURCETYPE_TYPE,
} from "@/features/api/gameData.types";
import { PSelectOption } from "@/ui/ui.types";
import { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";
import {
	IMaterialIOMinimal,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";

const buildingsCache = new Map<string, IBuilding>();

export async function useBuildingData() {
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

	const { getPlanetSpecialMaterials } = usePlanetData();
	const { combineMaterialIOMinimal } = await useMaterialIOUtil();
	const { calculateWorkforceConsumption } = await useWorkforceCalculation();

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
		cogc: PLAN_COGCPROGRAM_TYPE | undefined = undefined
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
					if (cogc && building.Expertise != cogc) {
						return [];
					}

					options.push({
						value: building.building_ticker,
						label:
							building.building_ticker +
							" (" +
							building.building_name
								.replace(/([A-Z])/g, " $1")
								.trim()
								.charAt(0)
								.toUpperCase() +
							building.building_name
								.replace(/([A-Z])/g, " $1")
								.trim()
								.slice(1) +
							")",
					});
				}
			});

		return options;
	}

	// static data
	const resourceBuildingTicker: Record<string, PLANET_RESOURCETYPE_TYPE> = {
		EXT: "MINERAL",
		COL: "GASEOUS",
		RIG: "LIQUID",
	};

	function getBuildingRecipes(
		buildingTicker: string,
		planetResources: IPlanetResource[] = []
	): IRecipe[] {
		/**
		 * Resource extraction buildings can only hold recipe options if
		 * there is a planetary resource available matching their potential
		 * extraction type.
		 */
		if (Object.keys(resourceBuildingTicker).includes(buildingTicker)) {
			// use planet resources to fetch recipes
			if (planetResources.length === 0) return [];

			const searchType: PLANET_RESOURCETYPE_TYPE =
				resourceBuildingTicker[buildingTicker];
			const relevantResources: IPlanetResource[] = planetResources.filter(
				(r) => r.resource_type === searchType
			);

			// create individual resource recipes
			const resourceRecipes: IRecipe[] = relevantResources.map((res) => {
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

			return resourceRecipes;
		} else {
			if (
				!Object.keys(recipeBuildingMap.value).includes(buildingTicker)
			) {
				throw new Error(
					`No recipe data: Building '${buildingTicker}'. Ensure ticker is valid and game data has been loaded.`
				);
			}

			/**
			 * Loose reactivity as recipe information gets transformed in
			 * plan calculations. E.g. by setting the correct times based
			 * on building efficiency
			 */
			return recipeBuildingMap.value[buildingTicker];
		}
	}

	function getTotalWorkforce(building: IBuilding): number {
		return (
			building.pioneers +
			building.settlers +
			building.technicians +
			building.engineers +
			building.scientists
		);
	}

	function getBuildingConstructionMaterials(
		building: IBuilding,
		planet: IPlanet | undefined
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

	function getBuildingWorkforceMaterials(
		building: IBuilding,
		lux1: boolean = true,
		lux2: boolean = true
	): IMaterialIOMinimal[] {
		// create a faked WorkforceRecord based on the buildings workforce
		const buildingWorkforce: IWorkforceRecord = {
			pioneer: {
				name: "pioneer",
				required: building.pioneers,
				capacity: building.pioneers,
				left: 0,
				lux1: lux1,
				lux2: lux2,
				efficiency: 1,
			},
			settler: {
				name: "settler",
				required: building.settlers,
				capacity: building.settlers,
				left: 0,
				lux1: lux1,
				lux2: lux2,
				efficiency: 1,
			},
			technician: {
				name: "technician",
				required: building.technicians,
				capacity: building.technicians,
				left: 0,
				lux1: lux1,
				lux2: lux2,
				efficiency: 1,
			},
			engineer: {
				name: "engineer",
				required: building.engineers,
				capacity: building.engineers,
				left: 0,
				lux1: lux1,
				lux2: lux2,
				efficiency: 1,
			},
			scientist: {
				name: "scientist",
				required: building.scientists,
				capacity: building.scientists,
				left: 0,
				lux1: lux1,
				lux2: lux2,
				efficiency: 1,
			},
		};

		return calculateWorkforceConsumption(buildingWorkforce);
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
