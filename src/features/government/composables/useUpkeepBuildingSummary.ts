// Composables
import { useUpkeepBuildings } from "./useUpkeepBuildings";

// Types & Interfaces
import {
	IUpkeepMaterialCalculation,
	IUpkeepBuildingSummary,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";

/**
 * Composable for aggregating upkeep data at building level
 * Reusable by: building comparison, summary views, infrastructure planner
 */
export function useUpkeepBuildingSummary() {
	const { getBuildingsForNeed, getBuildingByTicker } = useUpkeepBuildings();

	/**
	 * Calculates summary for a single building from its material calculations
	 * @param buildingTicker The building ticker
	 * @param materialCalculations All material calculations (will be filtered)
	 * @returns Building summary with aggregated costs and availability
	 */
	function calculateBuildingSummary(
		buildingTicker: string,
		materialCalculations: IUpkeepMaterialCalculation[]
	): IUpkeepBuildingSummary | undefined {
		const building = getBuildingByTicker(buildingTicker);
		if (!building) return undefined;

		// Filter calculations for this building
		const buildingMaterials = materialCalculations.filter(
			(calc) => calc.buildingTicker === buildingTicker
		);

		if (buildingMaterials.length === 0) return undefined;

		// Calculate aggregates
		const materialsWithPrice = buildingMaterials.filter(
			(calc) => calc.cxPrice > 0
		);
		const totalPricePerNeed = materialsWithPrice.reduce(
			(sum, calc) => sum + calc.pricePerNeed,
			0
		);
		const totalDailyCost = materialsWithPrice.reduce(
			(sum, calc) => sum + calc.cxPrice * calc.qtyPerDay,
			0
		);

		// Get need provided (from the first material, they all have the same)
		const needProvided = buildingMaterials[0].needProvided;

		return {
			ticker: buildingTicker,
			totalPricePerNeed,
			totalDailyCost,
			materialsAvailable: materialsWithPrice.length,
			materialsTotal: building.materials.length,
			needProvided,
			isComplete: materialsWithPrice.length === building.materials.length,
		};
	}

	/**
	 * Calculates summaries for all buildings providing a specific need
	 * @param needType The need type to calculate summaries for
	 * @param materialCalculations All material calculations for this need type
	 * @returns Array of building summaries sorted by total price per need
	 */
	function calculateAllBuildingSummaries(
		needType: UpkeepNeedType,
		materialCalculations: IUpkeepMaterialCalculation[]
	): IUpkeepBuildingSummary[] {
		const buildings = getBuildingsForNeed(needType);
		const summaries: IUpkeepBuildingSummary[] = [];

		for (const building of buildings) {
			const summary = calculateBuildingSummary(
				building.ticker,
				materialCalculations
			);
			if (summary) {
				summaries.push(summary);
			}
		}

		// Sort by total price per need ascending
		// Put incomplete buildings (missing material prices) at the end
		summaries.sort((a, b) => {
			if (!a.isComplete && !b.isComplete) {
				return a.totalPricePerNeed - b.totalPricePerNeed;
			}
			if (!a.isComplete) return 1;
			if (!b.isComplete) return -1;
			return a.totalPricePerNeed - b.totalPricePerNeed;
		});

		return summaries;
	}

	return {
		calculateBuildingSummary,
		calculateAllBuildingSummaries,
	};
}
