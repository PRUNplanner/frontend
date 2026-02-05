import { Ref, ref, ComputedRef, computed } from "vue";

// Composables
import { usePrice } from "@/features/cx/usePrice";
import { useUpkeepBuildings } from "./useUpkeepBuildings";

// Calculations
import {
	calculatePricePerNeed,
	calculateRelativePrice,
} from "@/features/government/upkeepCalculations";

// Types & Interfaces
import {
	IUpkeepMaterialCalculation,
	UpkeepNeedType,
} from "@/features/government/upkeepCalculations.types";

/**
 * Composable for calculating upkeep material prices
 * Reusable by: price calculator view, cost analysis, building comparison
 */
export async function useUpkeepPriceCalculator(
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined> = ref(undefined)
) {
	const { getPrice } = await usePrice(cxUuid, planetNaturalId);
	const { getBuildingsForNeed, getBuildingNeedCount, needTypes } =
		useUpkeepBuildings();

	const isCalculating: Ref<boolean> = ref(false);
	const calculationResults: Ref<
		Record<UpkeepNeedType, IUpkeepMaterialCalculation[]>
	> = ref({
		safety: [],
		health: [],
		comfort: [],
		culture: [],
		education: [],
	});

	/**
	 * Calculates material prices for a specific need type
	 * @param needType The type of need to calculate
	 * @returns Array of material calculations sorted by price per need
	 */
	async function calculateMaterialsForNeed(
		needType: UpkeepNeedType
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
				const cxPrice = await getPrice(material.ticker, "BUY");
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

	/**
	 * Calculates material prices for all need types
	 * @returns Record of all need types with their material calculations
	 */
	async function calculateAllNeeds(): Promise<
		Record<UpkeepNeedType, IUpkeepMaterialCalculation[]>
	> {
		isCalculating.value = true;

		const results: Record<UpkeepNeedType, IUpkeepMaterialCalculation[]> = {
			safety: [],
			health: [],
			comfort: [],
			culture: [],
			education: [],
		};

		for (const needType of needTypes) {
			results[needType] = await calculateMaterialsForNeed(needType);
		}

		calculationResults.value = results;
		isCalculating.value = false;

		return results;
	}

	/**
	 * Gets the current results for a specific need type
	 * @param needType The need type to get results for
	 * @returns Computed array of material calculations
	 */
	function getResultsForNeed(
		needType: Ref<UpkeepNeedType>
	): ComputedRef<IUpkeepMaterialCalculation[]> {
		return computed(() => calculationResults.value[needType.value]);
	}

	return {
		isCalculating,
		calculationResults,
		calculateMaterialsForNeed,
		calculateAllNeeds,
		getResultsForNeed,
	};
}
