// services
import { apiService } from "@/lib/apiService";

// schemas
import {
	BuildingPayloadSchema,
	ExchangePayloadSchema,
	FIOStorageSchema,
	MaterialPayloadSchema,
	PlanetMultiplePayloadSchema,
	PlanetMultipleRequestPayloadSchema,
	PlanetSchema,
	PlanetSearchAdvancedPayloadSchema,
	PlanetSearchIndexSchema,
	PopulationReportSchema,
	RecipePayloadSchema,
} from "@/features/api/schemas/gameData.schemas";

// types
import type {
	Material,
	Exchange,
	Recipe,
	Building,
	Planet,
	FIOStorage,
	PlanetSearchAdvancedPayload,
	PlanetSearchIndexEntry,
	PopulationReport,
} from "@/features/api/schemas/gameData.schemas";
import {
	ExplorationPayloadSchema,
	type Exploration,
} from "@/features/market_exploration/marketExploration.schemas";

/**
 * Calls the /data/materials API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Material[]>} List of Materials
 */
export async function callDataMaterials(): Promise<Material[]> {
	return apiService.get("/data/materials/", MaterialPayloadSchema);
}

/**
 * Calls the /data/exchanges API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Exchange[]>} List of Exchange Data
 */
export async function callDataExchanges(): Promise<Exchange[]> {
	return apiService.get("/data/exchanges/", ExchangePayloadSchema);
}

/**
 * Calls the /data/recipes API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Recipe[]>} List of Recipes
 */
export async function callDataRecipes(): Promise<Recipe[]> {
	return apiService.get("/data/recipes/", RecipePayloadSchema);
}

/**
 * Calls the /data/buildings API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<Building[]>} List of Buildings
 */
export async function callDataBuildings(): Promise<Building[]> {
	return apiService.get("/data/buildings/", BuildingPayloadSchema);
}

/**
 * Calls the /data/planet API endpoint to fetch a single
 * planets data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planetNaturalId Planet Natural Id ('OT-580b')
 * @returns {Promise<Planet>} Planet Data
 */
export async function callDataPlanet(planetNaturalId: string): Promise<Planet> {
	return apiService.get(`/data/planet/${planetNaturalId}/`, PlanetSchema);
}

/**
 * Calls the /data/planet/multiple API endpoint to fetch
 * multiple planets and their data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string[]} planetNaturalIds List of Planet Natural Ids (['OT-580b', 'ZV-759c'])
 * @returns {Promise<Planet[]>} List of Planets Data
 */
export async function callDataMultiplePlanets(
	planetNaturalIds: string[]
): Promise<Planet[]> {
	return apiService.post(
		"/data/planets/multiple/",
		planetNaturalIds,
		PlanetMultipleRequestPayloadSchema,
		PlanetMultiplePayloadSchema
	);
}

/**
 * Calls the /data/fio_storage endpoint to fetch users
 * FIO Storage data
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<FIOStorage>}
 */
export async function callDataFIOStorage(): Promise<FIOStorage> {
	return apiService.get("/data/storage/", FIOStorageSchema);
}

/**
 * Calls /data/planets/{searchId} to execute a basic planet search
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} searchId Planet Natural Id or Name Part
 * @returns {Promise<Planet[]>} Search Results
 */
export async function callDataPlanetSearchSingle(
	searchId: string
): Promise<Planet[]> {
	return apiService.get(
		`/data/planets/${searchId}/`,
		PlanetMultiplePayloadSchema
	);
}

/**
 * Fetches the slim planet index the planet search filters client-side
 * @author jplacht
 *
 * @returns {Promise<PlanetSearchIndexEntry[]>} Every planet
 */
export async function callDataPlanetSearchIndex(): Promise<
	PlanetSearchIndexEntry[]
> {
	return apiService.get(
		"/data/planets/search-index/",
		PlanetSearchIndexSchema
	);
}

/**
 * Executes a planet search request with set of parameters
 * @author jplacht
 *
 * @export
 * @async
 * @param {PlanetSearchAdvancedPayload} searchData Search Parameter
 * @returns {Promise<Planet[]>} Search Results
 */
export async function callDataPlanetSearch(
	searchData: PlanetSearchAdvancedPayload
): Promise<Planet[]> {
	return apiService.post(
		"/data/planets/search/",
		searchData,
		PlanetSearchAdvancedPayloadSchema,
		PlanetMultiplePayloadSchema
	);
}

/**
 * Calls the market exploration endpoint to fetch data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} exchange Exchange Code
 * @param {string} ticker Material Ticker
 * @returns {Promise<Exploration[]>} Exploration data
 */
export async function callExplorationData(
	exchange: string,
	ticker: string
): Promise<Exploration[]> {
	return apiService.get(
		`/data/cxpc/${ticker}/${exchange}/`,
		ExplorationPayloadSchema
	);
}

/**
 * Calls the population report endpoint and fetches the latest available report
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planetNaturalId Planet Natural Id
 * @returns {Promise<PopulationReport>} Population Report Data
 */
export async function callPlanetLastPOPR(
	planetNaturalId: string
): Promise<PopulationReport> {
	return apiService.get(
		`/data/planet/${planetNaturalId}/popr/`,
		PopulationReportSchema
	);
}
