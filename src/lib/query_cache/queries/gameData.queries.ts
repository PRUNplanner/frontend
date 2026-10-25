import config from "@/lib/config";

// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";
import type { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";
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
	measured,
	persistGameData,
	readGameData,
	storeAndPreload,
	whenIdle,
} from "@/lib/query_cache/queries/queries.util";
import { useDB } from "@/database/composables/useDB";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// API Calls
import {
	callCXSparklines,
	callDataBuildings,
	callDataExchanges,
	callDataFIOStorage,
	callDataMaterials,
	callDataMultiplePlanets,
	callDataPlanet,
	callDataPlanetSearch,
	callDataPlanetSearchIndex,
	callDataPlanetSearchSingle,
	callDataRecipes,
	callExplorationData,
	callMarketSummary,
	callPlanetLastPOPR,
} from "@/features/api/gameData.api";
import { callAnalyticsPlanetInsights } from "@/features/api/analyticsData.api";
import {
	MarketSummarySchema,
	type MarketSummary,
} from "@/features/api/schemas/marketSummary.schemas";

// Types & Interfaces
import type {
	CXSparklineMetric,
	CXSparklines,
	Exchange,
	FIOStorage,
	Planet,
	PlanetSearchAdvancedPayload,
	PlanetSearchIndexEntry,
	PopulationReport,
} from "@/features/api/schemas/gameData.schemas";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
import type { AnalyticsPlanetInsightsPayload } from "@/features/api/schemas/analyticsData.schemas";
import type { IGameDataLoadProperties } from "@/lib/analytics/useAnalytics.types";

/**
 * A full game data list. A tab's first read renders from the IndexedDB copy
 * when it is at most `maxAgeMinutes` old (the query store refetches it in
 * the background once stale), else it waits for the API. A fetch fills the
 * in-memory layer and returns; the IndexedDB write runs in the background.
 * The tab's first load is reported once as `perf:gamedata_load`.
 */
function gameDataQuery<T extends object, K extends keyof T & string>(
	name: IGameDataLoadProperties["store"],
	call: () => Promise<T[]>,
	store: ReturnType<typeof useIndexedDBStore<T, K>>,
	minutes: number,
	maxAgeMinutes: number
) {
	const expireTime = staleMinutes(minutes);
	// the tab's first load, filled in by its phases; null once sent
	let report: (Partial<IGameDataLoadProperties> & { start?: number }) | null =
		{};

	function send() {
		if (!report) return;
		const { start: _start, ...props } = report;
		report = null;
		trackEvent("perf:gamedata_load", {
			store: name,
			source: "network",
			is_stale: false,
			age_min: null,
			ms_total: 0,
			...props,
		});
	}

	return defineQuery({
		key: () => ["gamedata", name],
		initialData: async () => {
			if (report) report.start ??= performance.now();
			const [cached, ms] = await measured(`gamedata:${name}:idb-read`, () =>
				readGameData(store, staleMinutes(maxAgeMinutes))
			);
			const age =
				cached.fetchedAt === null ? null : Date.now() - cached.fetchedAt;
			const stale = age !== null && age > expireTime;
			if (report)
				Object.assign(report, {
					ms_idb_read: ms,
					age_min: age === null ? null : Math.round(age / 60_000),
					is_stale: stale,
				});
			if (!cached.data) return null;

			if (report) {
				report.source = "cache";
				report.ms_total = Math.round(performance.now() - report.start!);
				// a stale copy: sent after its background refresh
				if (!stale) send();
			}
			return { data: cached.data, fetchedAt: cached.fetchedAt! };
		},
		fetchFn: async (): Promise<T[]> => {
			if (report) report.start ??= performance.now();
			const [data, msFetch] = await measured(
				`gamedata:${name}:fetch`,
				call
			);
			const fetchedAt = Date.now();
			await measured(`gamedata:${name}:fill`, async () =>
				useDB(store).fill(data, true)
			);

			if (report) {
				report.ms_fetch = msFetch;
				report.ms_total ??= Math.round(performance.now() - report.start!);
			}
			// cloning thousands of rows into IndexedDB costs main thread
			// time: start it once the page has rendered
			whenIdle(
				() =>
					measured(`gamedata:${name}:idb-write`, () =>
						persistGameData(store, data, fetchedAt)
					).then(([, ms]) => {
						if (report) report.ms_idb_write = ms;
						send();
					}),
				config.GAME_DATA_WRITE_DELAY_MS
			);

			return data;
		},
		autoRefetch: true,
		expireTime,
	});
}

const MARKET_SUMMARY_KEY = "prunplanner_market_summary";

/**
 * The market summary this browser stored last, null without a valid one
 *
 * @returns {MarketSummary | null} Stored copy
 */
function readMarketSummary(): MarketSummary | null {
	try {
		const parsed = MarketSummarySchema.safeParse(
			JSON.parse(localStorage.getItem(MARKET_SUMMARY_KEY) ?? "null")
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

function writeMarketSummary(data: MarketSummary): void {
	try {
		localStorage.setItem(MARKET_SUMMARY_KEY, JSON.stringify(data));
	} catch {
		// storage full or blocked: the next visit fetches it
	}
}

const planetsExpireTime = staleMinutes(config.GAME_DATA_STALE_MINUTES_PLANETS);

export const gameDataQueries = {
	GetMaterials: gameDataQuery(
		"materials",
		callDataMaterials,
		materialsStore,
		config.GAME_DATA_STALE_MINUTES_MATERIALS,
		config.GAME_DATA_MAX_AGE_MINUTES_MATERIALS
	),
	GetExchanges: gameDataQuery(
		"exchanges",
		callDataExchanges,
		exchangesStore,
		config.GAME_DATA_STALE_MINUTES_EXCHANGES,
		config.GAME_DATA_MAX_AGE_MINUTES_EXCHANGES
	),
	GetRecipes: gameDataQuery(
		"recipes",
		callDataRecipes,
		recipesStore,
		config.GAME_DATA_STALE_MINUTES_RECIPES,
		config.GAME_DATA_MAX_AGE_MINUTES_RECIPES
	),
	GetBuildings: gameDataQuery(
		"buildings",
		callDataBuildings,
		buildingsStore,
		config.GAME_DATA_STALE_MINUTES_BUILDINGS,
		config.GAME_DATA_MAX_AGE_MINUTES_BUILDINGS
	),
	GetPlanet: defineQuery({
		key: (params) => ["gamedata", "planet", params.planetNaturalId],
		fetchFn: async (params: {
			planetNaturalId: string;
		}): Promise<Planet> => {
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
		}): Promise<Planet[]> => {
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
		fetchFn: async (params: { searchId: string }): Promise<Planet[]> => {
			const data = await callDataPlanetSearchSingle(params.searchId);
			await storeAndPreload(planetsStore, data);
			return data;
		},
		expireTime: planetsExpireTime,
	}),
	PostPlanetSearch: defineQuery({
		key: (params) => ["gamedata", "planet", "search", params.searchData],
		fetchFn: async (params: {
			searchData: PlanetSearchAdvancedPayload;
		}): Promise<Planet[]> => {
			const data = await callDataPlanetSearch(params.searchData);
			await storeAndPreload(planetsStore, data);
			return data;
		},
		expireTime: planetsExpireTime,
	}),
	// a different shape than Planet, so not written into planetsStore
	GetPlanetSearchIndex: defineQuery({
		key: () => ["gamedata", "planet", "search-index"],
		fetchFn: (): Promise<PlanetSearchIndexEntry[]> =>
			callDataPlanetSearchIndex(),
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
		// a planet without a report yet is a 404: empty, not an error
		fetchFn: (params: {
			planetNaturalId: string;
		}): Promise<PopulationReport | null> =>
			callPlanetLastPOPR(params.planetNaturalId).catch(
				(err: { status?: number }) => {
					if (err.status === 404) return null;
					throw err;
				}
			),
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
		}): Promise<Exploration[]> =>
			callExplorationData(params.exchangeTicker, params.materialTicker),
		expireTime: staleMinutes(15),
	}),
	GetCXSparklines: defineQuery({
		key: (params) => [
			"gamedata",
			"cxsparklines",
			params.exchange,
			...(params.metric
				? [params.days ?? 30, params.metric, params.tickers ?? []]
				: []),
		],
		fetchFn: (params: {
			exchange: string;
			days?: number;
			metric?: CXSparklineMetric;
			tickers?: string[];
		}): Promise<CXSparklines> =>
			callCXSparklines(
				params.exchange,
				params.days,
				params.metric,
				params.tickers
			),
		expireTime: staleMinutes(15),
	}),
	GetMarketSummary: defineQuery({
		key: () => ["gamedata", "market", "summary"],
		// the last summary seen in this browser paints at once; counted as
		// expired, so every visit refreshes it in the background
		initialData: async () => {
			const data = readMarketSummary();
			return data && { data, fetchedAt: 0 };
		},
		fetchFn: async (): Promise<MarketSummary> => {
			const data = await callMarketSummary();
			writeMarketSummary(data);
			return data;
		},
		expireTime: staleMinutes(30),
	}),
	// order books for the market report, without the game data store
	GetMarketExchanges: defineQuery({
		key: () => ["gamedata", "market", "exchanges"],
		fetchFn: (): Promise<Exchange[]> => callDataExchanges(),
		expireTime: staleMinutes(15),
	}),
	GetFIOStorage: defineQuery({
		key: () => ["gamedata", "fio", "storage"],
		fetchFn: async (): Promise<FIOStorage> => {
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
		}): Promise<AnalyticsPlanetInsightsPayload> =>
			callAnalyticsPlanetInsights(params.planetNaturalId),
		expireTime: planetsExpireTime,
	}),
};
