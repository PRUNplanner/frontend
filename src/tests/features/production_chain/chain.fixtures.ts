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
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { checkEmpire } from "@/features/production_chain/engine/chainCheck";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// Types & Interfaces
import type {
	Building,
	Exchange,
	Material,
	Planet,
	PlanetSearchIndexEntry,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type {
	ExpertType,
	InfrastructureType,
	PlanCOGCProgram,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type {
	ICheckInput,
	ICheckPlan,
} from "@/features/production_chain/engine/chainCheck.types";
import type {
	ChainLux,
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
		// no experts: the factors stay the planet's; setup tests set their own
		bases: [
			{ id: "A", name: "", planetId: null, cogc: "auto", experts: {} },
		],
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

/**
 * A plan engine context on an index planet: game data, the same Universe
 * prices as testContext; normal gravity, pressure and temperature
 */
export function planContextFor(planetId: string): IPlanContext {
	const ctx = testContext();
	const entry = index.find((p) => p.planet_natural_id === planetId)!;
	const recipesByBuilding: Record<string, Recipe[]> = {};
	for (const r of recipes as Recipe[])
		(recipesByBuilding[r.building_ticker] ??= []).push(r);
	return {
		buildings: ctx.buildings,
		materials: ctx.materials,
		recipesByBuilding,
		planet: {
			...entry,
			gravity: 1,
			pressure: 1,
			temperature: 20,
		} as unknown as Planet,
		prices: ctx.prices,
	};
}

/** fertility −0.5, no program, H2O */
export const BARREN = "GY-110c";
const CHECK_TIERS: [
	WorkforceType,
	InfrastructureType,
	"pioneers" | "settlers" | "technicians" | "engineers" | "scientists",
][] = [
	["pioneer", "HB1", "pioneers"],
	["settler", "HB2", "settlers"],
	["technician", "HB3", "technicians"],
	["engineer", "HB4", "engineers"],
	["scientist", "HB5", "scientists"],
];

/** a stored plan with habs for its workforce, as the API returns it */
export function fixturePlan(
	id: string,
	planetId: string,
	cogc: PlanCOGCProgram,
	lux: ChainLux,
	experts: Partial<Record<ExpertType, number>>,
	buildings: [string, number, string][]
): Plan {
	const ctx = testContext();
	const habs = CHECK_TIERS.map(([, hab, field]) => ({
		building: hab,
		amount: Math.ceil(
			buildings.reduce(
				(s, [b, n]) => s + ctx.buildings.get(b)![field] * n,
				0
			) / 100
		),
	})).filter((h) => h.amount > 0);
	return {
		uuid: `uuid-${id}`,
		plan_name: `Plan ${id}`,
		planet_natural_id: planetId,
		plan_cogc: cogc,
		plan_corphq: false,
		plan_permits_used: 3,
		plan_data: {
			buildings: buildings.map(([name, amount, recipeid]) => ({
				name,
				amount,
				active_recipes: [{ recipeid, amount: 1 }],
			})),
			experts: Object.entries(experts).map(([type, amount]) => ({
				type: type as ExpertType,
				amount: amount!,
			})),
			workforce: CHECK_TIERS.map(([type]) => ({
				type,
				lux1: lux === "lux1" || lux === "both",
				lux2: lux === "lux2" || lux === "both",
			})),
			infrastructure: habs,
		},
	} as Plan;
}

/** a stored plan through the plan engine, as the check gets it */
export function checkFromPlan(id: string, plan: Plan): ICheckPlan {
	const result = calculatePlan(
		{ plan, empire: undefined, cxUuid: undefined, recipeOptions: false },
		planContextFor(plan.planet_natural_id)
	);
	return {
		id,
		uuid: plan.uuid,
		name: plan.plan_name,
		planetId: plan.planet_natural_id,
		cogc: plan.plan_cogc,
		result: result.result,
		profit: result.overview.profit,
	};
}

export function checkPlan(...args: Parameters<typeof fixturePlan>): ICheckPlan {
	return checkFromPlan(args[0], fixturePlan(...args));
}

export const DW = "FP#10xH2O 1xPG=>10xDW";
export const DW7 = "FP#10xH2O=>7xDW";
export const RAT = "FP#1xGRN 1xALG 1xNUT=>10xRAT";
export const GRN1 = "FRM#1xH2O=>4xGRN";
export const GRN4 = "FRM#4xH2O=>4xGRN";

export function fixtureEmpirePlans(dwRecipe = DW): Plan[] {
	return [
		fixturePlan(
			"A",
			FOOD_PLANET,
			"FOOD_INDUSTRIES",
			"both",
			{ Food_Industries: 5 },
			[["FP", 4, dwRecipe]]
		),
		// runs Agriculture, the plan doesn't count it; no luxuries or experts
		fixturePlan("B", FARM_PLANET, "---", "none", {}, [
			["FRM", 3, GRN1],
			["RIG", 2, "RIG#H2O"],
		]),
		// counts Agriculture, the barren planet runs nothing
		fixturePlan("C", BARREN, "AGRICULTURE", "both", {}, [["FRM", 2, GRN4]]),
		fixturePlan(
			"D",
			FOOD_PLANET,
			"FOOD_INDUSTRIES",
			"both",
			{ Food_Industries: 5 },
			[["FP", 2, RAT]]
		),
		// carbon: in no chain of DW and RAT
		fixturePlan("E", BARREN, "---", "both", {}, [
			["INC", 1, "INC#4xGRN=>4xC"],
		]),
	];
}

export function fixtureEmpire(dwRecipe = DW): ICheckPlan[] {
	return fixtureEmpirePlans(dwRecipe).map((p, i) =>
		checkFromPlan(String.fromCharCode(65 + i), p)
	);
}

/** the fixture empire checked for DW and RAT, every finding shown */
export function fixtureCheck(
	overrides: Partial<ICheckInput> = {},
	ctx: IChainContext = testContext()
) {
	return checkEmpire(
		{
			plans: fixtureEmpire(),
			targets: ["DW", "RAT"],
			min: 0,
			setup: true,
			payback: 100,
			picks: {},
			...overrides,
		},
		ctx
	);
}

/** the fixture empire plus water rigs on the barren planet, for extraction moves */
export function fixtureWithRigs(): ICheckPlan[] {
	return [
		...fixtureEmpire(),
		checkPlan("F", BARREN, "---", "both", {}, [["RIG", 2, "RIG#H2O"]]),
	];
}
