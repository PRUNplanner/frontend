// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useDB } from "@/database/composables/useDB";
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
	recipesStore,
} from "@/database/stores";

// Composables
import { usePlanetData } from "@/database/services/usePlanetData";
import { useExchangeData } from "@/database/services/useExchangeData";

// Engine
import { createPriceBook, IPriceBook } from "@/features/cx/priceBook";
import { groupRecipesByBuilding } from "@/features/planning/engine/buildings";

// Types & Interfaces
import {
	IGameData,
	IPlanContext,
} from "@/features/planning/engine/engine.types";

/**
 * Builds the planning engine's context from the data layer: game data as
 * plain maps, the plan's planet and a price book for its CX and planet.
 * Batch callers load game data once and create one context per plan.
 */
export function usePlanContext() {
	const planningStore = usePlanningStore();
	const { getPlanet } = usePlanetData();
	const { getExchangeTickerLoaded } = useExchangeData();

	const buildingsDB = useDB(buildingsStore);
	const recipesDB = useDB(recipesStore);
	const materialsDB = useDB(materialsStore);
	const exchangesDB = useDB(exchangesStore);

	/**
	 * Game data as plain maps. Preloads first, which is a no-op once the
	 * game data loaders have run (see docs/data-layer.md).
	 *
	 * @returns {Promise<IGameData>} Game data
	 */
	async function loadGameData(): Promise<IGameData> {
		await Promise.all([
			buildingsDB.preload(),
			recipesDB.preload(),
			materialsDB.preload(),
			exchangesDB.preload(),
		]);

		return {
			buildings: buildingsDB.cacheData,
			recipesByBuilding: groupRecipesByBuilding(
				recipesDB.cacheData.values()
			),
			materials: materialsDB.cacheData,
		};
	}

	/**
	 * A price book for a planet and CX, reading exchange data synchronously
	 *
	 * @param {string} planetNaturalId Planet
	 * @param {string | undefined} cxUuid CX, undefined for Universe prices
	 * @returns {IPriceBook} Price Book
	 */
	function createPrices(
		planetNaturalId: string,
		cxUuid: string | undefined
	): IPriceBook {
		return createPriceBook(
			cxUuid ? () => planningStore.getCX(cxUuid).cx_data : undefined,
			planetNaturalId || undefined,
			getExchangeTickerLoaded
		);
	}

	/**
	 * The full context for one plan: game data, planet and price book
	 *
	 * @param {IGameData} gameData Game data from loadGameData()
	 * @param {string} planetNaturalId Plan's planet
	 * @param {string | undefined} cxUuid CX, undefined for Universe prices
	 * @returns {Promise<IPlanContext>} Plan context
	 */
	async function createContext(
		gameData: IGameData,
		planetNaturalId: string,
		cxUuid: string | undefined
	): Promise<IPlanContext> {
		return {
			...gameData,
			planet: await getPlanet(planetNaturalId),
			prices: createPrices(planetNaturalId, cxUuid),
		};
	}

	return { loadGameData, createPrices, createContext };
}
