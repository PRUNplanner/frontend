import { describe, it, expect, beforeAll, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import {
	callDataBuildings,
	callDataExchanges,
	callDataMaterials,
	callDataMultiplePlanets,
	callDataPlanet,
	callDataRecipes,
	callDataFIOStorage,
	callDataFIOSites,
	callDataPlanetSearch,
	callDataPlanetSearchSingle,
	callExplorationData,
	callPlanetLastPOPR,
} from "@/features/api/gameData.api";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planets from "@/tests/test_data/api_data_planets.json";
import planet_single from "@/tests/test_data/api_data_planet_single.json";
import fio_sites from "@/tests/test_data/api_data_fio_sites.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import planet_search_results from "@/tests/test_data/api_data_planet_search.json";
import exploration_7d_dw from "@/tests/test_data/api_data_exploration_7d_dw.json";
import latest_popr from "@/tests/test_data/api_data_popr_latest.json";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("GameData API Calls", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("callDataMaterials", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/materials").reply(200, materials);

		expect(await callDataMaterials()).toStrictEqual(materials);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataExchanges", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/exchanges").reply(200, exchanges);

		expect(await callDataExchanges()).toStrictEqual(exchanges);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataRecipes", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/recipes").reply(200, recipes);

		expect(await callDataRecipes()).toStrictEqual(recipes);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataBuildings", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/buildings").reply(200, buildings);

		expect(await callDataBuildings()).toStrictEqual(buildings);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataPlanet", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/planet/KW-020c").reply(200, planet_single);

		expect(await callDataPlanet("KW-020c")).toStrictEqual(planet_single);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataMultiplePlanets", async () => {
		const spyApiServicePost = vi.spyOn(apiService, "post");

		mock.onPost("/data/planet/multiple").reply(200, planets);

		expect(await callDataMultiplePlanets([])).toStrictEqual(planets);
		expect(spyApiServicePost).toHaveBeenCalled();
	});

	it("callDataFIOStorage", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/fio_storage").reply(200, fio_storage);

		const result = await callDataFIOStorage();

		expect(Object.keys(result.planets)).toStrictEqual(
			Object.keys(fio_storage.planets)
		);
		expect(Object.keys(result.warehouses)).toStrictEqual(
			Object.keys(fio_storage.warehouses)
		);
		expect(Object.keys(result.ships)).toStrictEqual(
			Object.keys(fio_storage.ships)
		);
		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataFIOSites", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/fio_sites").reply(200, fio_sites);

		const result = await callDataFIOSites();

		expect(Object.keys(result.planets)).toStrictEqual(
			Object.keys(fio_sites.planets)
		);

		expect(Object.keys(result.ships)).toStrictEqual(
			Object.keys(fio_sites.ships)
		);

		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataPlanetSearchSingle", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/planets/foo").reply(200, planet_search_results);

		const result = await callDataPlanetSearchSingle("foo");

		expect(result.length).toBe(planet_search_results.length);

		expect(spyApiServiceGet).toHaveBeenCalled();
	});

	it("callDataPlanetSearch", async () => {
		const spyApiServicePost = vi.spyOn(apiService, "post");

		mock.onPost("/data/planet/search").reply(200, planet_search_results);

		const params = {
			Materials: [],
			COGC: [],
			IncludeRocky: true,
			IncludeGaseous: false,
			IncludeLowGravity: false,
			IncludeHighGravity: false,
			IncludeLowPressure: false,
			IncludeHighPressure: false,
			IncludeLowTemperature: false,
			IncludeHighTemperature: false,
			MustBeFertile: false,
			MustHaveLocalMarket: false,
			MustHaveChamberOfCommerce: false,
			MustHaveWarehouse: false,
			MustHaveAdministrationCenter: false,
			MustHaveShipyard: false,
		};

		const result = await callDataPlanetSearch(params);

		expect(result.length).toBe(planet_search_results.length);

		expect(spyApiServicePost).toHaveBeenCalled();
	});

	describe("callExplorationData", async () => {
		it("Call API 4 times and create structured result", async () => {
			mock.onPost("/data/market/AI1/DW").reply(200, exploration_7d_dw);

			const result = await callExplorationData("AI1", "DW", {
				start: "2025-01-01",
				end: "2025-01-07",
			});

			expect(result).toStrictEqual(exploration_7d_dw);
		});
	});

	it("callPlanetLastPOPR", async () => {
		const spyApiServiceGet = vi.spyOn(apiService, "get");

		mock.onGet("/data/planet/popi/OT-580b").reply(200, latest_popr);

		const result = await callPlanetLastPOPR("OT-580b");

		expect(result.FreeEngineer).toBe(latest_popr.FreeEngineer);

		expect(spyApiServiceGet).toHaveBeenCalled();
	});
});
