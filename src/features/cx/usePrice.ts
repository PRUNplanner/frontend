import { Ref } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useExchangeData } from "@/database/services/useExchangeData";
import { useBuildingData } from "@/database/services/useBuildingData";

// Price Book
import {
	createPriceBook,
	getExchangeCodeKey,
	enhanceMaterialIOMaterial as enhanceWithBook,
	getMaterialIOTotalPrice as totalWithBook,
	IPriceBook,
	PriceType,
} from "@/features/cx/priceBook";

// Types & Interfaces
import {
	IMaterialIO,
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";
import { infrastructureBuildingNames } from "@/features/planning/calculations/infrastructureCalculations";
import { IPlanet } from "@/features/api/gameData.types";
import { IInfrastructureCosts } from "@/features/cx/usePrice.types";

/**
 * # Material Prices
 *
 * Async access to material prices for a CX preference and planet. The
 * preference logic lives in `priceBook.ts`; every function here resolves
 * through a price book over the preloaded exchange data.
 */
export function usePrice(
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>
) {
	const planningStore = usePlanningStore();

	const { preload: preloadExchanges, getExchangeTickerLoaded } =
		useExchangeData();
	const {
		preloadBuildings,
		getBuildingLoaded,
		getBuildingConstructionMaterials,
	} = useBuildingData();

	/**
	 * Creates a price book for the current CX preference and planet, after
	 * making sure exchange data is loaded (a no-op once game data is loaded)
	 * @author jplacht
	 *
	 * @returns {Promise<IPriceBook>} Price Book
	 */
	async function getPriceBook(): Promise<IPriceBook> {
		await preloadExchanges();

		const uuid: string | undefined = cxUuid.value;
		return createPriceBook(
			uuid ? () => planningStore.getCX(uuid).cx_data : undefined,
			planetNaturalId.value || undefined,
			getExchangeTickerLoaded
		);
	}

	/**
	 * Finds the correct price information for given exchange preference
	 * and planet to search for. Applies whole Price Identification Logic
	 * @author jplacht
	 *
	 * @param {string} materialTicker Material Ticker e.g., "RAT"
	 * @param {PriceType} type Buying or Selling
	 * @returns {number} Price
	 */
	async function getPrice(
		materialTicker: string,
		type: PriceType
	): Promise<number> {
		return (await getPriceBook()).getPrice(materialTicker, type);
	}

	/**
	 * Applies price/cost to a MaterialIOMinimal based on passed
	 * cx information
	 * @author jplacht
	 *
	 * @param {IMaterialIOMinimal[]} data Material IO []
	 * @param {PriceType} type Buying or Selling
	 * @returns {number} Total Price of MaterialIO[]
	 */
	async function getMaterialIOTotalPrice(
		data: IMaterialIOMinimal[],
		type: PriceType
	): Promise<number> {
		return totalWithBook(await getPriceBook(), data, type);
	}

	/**
	 * Enhances a minimal Material I/O with pricing information for its delta
	 * @author jplacht
	 *
	 * @param {IMaterialIOMaterial[]} data Minimal Material I/O
	 * @returns {IMaterialIO[]} Material I/O
	 */
	async function enhanceMaterialIOMaterial(
		data: IMaterialIOMaterial[]
	): Promise<IMaterialIO[]> {
		return enhanceWithBook(await getPriceBook(), data);
	}

	/**
	 * Calculates all infrastructure buildings construction costs with a
	 * given price book, synchronously. Building data must be loaded.
	 * @author jplacht
	 *
	 * @param {IPriceBook} book Price Book
	 * @param {IPlanet} planet Planet Information
	 * @returns {IInfrastructureCosts} Infrastructure Construction Costs
	 */
	function calculateInfrastructureCostsWith(
		book: IPriceBook,
		planet: IPlanet
	): IInfrastructureCosts {
		const results: IInfrastructureCosts = {
			HB1: 0,
			HB2: 0,
			HB3: 0,
			HB4: 0,
			HB5: 0,
			HBB: 0,
			HBC: 0,
			HBM: 0,
			HBL: 0,
			STO: 0,
			STA: 0,
			STE: 0,
			STV: 0,
			STW: 0,
		};

		for (const buildingTicker of infrastructureBuildingNames) {
			const totalPrice = totalWithBook(
				book,
				getBuildingConstructionMaterials(
					getBuildingLoaded(buildingTicker),
					planet
				),
				"BUY"
			);

			results[buildingTicker] = totalPrice * -1;
		}

		return results;
	}

	/**
	 * Calculates all infrastructure buildings construction costs
	 * @author jplacht
	 *
	 * @param {IPlanet} planet Planet Information
	 * @returns {IInfrastructureCosts} Infrastructure Construction Costs
	 */
	async function calculateInfrastructureCosts(
		planet: IPlanet
	): Promise<IInfrastructureCosts> {
		await preloadBuildings();
		return calculateInfrastructureCostsWith(await getPriceBook(), planet);
	}

	return {
		getPriceBook,
		getPrice,
		getMaterialIOTotalPrice,
		getExchangeCodeKey,
		enhanceMaterialIOMaterial,
		calculateInfrastructureCosts,
		calculateInfrastructureCostsWith,
	};
}
