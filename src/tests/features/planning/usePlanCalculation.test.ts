import { nextTick, ref } from "vue";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

import {
	materialsStore,
	recipesStore,
	buildingsStore,
	exchangesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

// Composables
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";

describe("usePlanCalculation", async () => {
	let planningStore: ReturnType<typeof usePlanningStore>;

	beforeAll(async () => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		await materialsStore.setMany(materials);
		//@ts-expect-error mock data date as string
		await exchangesStore.setMany(exchanges);

		const { preload } = useMaterialData();
		const { preloadBuildings, preloadRecipes } = await useBuildingData();

		await preload();
		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();

		vi.resetAllMocks();
	});

	it("refreshkey", async () => {
		const calculation = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);

		const { refreshKey } = calculation;

		expect(refreshKey.value).toBe(0);

		// upate store
		// @ts-expect-error mock data
		planningStore.cxs = "foo";
		await nextTick();
		expect(refreshKey.value).toBe(1);
	});

	it("validate result", async () => {
		const { calculate } = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);

		const result = await calculate();

		expect(result.corphq).toBeFalsy();
		expect(result.cogc).toBe("RESOURCE_EXTRACTION");
		expect(result.workforce.pioneer.required).toBe(2170);
		expect(result.materialio.length).toBe(18);

		// area
		expect(result.area).toStrictEqual({
			areaLeft: 6,
			areaTotal: 1000,
			areaUsed: 994,
			permits: 3,
		});
	});

	it("validate overviewData", async () => {
		const calculation = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);
		const result = await calculation.calculate();

		const overviewData = await calculation.calculateOverview(
			result.materialio,
			result.production,
			result.infrastructure
		);

		expect(overviewData.dailyCost).toBe(34758.368568527185);
		expect(overviewData.roi).toBe(23.478162662559594);
	});

	it("validate visitationData", async () => {
		const { calculate, visitationData } = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);

		const result = await calculate();

		expect(visitationData.value.storageFilled).toBe(22.342256698594255);
	});

	it("validate existing and saveable", async () => {
		const calculation = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);
		const { existing, saveable } = calculation;

		expect(existing.value).toBeTruthy();
		expect(saveable.value).toBeTruthy();
	});

	it("backendData", async () => {
		const calculation = await usePlanCalculation(
			// @ts-expect-error mock data
			ref(plan_etherwind),
			ref(undefined),
			ref(undefined),
			ref(undefined)
		);
		const { backendData } = calculation;

		console.log(backendData.value);

		expect(backendData.value).toStrictEqual({
			empire_uuid: undefined,
			plan_name: "EW COF RAT DW C",
			planet_natural_id: "KW-688c",
			plan_permits_used: 3,
			plan_cogc: "RESOURCE_EXTRACTION",
			plan_corphq: false,
			plan_data: {
				buildings: [
					{
						active_recipes: [
							{
								amount: 1,
								recipeid: "EXT#SIO",
							},
						],
						amount: 1,
						name: "EXT",
					},
					{
						active_recipes: [
							{
								amount: 2,
								recipeid: "FP#10xH2O=>7xDW",
							},
							{
								amount: 1,
								recipeid: "FP#1xCAF 3xDW=>3xCOF",
							},
							{
								amount: 1,
								recipeid: "FP#1xMUS 1xVEG 1xMAI=>10xRAT",
							},
						],
						amount: 19,
						name: "FP",
					},
					{
						active_recipes: [
							{
								amount: 6,
								recipeid: "HYF#22xH2O 3xNS=>2xCAF",
							},
							{
								amount: 3,
								recipeid: "HYF#14xH2O 1xNS=>8xHCP",
							},
							{
								amount: 1,
								recipeid: "HYF#4xNS=>12xMUS",
							},
							{
								amount: 2,
								recipeid: "HYF#16xH2O 1xNS=>6xVEG",
							},
							{
								amount: 2,
								recipeid: "HYF#20xH2O 2xNS=>12xMAI",
							},
						],
						amount: 11,
						name: "HYF",
					},
					{
						active_recipes: [
							{
								amount: 1,
								recipeid: "INC#4xHCP 2xMAI=>4xC",
							},
						],
						amount: 7,
						name: "INC",
					},
					{
						active_recipes: [
							{
								amount: 1,
								recipeid: "RIG#H2O",
							},
						],
						amount: 21,
						name: "RIG",
					},
				],
				infrastructure: [
					{
						amount: 22,
						building: "HB1",
					},
					{
						amount: 3,
						building: "HB2",
					},
					{
						amount: 0,
						building: "HB3",
					},
					{
						amount: 0,
						building: "HB4",
					},
					{
						amount: 0,
						building: "HB5",
					},
					{
						amount: 0,
						building: "HBB",
					},
					{
						amount: 0,
						building: "HBC",
					},
					{
						amount: 0,
						building: "HBM",
					},
					{
						amount: 0,
						building: "HBL",
					},
					{
						amount: 1,
						building: "STO",
					},
				],
				experts: [
					{
						amount: 3,
						type: "Agriculture",
					},
					{
						amount: 0,
						type: "Chemistry",
					},
					{
						amount: 0,
						type: "Construction",
					},
					{
						amount: 0,
						type: "Electronics",
					},
					{
						amount: 2,
						type: "Food_Industries",
					},
					{
						amount: 0,
						type: "Fuel_Refining",
					},
					{
						amount: 0,
						type: "Manufacturing",
					},
					{
						amount: 0,
						type: "Metallurgy",
					},
					{
						amount: 1,
						type: "Resource_Extraction",
					},
				],

				workforce: [
					{
						lux1: true,
						lux2: true,
						type: "pioneer",
					},
					{
						lux1: true,
						lux2: true,
						type: "settler",
					},
					{
						lux1: false,
						lux2: false,
						type: "technician",
					},
					{
						lux1: false,
						lux2: false,
						type: "engineer",
					},
					{
						lux1: false,
						lux2: false,
						type: "scientist",
					},
				],
			},
		});
	});
});
