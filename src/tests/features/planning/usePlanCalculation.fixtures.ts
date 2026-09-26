import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

import {
	materialsStore,
	recipesStore,
	buildingsStore,
	exchangesStore,
} from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { useBuildingData } from "@/database/services/useBuildingData";
import { useExchangeData } from "@/database/services/useExchangeData";

// Types & Interfaces
import { IPlan } from "@/stores/planningStore.types";
import { IPlanet } from "@/features/api/gameData.types";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planet_search from "@/tests/test_data/api_data_planet_search.json";

/**
 * Shared plans and setup for the planning engine characterization tests
 * and the latency benchmark (refactor Phase 0). Callers must mock
 * `usePlanetData` to return `api_data_planet_etherwind.json`.
 */

export async function setupPlanningTestData(): Promise<void> {
	setActivePinia(createPinia());

	// @ts-expect-error mock data
	await buildingsStore.setMany(buildings);
	await recipesStore.setMany(recipes);
	await materialsStore.setMany(materials);
	// @ts-expect-error mock data date as string
	await exchangesStore.setMany(exchanges);

	// like the game data queries in queryRepository: everything in memory
	await useMaterialData().preload();
	await useBuildingData().preloadBuildings();
	await useBuildingData().preloadRecipes();
	await useExchangeData().preload();
	await flushPromises();
}

export function etherwindPlan(): IPlan {
	return structuredClone(plan_etherwind) as unknown as IPlan;
}

export function emptyPlan(): IPlan {
	const plan = etherwindPlan();
	plan.plan_data.buildings = [];
	plan.plan_data.infrastructure = [];
	return plan;
}

export function smallPlan(): IPlan {
	const plan = etherwindPlan();
	plan.plan_data.buildings = plan.plan_data.buildings.slice(0, 3);
	return plan;
}

// extraction recipes are generated from planet resources, not the fixture
const EXTRACTORS = ["EXT", "RIG", "COL"];

/**
 * Every production building with 3+ recipes in the test data (extractors
 * excluded, their recipes depend on planet resources), each running its
 * first three recipes by id.
 */
export function largePlan(): IPlan {
	const plan = etherwindPlan();
	const productionTickers = new Set(
		buildings
			.filter((b) => b.building_type === "PRODUCTION")
			.map((b) => b.building_ticker)
	);
	const byBuilding = new Map<string, string[]>();
	for (const r of recipes) {
		if (EXTRACTORS.includes(r.building_ticker)) continue;
		if (!productionTickers.has(r.building_ticker)) continue;
		byBuilding.set(r.building_ticker, [
			...(byBuilding.get(r.building_ticker) ?? []),
			r.recipe_id,
		]);
	}

	plan.plan_data.buildings = [...byBuilding.entries()]
		.filter(([, ids]) => ids.length >= 3)
		.sort(([a], [b]) => (a > b ? 1 : -1))
		.map(([name, ids], i) => ({
			name,
			amount: (i % 4) + 1,
			active_recipes: [...ids]
				.sort()
				.slice(0, 3)
				.map((recipeid, j) => ({ recipeid, amount: j === 1 ? 2 : 1 })),
		}));
	plan.plan_data.infrastructure = [
		{ building: "HB1", amount: 40 },
		{ building: "HB2", amount: 30 },
		{ building: "HB3", amount: 20 },
		{ building: "HB4", amount: 10 },
		{ building: "HB5", amount: 5 },
		{ building: "STO", amount: 2 },
	];
	return plan;
}

/**
 * Index of the first plan building with a recipe that is not active yet,
 * plus that recipe's id, for recipe swap edits.
 */
export function findRecipeSwap(plan: IPlan): {
	index: number;
	recipeid: string;
} {
	const index = plan.plan_data.buildings.findIndex(
		(b) =>
			!EXTRACTORS.includes(b.name) &&
			recipes.some(
				(r) =>
					r.building_ticker === b.name &&
					!b.active_recipes.some((ar) => ar.recipeid === r.recipe_id)
			)
	);
	const b = plan.plan_data.buildings[index];
	const recipeid = recipes.find(
		(r) =>
			r.building_ticker === b.name &&
			!b.active_recipes.some((ar) => ar.recipeid === r.recipe_id)
	)!.recipe_id;
	return { index, recipeid };
}

/**
 * The planet search fixture where every planet has N, like a real search
 * for N returns. Planets without N get a gaseous N deposit.
 */
export function planetSearchWithN(): IPlanet[] {
	return (structuredClone(planet_search) as unknown as IPlanet[]).map(
		(p) => {
			if (!p.resources.some((r) => r.material_ticker === "N"))
				p.resources.push({
					material_ticker: "N",
					resource_type: "GASEOUS",
					factor: 0.04132271185517311,
					daily_extraction: 2.4793627113103867,
					max_daily_extraction: 52.013511061668396,
				} as IPlanet["resources"][number]);
			return p;
		}
	);
}
