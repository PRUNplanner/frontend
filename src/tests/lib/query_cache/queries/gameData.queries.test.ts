import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { gameDataQueries } from "@/lib/query_cache/queries/gameData.queries";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";
import { storeAndPreload } from "@/lib/query_cache/queries/queries.util";
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
	planetsStore,
	recipesStore,
} from "@/database/stores";
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
	callPlanetLastPOPR,
} from "@/features/api/gameData.api";
import { callAnalyticsPlanetInsights } from "@/features/api/analyticsData.api";
import type {
	FIOStorage,
	Planet,
	PlanetSearchAdvancedPayload,
} from "@/features/api/schemas/gameData.schemas";

import fioStorageData from "@/tests/test_data/api_data_fio_storage.json";

vi.mock("@/features/api/gameData.api", () => ({
	callCXSparklines: vi.fn(),
	callDataBuildings: vi.fn(),
	callDataExchanges: vi.fn(),
	callDataFIOStorage: vi.fn(),
	callDataMaterials: vi.fn(),
	callDataMultiplePlanets: vi.fn(),
	callDataPlanet: vi.fn(),
	callDataPlanetSearch: vi.fn(),
	callDataPlanetSearchIndex: vi.fn(),
	callDataPlanetSearchSingle: vi.fn(),
	callDataRecipes: vi.fn(),
	callExplorationData: vi.fn(),
	callPlanetLastPOPR: vi.fn(),
}));
vi.mock("@/features/api/analyticsData.api", () => ({
	callAnalyticsPlanetInsights: vi.fn(),
}));
vi.mock("@/lib/query_cache/queries/queries.util", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/lib/query_cache/queries/queries.util")
	>()),
	storeAndPreload: vi.fn(async () => {}),
}));

const planet = (id: string) => ({ planet_natural_id: id }) as Planet;

describe("gameDataQueries", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe("game data lists", () => {
		it.each([
			["GetMaterials", "materials", callDataMaterials, materialsStore],
			["GetExchanges", "exchanges", callDataExchanges, exchangesStore],
			["GetRecipes", "recipes", callDataRecipes, recipesStore],
			["GetBuildings", "buildings", callDataBuildings, buildingsStore],
		] as const)(
			"%s replaces its store with the fetched rows",
			async (name, key, call, store) => {
				const rows = [{ id: 1 }, { id: 2 }];
				vi.mocked(call as () => Promise<unknown[]>).mockResolvedValue(
					rows
				);
				const query = gameDataQueries[name];

				expect(query.key()).toStrictEqual(["gamedata", key]);
				expect(query.autoRefetch).toBe(true);
				expect(await query.fetchFn()).toBe(rows);
				expect(storeAndPreload).toHaveBeenCalledWith(store, rows, true);
			}
		);
	});

	describe("planets", () => {
		it("GetPlanet stores the planet and keeps it for its natural id", async () => {
			const data = planet("OT-580b");
			vi.mocked(callDataPlanet).mockResolvedValue(data);
			const params = { planetNaturalId: "OT-580b" };

			expect(gameDataQueries.GetPlanet.key(params)).toStrictEqual([
				"gamedata",
				"planet",
				"OT-580b",
			]);
			expect(await gameDataQueries.GetPlanet.fetchFn(params)).toBe(data);
			expect(callDataPlanet).toHaveBeenCalledWith("OT-580b");
			expect(storeAndPreload).toHaveBeenCalledWith(planetsStore, [data]);
		});

		it("GetMultiplePlanets seeds the cache entry of each planet", async () => {
			const data = [planet("A"), planet("B")];
			vi.mocked(callDataMultiplePlanets).mockResolvedValue(data);
			const addCacheState = vi
				.spyOn(useQueryStore(), "addCacheState")
				.mockImplementation(() => {});
			const params = { planetNaturalIds: ["A", "B"] };

			expect(
				gameDataQueries.GetMultiplePlanets.key(params)
			).toStrictEqual(["gamedata", "planet", "multiple", ["A", "B"]]);
			expect(
				await gameDataQueries.GetMultiplePlanets.fetchFn(params)
			).toBe(data);

			expect(storeAndPreload).toHaveBeenCalledWith(planetsStore, data);
			expect(addCacheState.mock.calls).toStrictEqual([
				["GetPlanet", { planetNaturalId: "A" }, data[0]],
				["GetPlanet", { planetNaturalId: "B" }, data[1]],
			]);
		});

		it("GetMultiplePlanets lets a failed request fail", async () => {
			vi.mocked(callDataMultiplePlanets).mockRejectedValue(
				new Error("500")
			);

			await expect(
				gameDataQueries.GetMultiplePlanets.fetchFn({
					planetNaturalIds: ["A"],
				})
			).rejects.toThrow("500");
			expect(storeAndPreload).not.toHaveBeenCalled();
		});

		it("GetPlanetSearchSingle stores the found planets", async () => {
			const data = [planet("A")];
			vi.mocked(callDataPlanetSearchSingle).mockResolvedValue(data);
			const params = { searchId: "saved-search" };

			expect(
				gameDataQueries.GetPlanetSearchSingle.key(params)
			).toStrictEqual(["gamedata", "planet", "search", "saved-search"]);
			expect(
				await gameDataQueries.GetPlanetSearchSingle.fetchFn(params)
			).toBe(data);
			expect(callDataPlanetSearchSingle).toHaveBeenCalledWith(
				"saved-search"
			);
			expect(storeAndPreload).toHaveBeenCalledWith(planetsStore, data);
		});

		it("PostPlanetSearch stores the found planets", async () => {
			const data = [planet("A")];
			vi.mocked(callDataPlanetSearch).mockResolvedValue(data);
			const searchData = {
				materials: ["H2O"],
			} as unknown as PlanetSearchAdvancedPayload;

			expect(
				gameDataQueries.PostPlanetSearch.key({ searchData })
			).toStrictEqual(["gamedata", "planet", "search", searchData]);
			expect(
				await gameDataQueries.PostPlanetSearch.fetchFn({ searchData })
			).toBe(data);
			expect(callDataPlanetSearch).toHaveBeenCalledWith(searchData);
			expect(storeAndPreload).toHaveBeenCalledWith(planetsStore, data);
		});

		it("GetPlanetSearchIndex does not touch the planets store", async () => {
			const index = [{ id: "A" }];
			vi.mocked(callDataPlanetSearchIndex).mockResolvedValue(
				index as never
			);

			expect(gameDataQueries.GetPlanetSearchIndex.key()).toStrictEqual([
				"gamedata",
				"planet",
				"search-index",
			]);
			expect(await gameDataQueries.GetPlanetSearchIndex.fetchFn()).toBe(
				index
			);
			expect(storeAndPreload).not.toHaveBeenCalled();
		});
	});

	describe("reports and market data", () => {
		it("GetPlanetLastPOPR keys the report by planet", async () => {
			const report = { id: 1 };
			vi.mocked(callPlanetLastPOPR).mockResolvedValue(report as never);
			const params = { planetNaturalId: "OT-580b" };

			expect(gameDataQueries.GetPlanetLastPOPR.key(params)).toStrictEqual(
				["gamedata", "planet", "popr", "last", "OT-580b"]
			);
			expect(
				await gameDataQueries.GetPlanetLastPOPR.fetchFn(params)
			).toBe(report);
			expect(callPlanetLastPOPR).toHaveBeenCalledWith("OT-580b");
		});

		it("GetExplorationData keys by exchange and material", async () => {
			const data = [{ day: 1 }];
			vi.mocked(callExplorationData).mockResolvedValue(data as never);
			const params = { exchangeTicker: "NC1", materialTicker: "RAT" };

			expect(
				gameDataQueries.GetExplorationData.key(params)
			).toStrictEqual(["gamedata", "marketexploration", "NC1", "RAT"]);
			expect(
				await gameDataQueries.GetExplorationData.fetchFn(params)
			).toBe(data);
			expect(callExplorationData).toHaveBeenCalledWith("NC1", "RAT");
		});

		it("GetCXSparklines keys the sparklines by exchange", async () => {
			const data = { RAT: [1, 2] };
			vi.mocked(callCXSparklines).mockResolvedValue(data as never);
			const params = { exchange: "NC1" };

			expect(gameDataQueries.GetCXSparklines.key(params)).toStrictEqual([
				"gamedata",
				"cxsparklines",
				"NC1",
			]);
			expect(await gameDataQueries.GetCXSparklines.fetchFn(params)).toBe(
				data
			);
			expect(callCXSparklines).toHaveBeenCalledWith("NC1");
		});

		it("GetAnalyticsPlanetInsights keys the insights by planet", async () => {
			const data = { planet: "OT-580b" };
			vi.mocked(callAnalyticsPlanetInsights).mockResolvedValue(
				data as never
			);
			const params = { planetNaturalId: "OT-580b" };

			expect(
				gameDataQueries.GetAnalyticsPlanetInsights.key(params)
			).toStrictEqual(["analytics", "planet_insights", "OT-580b"]);
			expect(
				await gameDataQueries.GetAnalyticsPlanetInsights.fetchFn(params)
			).toBe(data);
			expect(callAnalyticsPlanetInsights).toHaveBeenCalledWith("OT-580b");
		});
	});

	describe("GetFIOStorage", () => {
		it("hands the storage to the planning store", async () => {
			const data = structuredClone(
				fioStorageData
			) as unknown as FIOStorage;
			vi.mocked(callDataFIOStorage).mockResolvedValue(data);
			const planningStore = usePlanningStore();

			expect(gameDataQueries.GetFIOStorage.key()).toStrictEqual([
				"gamedata",
				"fio",
				"storage",
			]);
			expect(await gameDataQueries.GetFIOStorage.fetchFn()).toBe(data);

			expect(planningStore.fio_storage_timestamp).toBe(
				data.last_modified
			);
			expect(planningStore.fio_storage_planets).toStrictEqual(
				data.storage_data.planets
			);
		});
	});
});
