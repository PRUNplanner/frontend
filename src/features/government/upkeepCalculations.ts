// Types & Interfaces
import {
	IUpkeepBuilding,
	IUpkeepMaterialCalculation,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";

export const UPKEEP_NEED_TYPES: UpkeepNeedType[] = [
	"safety",
	"health",
	"comfort",
	"culture",
	"education",
];

export const UPKEEP_BUILDINGS: IUpkeepBuilding[] = [
	{
		ticker: "SST",
		materials: [
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "SUN", qtyPerDay: 2 },
		],
		needs: { safety: 833.3, health: 0, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "SDP",
		materials: [
			{ ticker: "POW", qtyPerDay: 1 },
			{ ticker: "RAD", qtyPerDay: 0.47 },
			{ ticker: "CCD", qtyPerDay: 0.07 },
			{ ticker: "SUD", qtyPerDay: 0.07 },
		],
		needs: { safety: 1250, health: 0, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "EMC",
		materials: [
			{ ticker: "PK", qtyPerDay: 2 },
			{ ticker: "POW", qtyPerDay: 0.4 },
			{ ticker: "BND", qtyPerDay: 4 },
			{ ticker: "RED", qtyPerDay: 0.07 },
			{ ticker: "BSC", qtyPerDay: 0.07 },
		],
		needs: { safety: 200, health: 200, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "INF",
		materials: [
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "TUB", qtyPerDay: 6.67 },
			{ ticker: "STR", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 833.33, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "HOS",
		materials: [
			{ ticker: "PK", qtyPerDay: 2 },
			{ ticker: "SEQ", qtyPerDay: 0.4 },
			{ ticker: "BND", qtyPerDay: 4 },
			{ ticker: "SDR", qtyPerDay: 0.07 },
			{ ticker: "RED", qtyPerDay: 0.07 },
			{ ticker: "BSC", qtyPerDay: 0.13 },
		],
		needs: { safety: 0, health: 833.33, comfort: 0, culture: 0, education: 0 },
	},
	{
		ticker: "WCE",
		materials: [
			{ ticker: "KOM", qtyPerDay: 4 },
			{ ticker: "OLF", qtyPerDay: 2 },
			{ ticker: "DW", qtyPerDay: 6 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
			{ ticker: "PFE", qtyPerDay: 2.67 },
			{ ticker: "SOI", qtyPerDay: 6.67 },
		],
		needs: { safety: 0, health: 166.67, comfort: 166.7, culture: 0, education: 0 },
	},
	{
		ticker: "PAR",
		materials: [
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "FOD", qtyPerDay: 6 },
			{ ticker: "PFE", qtyPerDay: 2 },
			{ ticker: "SOI", qtyPerDay: 3.33 },
			{ ticker: "DEC", qtyPerDay: 0.33 },
		],
		needs: { safety: 0, health: 0, comfort: 500, culture: 0, education: 0 },
	},
	{
		ticker: "4DA",
		materials: [
			{ ticker: "POW", qtyPerDay: 2 },
			{ ticker: "MHP", qtyPerDay: 2 },
			{ ticker: "OLF", qtyPerDay: 4 },
			{ ticker: "BID", qtyPerDay: 0.2 },
			{ ticker: "HOG", qtyPerDay: 0.2 },
			{ ticker: "EDC", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 833.3, culture: 0, education: 0 },
	},
	{
		ticker: "ACA",
		materials: [
			{ ticker: "COF", qtyPerDay: 8 },
			{ ticker: "OLF", qtyPerDay: 2 },
			{ ticker: "VIT", qtyPerDay: 8 },
			{ ticker: "DW", qtyPerDay: 10 },
			{ ticker: "GL", qtyPerDay: 6.67 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 166.7, culture: 166.7, education: 0 },
	},
	{
		ticker: "ART",
		materials: [
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "HOG", qtyPerDay: 1 },
			{ ticker: "UTS", qtyPerDay: 0.67 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 625, education: 0 },
	},
	{
		ticker: "VRT",
		materials: [
			{ ticker: "POW", qtyPerDay: 1.4 },
			{ ticker: "MHP", qtyPerDay: 2 },
			{ ticker: "HOG", qtyPerDay: 1.4 },
			{ ticker: "OLF", qtyPerDay: 4 },
			{ ticker: "BID", qtyPerDay: 0.33 },
			{ ticker: "DEC", qtyPerDay: 0.67 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 833.3, education: 0 },
	},
	{
		ticker: "PBH",
		materials: [
			{ ticker: "OFF", qtyPerDay: 10 },
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "SP", qtyPerDay: 1.33 },
			{ ticker: "AAR", qtyPerDay: 0.67 },
			{ ticker: "EDC", qtyPerDay: 0.27 },
			{ ticker: "IDC", qtyPerDay: 0.13 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 166.7, education: 166.7 },
	},
	{
		ticker: "LIB",
		materials: [
			{ ticker: "MHP", qtyPerDay: 1 },
			{ ticker: "HOG", qtyPerDay: 1 },
			{ ticker: "CD", qtyPerDay: 0.33 },
			{ ticker: "DIS", qtyPerDay: 0.33 },
			{ ticker: "BID", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 500 },
	},
	{
		ticker: "UNI",
		materials: [
			{ ticker: "COF", qtyPerDay: 10 },
			{ ticker: "REA", qtyPerDay: 10 },
			{ ticker: "TUB", qtyPerDay: 10 },
			{ ticker: "BID", qtyPerDay: 0.33 },
			{ ticker: "HD", qtyPerDay: 0.67 },
			{ ticker: "IDC", qtyPerDay: 0.2 },
		],
		needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 833.3 },
	},
];

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
