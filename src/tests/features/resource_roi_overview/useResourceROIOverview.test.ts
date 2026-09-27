import { ref, type Ref } from "vue";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";
import axiosSetup from "@/util/axiosSetup";
import { flushPromises } from "@vue/test-utils";

// Services
import { apiService } from "@/lib/apiService";

// Composables
import { useResourceROIOverview } from "@/features/resource_roi_overview/useResourceROIOverview";

// stores
import {
	materialsStore,
	recipesStore,
	buildingsStore,
	exchangesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import planet_search_results from "@/tests/test_data/api_data_planet_search.json";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

// record every plan calculation the resource ROI overview creates
const planCalculations = vi.hoisted(() => [] as { refreshKey: Ref<number> }[]);

vi.mock("@/features/planning/usePlanCalculation", async () => {
	const actual: any = await vi.importActual(
		"@/features/planning/usePlanCalculation"
	);

	return {
		...actual,
		usePlanCalculation: (...args: unknown[]) => {
			const calculation = actual.usePlanCalculation(...args);
			planCalculations.push(calculation);
			return calculation;
		},
	};
});

describe("useResourceROIOverview", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());
		axiosSetup();

		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data
		await exchangesStore.setMany(exchanges);

		const { preload } = useMaterialData();
		const { preloadBuildings, preloadRecipes } = useBuildingData();

		await preload();
		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("searchPlanets", async () => {
		mock.onPost("/data/planets/search/").reply(200, planet_search_results);

		const { searchPlanets } = useResourceROIOverview(ref(undefined));

		const result = await searchPlanets("N");

		expect(result.length).toBe(65);
	});

	it("searchPlanets: resets the searching state on failure", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		mock.resetHandlers();
		mock.onPost("/data/planets/search/").networkErrorOnce();

		const { searchPlanets, progressSearchingPlanets } =
			useResourceROIOverview(ref(undefined));

		await expect(searchPlanets("FEO")).rejects.toThrow();
		expect(progressSearchingPlanets.value).toBe(false);
		error.mockRestore();
	});

	it("calculate", async () => {
		mock.onPost("/data/planets/search/").reply(200, [planet_etherwind]);

		const { calculate } = useResourceROIOverview(ref(undefined));

		const result = await calculate("H2O");

		expect(result.length).toBe(1);
		expect(result[0].buildingTicker).toBe("RIG");
		expect(result[0].dailyYield).toBe(2359.3500937521458);
		expect(result[0].dailyProfit).toBe(88631.84364589654);
		expect(result[0].planetSurface.length).toBe(1);
	});

	it("calculates through the engine, no live plan calculations", async () => {
		mock.onPost("/data/planets/search/").reply(200, [planet_etherwind]);
		planCalculations.length = 0;

		const { calculate } = useResourceROIOverview(ref(undefined));

		expect((await calculate("H2O")).length).toBe(1);
		expect(planCalculations.length).toBe(0);
	});

	describe("getPlanetEnvironment", async () => {
		it("surface", async () => {
			const { getPlanetEnvironment } = useResourceROIOverview(
				ref(undefined)
			);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ surface: true }).surface
			).toStrictEqual(["MCG"]);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ surface: false }).surface
			).toStrictEqual(["AEF"]);
		});

		it("gravity", async () => {
			const { getPlanetEnvironment } = useResourceROIOverview(
				ref(undefined)
			);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ gravity: 0.24 }).gravity
			).toStrictEqual(["MGC"]);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ gravity: 2.51 }).gravity
			).toStrictEqual(["BL"]);
		});

		it("pressure", async () => {
			const { getPlanetEnvironment } = useResourceROIOverview(
				ref(undefined)
			);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ pressure: 0.24 }).pressure
			).toStrictEqual(["SEA"]);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ pressure: 2.01 }).pressure
			).toStrictEqual(["HSE"]);
		});

		it("pressure", async () => {
			const { getPlanetEnvironment } = useResourceROIOverview(
				ref(undefined)
			);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ temperature: -25.1 }).temperature
			).toStrictEqual(["INS"]);
			expect(
				// @ts-expect-error mock data
				getPlanetEnvironment({ temperature: 75.1 }).temperature
			).toStrictEqual(["TSH"]);
		});
	});
});
