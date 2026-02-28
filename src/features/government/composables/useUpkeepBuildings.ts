// Types & Interfaces
import {
	IUpkeepBuilding,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";
import {
	UPKEEP_BUILDINGS,
	UPKEEP_NEED_TYPES,
} from "@/features/government/upkeepCalculations";

/**
 * Composable for accessing and filtering upkeep building data
 * Reusable by: price calculator, infrastructure planner, budget simulator
 */
export function useUpkeepBuildings() {
	const buildings: IUpkeepBuilding[] = UPKEEP_BUILDINGS;
	const needTypes: UpkeepNeedType[] = UPKEEP_NEED_TYPES;

	/**
	 * Gets all buildings that provide a specific need type
	 * @param needType The type of need
	 * @returns Array of buildings providing that need
	 */
	function getBuildingsForNeed(needType: UpkeepNeedType): IUpkeepBuilding[] {
		return buildings.filter((building) => building.needs[needType] > 0);
	}

	/**
	 * Gets a building by its ticker
	 * @param ticker The building ticker (e.g., "SST", "HOS")
	 * @returns The building or undefined if not found
	 */
	function getBuildingByTicker(ticker: string): IUpkeepBuilding | undefined {
		return buildings.find((building) => building.ticker === ticker);
	}

	/**
	 * Counts how many need types a building provides
	 * Used to split value equally among needs for multi-need buildings
	 * @param building The building to check
	 * @returns Number of need types provided (1 or 2)
	 */
	function getBuildingNeedCount(building: IUpkeepBuilding): number {
		return needTypes.filter((needType) => building.needs[needType] > 0).length;
	}

	/**
	 * Gets all need types that a building provides
	 * @param building The building to check
	 * @returns Array of need types provided
	 */
	function getBuildingNeedTypes(building: IUpkeepBuilding): UpkeepNeedType[] {
		return needTypes.filter((needType) => building.needs[needType] > 0);
	}

	return {
		buildings,
		needTypes,
		getBuildingsForNeed,
		getBuildingByTicker,
		getBuildingNeedCount,
		getBuildingNeedTypes,
	};
}
