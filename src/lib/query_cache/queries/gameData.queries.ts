import config from "@/lib/config";

// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";
import { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
	planetsStore,
	recipesStore,
} from "@/database/stores";

// Util
import {
	defineQuery,
	staleMinutes,
	storeAndPreload,
} from "@/lib/query_cache/queries/queries.util";

// API Calls
import {
	callDataBuildings,
	callDataExchanges,
	callDataFIOStorage,
	callDataMaterials,
	callDataMultiplePlanets,
	callDataPlanet,
	callDataPlanetSearch,
	callDataPlanetSearchSingle,
	callDataRecipes,
	callExplorationData,
	callPlanetLastPOPR,
} from "@/features/api/gameData.api";
import { callAnalyticsPlanetInsights } from "@/features/api/analyticsData.api";

// Types & Interfaces
import {
	IFIOStorage,
	IPlanet,
	IPlanetSearchAdvanced,
	IPopulationReport,
} from "@/features/api/gameData.types";
import { IExploration } from "@/features/market_exploration/marketExploration.types";
import { AnalyticsPlanetInsightsPayloadType } from "@/features/api/schemas/analyticsData.schemas";

/**
 * A full game data list: replaces its IndexedDB store on every fetch and
 * refetches once stale.
 */
function gameDataQuery<T extends object, K extends keyof T & string>(
	name: string,
	call: () => Promise<T[]>,
	store: ReturnType<typeof useIndexedDBStore<T, K>>,
	minutes: number
) {
	return defineQuery({
		key: () => ["gamedata", name],
		fetchFn: async (): Promise<T[]> => {
			const data = await call();
			await storeAndPreload(store, data, true);
			return data;
		},
		autoRefetch: true,
		expireTime: staleMinutes(minutes),
	});
}

const planetsExpireTime = staleMinutes(config.GAME_DATA_STALE_MINUTES_PLANETS);

export const gameDataQueries = {
	GetMaterials: gameDataQuery(
		"materials",
		callDataMaterials,
		materialsStore,
		config.GAME_DATA_STALE_MINUTES_MATERIALS
	),
	GetExchanges: gameDataQuery(
		"exchanges",
		callDataExchanges,
		exchangesStore,
		config.GAME_DATA_STALE_MINUTES_EXCHANGES
	),
	GetRecipes: gameDataQuery(
		"recipes",
		callDataRecipes,
		recipesStore,
		config.GAME_DATA_STALE_MINUTES_RECIPES
	),
	GetBuildings: gameDataQuery(
		"buildings",
		callDataBuildings,
		buildingsStore,
		config.GAME_DATA_STALE_MINUTES_BUILDINGS
	),
	GetPlanet: defineQuery({
		key: (params) => ["gamedata", "planet", params.planetNaturalId],
		fetchFn: async (params: {
			planetNaturalId: string;
		}): Promise<IPlanet> => {
			const data = await callDataPlanet(params.planetNaturalId);
			await storeAndPreload(planetsStore, [data]);
			return data;
		},
		autoRefetch: true,
		expireTime: planetsExpireTime,
	}),
	GetMultiplePlanets: defineQuery({
		key: (params) => [
			"gamedata",
			"planet",
			"multiple",
			params.planetNaturalIds,
		],
		// errors must propagate: an empty result would be cached as
		// fresh and calculations would miss every planet until expiry
		fetchFn: async (params: {
			planetNaturalIds: string[];
		}): Promise<IPlanet[]> => {
			const data = await callDataMultiplePlanets(params.planetNaturalIds);
			await storeAndPreload(planetsStore, data);

			// seed each planet's own entry
			const queryStore = useQueryStore();
			data.forEach((p) =>
				queryStore.addCacheState(
					"GetPlanet",
					{ planetNaturalId: p.planet_natural_id },
					p
				)
			);

			return data;
		},
		autoRefetch: true,
		expireTime: planetsExpireTime,
	}),
	GetPlanetSearchSingle: defineQuery({
		key: (params) => ["gamedata", "planet", "search", params.searchId],
		fetchFn: async (params: { searchId: string }): Promise<IPlanet[]> => {
			const data = await callDataPlanetSearchSingle(params.searchId);
			await storeAndPreload(planetsStore, data);
			return data;
		},
		expireTime: planetsExpireTime,
	}),
	PostPlanetSearch: defineQuery({
		key: (params) => ["gamedata", "planet", "search", params.searchData],
		fetchFn: async (params: {
			searchData: IPlanetSearchAdvanced;
		}): Promise<IPlanet[]> => {
			const data = await callDataPlanetSearch(params.searchData);
			await storeAndPreload(planetsStore, data);
			return data;
		},
		expireTime: planetsExpireTime,
	}),
	GetPlanetLastPOPR: defineQuery({
		key: (params) => [
			"gamedata",
			"planet",
			"popr",
			"last",
			params.planetNaturalId,
		],
		fetchFn: (params: {
			planetNaturalId: string;
		}): Promise<IPopulationReport> =>
			callPlanetLastPOPR(params.planetNaturalId),
		expireTime: planetsExpireTime,
	}),
	GetExplorationData: defineQuery({
		key: (params) => [
			"gamedata",
			"marketexploration",
			params.exchangeTicker,
			params.materialTicker,
		],
		fetchFn: (params: {
			exchangeTicker: string;
			materialTicker: string;
		}): Promise<IExploration[]> =>
			callExplorationData(params.exchangeTicker, params.materialTicker),
		expireTime: staleMinutes(15),
	}),
	GetFIOStorage: defineQuery({
		key: () => ["gamedata", "fio", "storage"],
		fetchFn: async (): Promise<IFIOStorage> => {
			const data = await callDataFIOStorage();
			usePlanningStore().setFIOStorageData(data);
			return data;
		},
		autoRefetch: true,
		expireTime: staleMinutes(5),
	}),
	GetAnalyticsPlanetInsights: defineQuery({
		key: (params) => [
			"analytics",
			"planet_insights",
			params.planetNaturalId,
		],
		fetchFn: (params: {
			planetNaturalId: string;
		}): Promise<AnalyticsPlanetInsightsPayloadType> =>
			callAnalyticsPlanetInsights(params.planetNaturalId),
		expireTime: planetsExpireTime,
	}),
};
