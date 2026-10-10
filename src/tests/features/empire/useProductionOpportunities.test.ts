import { flushPromises } from "@vue/test-utils";
import { beforeAll, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
	buildingsStore,
	exchangesStore,
	recipesStore,
} from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useExchangeData } from "@/database/services/useExchangeData";

import { useProductionOpportunities } from "@/features/empire/useProductionOpportunities";

// test data
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import { ref } from "vue";
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";

const fakeIEmpireMaterialIO: IEmpireMaterialIO[] = [
	{
		ticker: "C",
		input: 5,
		output: 0,
		delta: -5,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: -5,
				input: 5,
				output: 0,
				price: 0,
			},
		],
		outputPlanets: [],
	},
	{
		ticker: "NCS",
		input: 0,
		output: 50,
		delta: 50,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: 50,
				input: 0,
				output: 50,
				price: 0,
			},
		],
		outputPlanets: [],
	},
	{
		ticker: "PG",
		input: 0,
		output: 5,
		delta: 5,
		deltaPrice: 0,
		inputPlanets: [
			{
				planetId: "moo",
				planUuid: "moo",
				planName: "moo",
				planCOGC: "---",
				delta: 50,
				input: 0,
				output: 50,
				price: 0,
			},
		],
		outputPlanets: [],
	},
];

describe("useProductionOpportunities", async () => {
	beforeAll(async () => {
		setActivePinia(createPinia());

		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		await recipesStore.setMany(recipes);
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await useExchangeData().preload();
		const { preloadBuildings, preloadRecipes } = useBuildingData();

		await preloadBuildings();
		await preloadRecipes();
		await flushPromises();
	});

	it("init", async () => {
		const { isLoading, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		expect(isLoading.value).toBeTruthy();

		await loadData();
		expect(isLoading.value).toBeFalsy();
	});

	it("allRecipesList", async () => {
		const { allRecipesList, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(allRecipesList.value.length).toBe(389);
	});

	it("deltaMap", async () => {
		const { deltaMap, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(deltaMap.value.size).toBe(3);
	});

	it("opportunityStats", async () => {
		const { opportunityStats, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(opportunityStats.value).toStrictEqual({
			deltaRequired: 5,
			fullMatch: 1,
			missingMaterial: 26,
			total: 32,
		});
	});

	it("opportunities", async () => {
		const { opportunities, loadData } = useProductionOpportunities(
			ref(fakeIEmpireMaterialIO),
			ref(undefined)
		);

		await loadData();
		expect(opportunities.value.length).toBe(32);
	});

	const io = (ticker: string, delta: number): IEmpireMaterialIO => ({
		ticker,
		input: 0,
		output: 0,
		delta,
		deltaPrice: 0,
		inputPlanets: [],
		outputPlanets: [],
	});
	const sellPrice = (ticker: string) =>
		exchanges.find((e) => e.ticker_id === `${ticker}.UNIVERSE`)!.vwap_30d;

	async function opportunitiesFor(empireIO: IEmpireMaterialIO[]) {
		const { opportunities, loadData } = useProductionOpportunities(
			ref(empireIO),
			ref(undefined)
		);
		await loadData();
		return opportunities.value;
	}

	it("values runs, output and input at the sell price", async () => {
		const [best] = await opportunitiesFor(fakeIEmpireMaterialIO);

		// 50 NCS surplus, 2xNCS=>2xMTC: 25 runs
		expect(best.recipe.recipe_name).toBe("2xNCS=>2xMTC");
		expect(best.sustainedRuns).toBe(25);
		expect(best.isFullMatch).toBe(true);
		expect(best.outputSellCost).toBeCloseTo(sellPrice("MTC") * 2 * 25);
		expect(best.inputSellCost).toBeCloseTo(sellPrice("NCS") * 2 * 25);
	});

	it("a surplus for exactly one run is a full match", async () => {
		const list = await opportunitiesFor([io("PG", 10)]);
		const pss = list.find((o) => o.recipe.recipe_name === "10xPG=>1xPSS")!;

		expect(pss.sustainedRuns).toBe(1);
		expect(pss.isFullMatch).toBe(true);
	});

	it("sorts by input match, then by runs", async () => {
		const list = await opportunitiesFor(fakeIEmpireMaterialIO);
		const ratios = list.map((o) => o.inputMatchRatio);

		expect(ratios).toStrictEqual([...ratios].sort((a, b) => b - a));
		// the first four all use every input, so runs decide their order
		expect(list.slice(0, 4).map((o) => o.inputMatchRatio)).toStrictEqual([
			1, 1, 1, 1,
		]);
		expect(list.slice(0, 4).map((o) => o.sustainedRuns)).toStrictEqual([
			25, 0.5, 0.25, 0.125,
		]);
	});
});
