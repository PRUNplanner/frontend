// Types & Interfaces
import {
	IUpkeepBuilding,
	IUpkeepMaterialCalculation,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";

// Constants
import {
	UPKEEP_NEED_TYPES,
	UPKEEP_BUILDINGS,
} from "@/features/government/upkeepCalculations.constants";

// Re-export constants for backwards compatibility
export { UPKEEP_NEED_TYPES, UPKEEP_BUILDINGS };

/**
 * Calculates the price per need unit for a material
 * @param materialPrice The CX price of the material
 * @param qtyPerDay The quantity consumed per day
 * @param needProvided The amount of need provided by the building
 * @returns Price per need unit
 */
export function calculatePricePerNeed(
	materialPrice: number,
	qtyPerDay: number,
	needProvided: number
): number {
	if (needProvided === 0 || qtyPerDay === 0) return Infinity;
	const needPerQty = needProvided / qtyPerDay;
	return materialPrice / needPerQty;
}

/**
 * Calculates the relative price compared to the lowest price per need
 * @param materialPrice The CX price of the material
 * @param pricePerNeed The price per need for this material
 * @param lowestPricePerNeed The lowest price per need (anchor)
 * @returns Relative price
 */
export function calculateRelativePrice(
	materialPrice: number,
	pricePerNeed: number,
	lowestPricePerNeed: number
): number {
	if (pricePerNeed === 0 || pricePerNeed === Infinity) return materialPrice;
	return (materialPrice / pricePerNeed) * lowestPricePerNeed;
}

/**
 * Gets all buildings that provide a specific need type
 * @param needType The type of need
 * @returns Array of buildings providing that need
 */
export function getBuildingsForNeed(needType: UpkeepNeedType): IUpkeepBuilding[] {
	return UPKEEP_BUILDINGS.filter((building) => building.needs[needType] > 0);
}

/**
 * Counts how many need types a building provides
 * Used to split value equally among needs for multi-need buildings
 * @param building The building to check
 * @returns Number of need types provided (1 or 2)
 */
export function getBuildingNeedCount(building: IUpkeepBuilding): number {
	return UPKEEP_NEED_TYPES.filter((needType) => building.needs[needType] > 0)
		.length;
}

/**
 * Calculates material prices for a specific need type
 * @param needType The type of need
 * @param getPriceFunc Function to get material prices
 * @returns Array of material calculations sorted by price per need
 */
export async function calculateMaterialsForNeed(
	needType: UpkeepNeedType,
	getPriceFunc: (ticker: string) => Promise<number>
): Promise<IUpkeepMaterialCalculation[]> {
	const buildings = getBuildingsForNeed(needType);
	const calculations: IUpkeepMaterialCalculation[] = [];

	for (const building of buildings) {
		const needProvided = building.needs[needType];
		// For buildings with multiple needs, multiply by need count
		// since the same materials provide value for all needs
		const needCount = getBuildingNeedCount(building);
		const effectiveNeed = needProvided * needCount;

		for (const material of building.materials) {
			const cxPrice = await getPriceFunc(material.ticker);
			const pricePerNeed = calculatePricePerNeed(
				cxPrice,
				material.qtyPerDay,
				effectiveNeed
			);

			calculations.push({
				ticker: material.ticker,
				buildingTicker: building.ticker,
				qtyPerDay: material.qtyPerDay,
				needProvided,
				pricePerNeed,
				cxPrice,
				relativePrice: 0, // Will be calculated after sorting
			});
		}
	}

	// Sort by price per need ascending, but put items with no price (0) at the end
	calculations.sort((a, b) => {
		if (a.cxPrice <= 0 && b.cxPrice <= 0) return 0;
		if (a.cxPrice <= 0) return 1;
		if (b.cxPrice <= 0) return -1;
		return a.pricePerNeed - b.pricePerNeed;
	});

	// Calculate relative prices using the lowest PRICED material as anchor
	const pricedCalculations = calculations.filter((c) => c.cxPrice > 0);
	if (pricedCalculations.length > 0) {
		const lowestPricePerNeed = pricedCalculations[0].pricePerNeed;
		for (const calc of calculations) {
			if (calc.cxPrice > 0) {
				calc.relativePrice = calculateRelativePrice(
					calc.cxPrice,
					calc.pricePerNeed,
					lowestPricePerNeed
				);
			}
			// Materials with no price keep relativePrice = 0
		}
	}

	return calculations;
}
