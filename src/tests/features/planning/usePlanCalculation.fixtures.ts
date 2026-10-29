import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import { expect } from "vitest";

// Engine
import { getBuildingWorkforceMaterials } from "@/features/planning/engine/workforce";

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
import {
	ExpertTypeSchema,
	type ExpertType,
	type Plan,
	type WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type { Building, Planet } from "@/features/api/schemas/gameData.schemas";
import type {
	IExpertRecord,
	IMaterialIO,
	IPlanResult,
	IProductionBuilding,
	IProductionBuildingRecipe,
	IRecipeBuildingOption,
	IWorkforceElement,
} from "@/features/planning/usePlanCalculation.types";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import materials from "@/tests/test_data/api_data_materials.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planet_search from "@/tests/test_data/api_data_planet_search.json";

/**
 * Shared plans and setup for the planning engine characterization tests
 * and the benchmarks. Callers must mock
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

export function etherwindPlan(): Plan {
	return structuredClone(plan_etherwind) as unknown as Plan;
}

export function emptyPlan(): Plan {
	const plan = etherwindPlan();
	plan.plan_data.buildings = [];
	plan.plan_data.infrastructure = [];
	return plan;
}

export function smallPlan(): Plan {
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
export function largePlan(): Plan {
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
export function findRecipeSwap(plan: Plan): {
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
export function planetSearchWithN(): Planet[] {
	return (structuredClone(planet_search) as unknown as Planet[]).map((p) => {
		if (!p.resources.some((r) => r.material_ticker === "N"))
			p.resources.push({
				material_ticker: "N",
				resource_type: "GASEOUS",
				factor: 0.04132271185517311,
				daily_extraction: 2.4793627113103867,
				max_daily_extraction: 52.013511061668396,
			} as Planet["resources"][number]);
		return p;
	});
}

/**
 * The ROI tools compare buildings at full housing with both luxuries:
 * every workforce type of every plan is fully housed with both luxuries,
 * and every building's workforce cost is that fully provided reference.
 */
export function expectFullWorkforceCost(results: IPlanResult[]): void {
	expect(results.length).toBeGreaterThan(0);

	for (const result of results) {
		for (const w of Object.values(result.workforce)) {
			expect(w.lux1 && w.lux2).toBe(true);
			expect(w.capacity).toBeGreaterThanOrEqual(w.required);
		}

		for (const b of result.production.buildings)
			expect(b.workforceMaterials).toStrictEqual(
				getBuildingWorkforceMaterials(
					buildings.find(
						(e) => e.building_ticker === b.name
					) as unknown as Building
				)
			);
	}
}

// -- builders for hand-made calculation results ---------------------------

/** A recipe input or output */
export const m = (material_ticker: string, material_amount = 1) => ({
	material_ticker,
	material_amount,
});

/** A recipe option of an SME, 1 h, without materials or figures */
export const option = (
	id: string,
	over: Partial<IRecipeBuildingOption> = {}
): IRecipeBuildingOption => ({
	recipe_id: id,
	building_ticker: "SME",
	recipe_name: id,
	time_ms: 3600000,
	inputs: [],
	outputs: [],
	dailyRevenue: 0,
	roi: 0,
	profitPerArea: 0,
	...over,
});

/** A building's running recipe, once, the whole day */
export const activeRecipe = (
	recipe: IRecipeBuildingOption,
	over: Partial<IProductionBuildingRecipe> = {}
): IProductionBuildingRecipe => ({
	recipeId: recipe.recipe_id,
	amount: 1,
	recipe,
	dailyShare: 1,
	time: 0,
	cogm: undefined,
	...over,
});

/** One production building without recipes, costs or bonuses */
export const building = (
	name: string,
	over: Partial<IProductionBuilding> = {}
): IProductionBuilding => ({
	name,
	amount: 1,
	areaUsed: 0,
	activeRecipes: [],
	recipeOptions: [],
	totalEfficiency: 1,
	efficiencyElements: [],
	totalBatchTime: 0,
	constructionMaterials: [],
	constructionCost: 0,
	workforceMaterials: [],
	workforceDailyCost: 0,
	dailyRevenue: 0,
	expertise: null,
	...over,
});

/** A material I/O row: input or output from the sign of delta, the rest 0 */
export const io = (
	ticker: string,
	delta: number,
	over: Partial<IMaterialIO> = {}
): IMaterialIO => ({
	ticker,
	input: delta < 0 ? -delta : 0,
	output: delta > 0 ? delta : 0,
	delta,
	price: 0,
	individualWeight: 0,
	individualVolume: 0,
	totalWeight: 0,
	totalVolume: 0,
	...over,
});

/** A material I/O row with both In and Out */
export const inOut = (ticker: string, input: number, output: number) =>
	io(ticker, output - input, { input, output });

/** A workforce tier at 0, with both luxuries or none (`lux`) */
export const wf = (
	name: WorkforceType,
	data: Partial<IWorkforceElement> = {},
	lux = true
): IWorkforceElement => ({
	name,
	required: 0,
	capacity: 0,
	left: 0,
	lux1: lux,
	lux2: lux,
	efficiency: 0,
	...data,
});

/** Every expert at 0 / 0 %, the given ones at [amount, bonus] */
export const experts = (
	set: Partial<Record<ExpertType, [number, number?]>> = {}
): IExpertRecord =>
	Object.fromEntries(
		ExpertTypeSchema.options.map((name) => [
			name,
			{ name, amount: set[name]?.[0] ?? 0, bonus: set[name]?.[1] ?? 0 },
		])
	) as IExpertRecord;
