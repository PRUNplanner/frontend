// Data
import {
	buildingsStore,
	exchangesStore,
	materialsStore,
	recipesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useExchangeData } from "@/database/services/useExchangeData";

// Engine
import { createPriceBook } from "@/features/cx/priceBook";
import {
	groupRecipesByOutput,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { splitByExpertise } from "@/features/production_chain/engine/chainBases";
import { extractionOptions } from "@/features/production_chain/engine/chainExtraction";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// Types & Interfaces
import type {
	Building,
	Exchange,
	Material,
	PlanetSearchIndexEntry,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type {
	IChainContext,
	IChainInput,
} from "@/features/production_chain/engine/chainSolver.types";

// test data
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planetIndex from "@/tests/test_data/api_data_planet_search_index.json";

export const index = planetIndex as unknown as PlanetSearchIndexEntry[];

/** inside the test index's COGC programs */
export const NOW = 1_791_000_000_000;

const exchangeMap = new Map(
	(exchanges as unknown as Exchange[]).map((e) => [e.ticker_id, e])
);

export function getExchange(tickerId: string): Exchange {
	const e = exchangeMap.get(tickerId);
	if (!e) throw new Error(`Exchange ${tickerId} missing`);
	return e;
}

/**
 * A chain context on the test data, Universe VWAP 30d prices
 *
 * @param withExtraction load the planet index's extraction options
 */
export function testContext(withExtraction = true): IChainContext {
	return {
		recipesByOutput: groupRecipesByOutput(recipes as Recipe[]),
		buildings: new Map(
			(buildings as Building[]).map((b) => [b.building_ticker, b])
		),
		materials: new Map((materials as Material[]).map((m) => [m.ticker, m])),
		prices: createPriceBook(undefined, undefined, getExchange),
		getExchange,
		resources: new Set(RESOURCE_MATERIAL_OPTIONS.map((o) => o.value)),
		extraction: withExtraction ? extractionOptions(index) : undefined,
		planets: withExtraction
			? new Map(index.map((p) => [p.planet_natural_id, p]))
			: undefined,
		now: NOW,
	};
}

export function chainInput(
	targets: [string, number][],
	overrides: Partial<IChainInput> = {}
): IChainInput {
	return {
		targets: targets.map(([ticker, perDay]) => ({ ticker, perDay })),
		efficiency: 100,
		rawSource: "buy",
		byproducts: "cover",
		source: {},
		recipeId: {},
		planetId: {},
		bases: [{ id: "A", name: "", planetId: null, cogc: "auto" }],
		baseOf: {},
		...overrides,
	};
}

/** runs Food Industries, not fertile */
export const FOOD_PLANET = "XH-668c";
/** runs Agriculture, fertility 0.4018, H2O */
export const FARM_PLANET = "PG-899b";

/**
 * DW 100 + RAT 100 + OVE 50 split by expertise: A Agriculture, B Food
 * Industries, on the given planets
 */
export function splitInput(
	planets: [string | null, string | null] = [FARM_PLANET, FOOD_PLANET]
): IChainInput {
	const ctx = testContext();
	const targets: [string, number][] = [
		["DW", 100],
		["RAT", 100],
		["OVE", 50],
	];
	const split = splitByExpertise(
		solveChain(chainInput(targets), ctx),
		ctx,
		100
	);
	return chainInput(targets, {
		bases: [
			{
				id: "A",
				name: "Agriculture",
				planetId: planets[0],
				cogc: "auto",
			},
			{
				id: "B",
				name: "Food Industries",
				planetId: planets[1],
				cogc: "auto",
			},
		],
		baseOf: split.baseOf,
	});
}

/**
 * Seeds the game data stores and preloads them, for components that read
 * materials, recipes, buildings and exchanges through the data layer
 */
export async function seedGameData(): Promise<void> {
	await materialsStore.setMany(materials as Material[]);
	await buildingsStore.setMany(buildings as Building[]);
	await recipesStore.setMany(recipes as Recipe[]);
	await exchangesStore.setMany(exchanges as unknown as Exchange[]);
	await useMaterialData().preload();
	const { preloadBuildings, preloadRecipes } = useBuildingData();
	await preloadBuildings();
	await preloadRecipes();
	await useExchangeData().preload();
}
