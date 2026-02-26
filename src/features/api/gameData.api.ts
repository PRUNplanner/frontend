// services
import { apiService } from "@/lib/apiService";

// schemas
import {
	BuildingPayloadSchema,
	BuildingPayloadType,
	ExchangePayloadSchema,
	ExchangePayloadType,
	FIOStoragePayloadType,
	FIOStorageSchema,
	MaterialPayloadSchema,
	MaterialPayloadType,
	PlanetMultiplePayload,
	PlanetMultiplePayloadType,
	PlanetMultipleRequestPayload,
	PlanetMultipleRequestType,
	PlanetPayloadType,
	PlanetSchema,
	PlanetSearchAdvancedPayloadSchema,
	PlanetSearchAdvancedPayloadType,
	PopulationReportPayloadSchema,
	PopulationReportPayloadType,
	RecipePayloadSchema,
	RecipePayloadType,
} from "@/features/api/schemas/gameData.schemas";

// types
import {
	IMaterial,
	IExchange,
	IRecipe,
	IBuilding,
	IPlanet,
	IFIOStorage,
	IPlanetSearchAdvanced,
	IPopulationReport,
} from "@/features/api/gameData.types";
import { IExploration } from "@/features/market_exploration/marketExploration.types";
import {
	ExplorationPayloadSchema,
	ExplorationPayloadType,
} from "@/features/market_exploration/marketExploration.schemas";

/**
 * Calls the /data/materials API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IMaterial[]>} List of Materials
 */
export async function callDataMaterials(): Promise<IMaterial[]> {
	return apiService.get<MaterialPayloadType>(
		"/data/materials/",
		MaterialPayloadSchema
	);
}

/**
 * Calls the /data/exchanges API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IExchange[]>} List of Exchange Data
 */
export async function callDataExchanges(): Promise<IExchange[]> {
	return apiService.get<ExchangePayloadType>(
		"/data/exchanges/",
		ExchangePayloadSchema
	);
}

/**
 * Calls the /data/recipes API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IRecipe[]>} List of Recipes
 */
export async function callDataRecipes(): Promise<IRecipe[]> {
	return apiService.get<RecipePayloadType>(
		"/data/recipes/",
		RecipePayloadSchema
	);
}

/**
 * Calls the /data/buildings API endpoint
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IBuilding[]>} List of Buildings
 */
export async function callDataBuildings(): Promise<IBuilding[]> {
	return apiService.get<BuildingPayloadType>(
		"/data/buildings/",
		BuildingPayloadSchema
	);
}

/**
 * Calls the /data/planet API endpoint to fetch a single
 * planets data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} planetNaturalId Planet Natural Id ('OT-580b')
 * @returns {Promise<IPlanet>} Planet Data
 */
export async function callDataPlanet(
	planetNaturalId: string
): Promise<IPlanet> {
	return apiService.get<PlanetPayloadType>(
		`/data/planet/${planetNaturalId}`,
		PlanetSchema
	);
}

/**
 * Calls the /data/planet/multiple API endpoint to fetch
 * multiple planets and their data
 * @author jplacht
 *
 * @export
 * @async
 * @param {string[]} planetNaturalIds List of Planet Natural Ids (['OT-580b', 'ZV-759c'])
 * @returns {Promise<IPlanet[]>} List of Planets Data
 */
export async function callDataMultiplePlanets(
	planetNaturalIds: string[]
): Promise<IPlanet[]> {
	return apiService.post<
		PlanetMultipleRequestType,
		PlanetMultiplePayloadType
	>(
		"/data/planets/multiple",
		planetNaturalIds,
		PlanetMultipleRequestPayload,
		PlanetMultiplePayload
	);
}

/**
 * Calls the /data/fio_storage endpoint to fetch users
 * FIO Storage data
 * @author jplacht
 *
 * @export
 * @async
 * @returns {Promise<IFIOStorage>}
 */
export async function callDataFIOStorage(): Promise<IFIOStorage> {
	return apiService.get<FIOStoragePayloadType>(
		"/data/storage/",
		FIOStorageSchema
	);
}

/**
 * Calls /data/planets/{searchId} to execute a basic planet search
 * @author jplacht
 *
 * @export
 * @async
 * @param {string} searchId Planet Natural Id or Name Part
 * @returns {Promise<IPlanet[]>} Search Results
 */
export async function callDataPlanetSearchSingle(
	searchId: string
): Promise<IPlanet[]> {
	return apiService.get<PlanetMultiplePayloadType>(
		`/data/planets/${searchId}`,
		PlanetMultiplePayload
	);
}

/**
 * Executes a planet search request with set of parameters
 * @author jplacht
 *
 * @export
 * @async
 * @param {IPlanetSearchAdvanced} searchData Search Parameter
 * @returns {Promise<IPlanet[]>} Search Results
 */
export async function callDataPlanetSearch(
	searchData: IPlanetSearchAdvanced
): Promise<IPlanet[]> {
	return apiService.post<
		PlanetSearchAdvancedPayloadType,
		PlanetMultiplePayloadType
	>(
		"/data/planets/search/",
		searchData,
		PlanetSearchAdvancedPayloadSchema,
		PlanetMultiplePayload
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
 * @param {IExplorationRequestPayload} payload Payload with start and end date
 * @returns {Promise<IExploration[]>} Exploration data
 */
export async function callExplorationData(
	exchange: string,
	ticker: string
): Promise<IExploration[]> {
	return apiService.get<ExplorationPayloadType>(
		`/data/cxpc/${ticker}/${exchange}`,
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
 * @returns {Promise<IPopulationReport>} Population Report Data
 */
export async function callPlanetLastPOPR(
	planetNaturalId: string
): Promise<IPopulationReport> {
	return apiService.get<PopulationReportPayloadType>(
		`/data/planet/${planetNaturalId}/popr`,
		PopulationReportPayloadSchema
	);
}
