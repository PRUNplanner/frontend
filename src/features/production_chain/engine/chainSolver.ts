// Engine
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";
import { optimizeHabs } from "@/features/planning/calculations/habOptimization";
import type { Solution } from "yalps";
import {
	getBuildingConstructionMaterials,
	resourceBuildingTicker,
} from "@/features/planning/engine/buildings";
import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/engine/workforce.constants";
import { calculateSatisfaction } from "@/features/planning/engine/workforce";
import {
	calculateBuildingEfficiency,
	calculateExpertBonus,
	calculateExperts,
	expertNames,
	MAP_BUILDING_EXPERTISE_EXPERTS,
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
} from "@/features/planning/engine/efficiency";
import { activeProgram } from "@/features/planet_search/planetSearch.engine";
import { getMaterialIOTotalPrice, type PriceType } from "@/features/cx/priceBook";
import {
	MARKET_SHARE_AMBER,
	MARKET_SHARE_RED,
} from "@/features/cx/marketCheck.util";

// Types & Interfaces
import type {
	BuildingExpertise,
	Exchange,
	Planet,
	PlanetSearchIndexEntry,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type {
	ExpertType,
	PlanCOGCProgram,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type { IInfrastructureCosts } from "@/features/cx/usePrice.types";
import type {
	IExpertRecord,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type {
	ChainLux,
	ChainRowSource,
	ChainSource,
	IChainBase,
	IChainBaseResult,
	IChainBuildingType,
	IChainByproduct,
	IChainContext,
	IChainCostParts,
	IChainExtractionSite,
	IChainFootprint,
	IChainHab,
	IChainInput,
	IChainLink,
	IChainMarketShare,
	IChainRecipeEffect,
	IChainResult,
	IChainRow,
	IChainTotals,
} from "@/features/production_chain/engine/chainSolver.types";

/**
 * # Production chain solver
 *
 * Solves a chain of per-day targets: every material once, depth-first from
 * the targets over the chosen recipes, demand summed in topological order.
 * Pure and synchronous like the plan engine. The rules are documented in
 * docs/features/production_chain.md.
 */

const DAY_MS = 86_400_000;
const EPS = 1e-9;
const COVER_PASSES = 8;
const WEAR_DAYS = 180;
/** core module area, in every base */
const CORE_AREA = 25;
/** storage every created plan gets */
const STORAGE = "STO";
const PERMIT_AREA = 250;
const MAX_PERMITS = 3;
export const MAX_AREA = PERMIT_AREA * (MAX_PERMITS + 1);

const WORKFORCE: [WorkforceType, keyof IWorkerCounts][] = [
	["pioneer", "pioneers"],
	["settler", "settlers"],
	["technician", "technicians"],
	["engineer", "engineers"],
	["scientist", "scientists"],
];

const HABS = [
	"HB1",
	"HB2",
	"HB3",
	"HB4",
	"HB5",
	"HBB",
	"HBC",
	"HBM",
	"HBL",
] as const;

interface IWorkerCounts {
	pioneers: number;
	settlers: number;
	technicians: number;
	engineers: number;
	scientists: number;
}

interface IBuildingCosts {
	/** daily workforce upkeep, basic needs and the luxuries at CX price */
	upkeep: number;
	construction: number;
}

/** what a base supplies when it doesn't say */
export const DEFAULT_LUX: ChainLux = "both";

const hasLux1 = (lux: ChainLux) => lux === "lux1" || lux === "both";
const hasLux2 = (lux: ChainLux) => lux === "lux2" || lux === "both";

interface IContextCache {
	buildings: Map<string, IBuildingCosts>;
	defaults: Map<string, string | null>;
}

// per context: building costs and default recipes only depend on prices
const caches = new WeakMap<IChainContext, IContextCache>();

function cacheOf(ctx: IChainContext): IContextCache {
	let cache = caches.get(ctx);
	if (!cache) {
		cache = { buildings: new Map(), defaults: new Map() };
		caches.set(ctx, cache);
	}
	return cache;
}

/**
 * Recipes by output ticker, without extraction recipes and recipes
 * without outputs
 * @author jplacht
 *
 * @param {Recipe[]} recipes All recipes
 * @returns {Map<string, Recipe[]>} Recipes by output ticker
 */
export function groupRecipesByOutput(recipes: Recipe[]): Map<string, Recipe[]> {
	const map = new Map<string, Recipe[]>();
	for (const recipe of recipes) {
		if (recipe.building_ticker in resourceBuildingTicker) continue;
		for (const out of recipe.outputs) {
			const list = map.get(out.material_ticker);
			if (list) list.push(recipe);
			else map.set(out.material_ticker, [recipe]);
		}
	}
	return map;
}

const buyPrice = (ctx: IChainContext, ticker: string) =>
	ctx.prices.getPrice(ticker, "BUY");
const sellPrice = (ctx: IChainContext, ticker: string) =>
	ctx.prices.getPrice(ticker, "SELL");

/**
 * What a workforce of a tier consumes per worker and day at CX price:
 * basic needs plus the given luxuries
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {WorkforceType} tier Tier
 * @param {boolean} lux1 Luxury 1 supplied
 * @param {boolean} lux2 Luxury 2 supplied
 * @returns {number} Cost per worker and day
 */
export function workerUpkeep(
	ctx: IChainContext,
	tier: WorkforceType,
	lux1: boolean,
	lux2: boolean
): number {
	let sum = 0;
	for (const need of WORKFORCE_CONSUMPTION_MAP[tier])
		if ((!need.lux1 || lux1) && (!need.lux2 || lux2))
			sum += need.need * buyPrice(ctx, need.ticker);
	return sum;
}

function buildingCosts(
	ctx: IChainContext,
	ticker: string,
	lux: ChainLux = DEFAULT_LUX
): IBuildingCosts {
	const cache = cacheOf(ctx).buildings;
	const key = `${ticker}|${lux}`;
	let costs = cache.get(key);
	if (costs) return costs;

	const building = ctx.buildings.get(ticker);
	if (!building) costs = { upkeep: 0, construction: 0 };
	else {
		let upkeep = 0;
		for (const [type, field] of WORKFORCE) {
			const workers = building[field];
			if (workers)
				upkeep +=
					workers * workerUpkeep(ctx, type, hasLux1(lux), hasLux2(lux));
		}
		costs = {
			upkeep,
			construction: -getMaterialIOTotalPrice(
				ctx.prices,
				getBuildingConstructionMaterials(building, undefined),
				"BUY"
			),
		};
	}
	cache.set(key, costs);
	return costs;
}

/** construction cost of one building at CX price */
export function buildingConstruction(
	ctx: IChainContext,
	ticker: string
): number {
	return buildingCosts(ctx, ticker).construction;
}

/** upkeep and wear of one building for one day */
function buildingDaily(
	ctx: IChainContext,
	ticker: string,
	lux: ChainLux = DEFAULT_LUX
): number {
	const c = buildingCosts(ctx, ticker, lux);
	return c.upkeep + c.construction / WEAR_DAYS;
}

/**
 * Cost per unit of one output of a recipe: inputs at their unit cost plus
 * the building's upkeep and wear for the run, shared between outputs by
 * CX value (by quantity when no output has a price)
 */
export function recipeCost(
	ctx: IChainContext,
	recipe: Recipe,
	ticker: string,
	efficiency: number,
	unitCostOf: (ticker: string) => number,
	lux: ChainLux = DEFAULT_LUX
): { unit: number; parts: IChainCostParts } {
	const out =
		recipe.outputs.find((o) => o.material_ticker === ticker)
			?.material_amount ?? 0;
	if (out <= 0)
		return {
			unit: 0,
			parts: { inputs: 0, upkeepWear: 0, share: 1 },
		};

	let inputs = 0;
	for (const i of recipe.inputs)
		inputs += i.material_amount * unitCostOf(i.material_ticker);
	const upkeepWear =
		(buildingDaily(ctx, recipe.building_ticker, lux) * recipe.time_ms) /
		DAY_MS /
		efficiency;

	let value = 0;
	let amount = 0;
	for (const o of recipe.outputs) {
		value += o.material_amount * sellPrice(ctx, o.material_ticker);
		amount += o.material_amount;
	}
	const share =
		value > 0 ? (out * sellPrice(ctx, ticker)) / value : out / amount;

	return {
		unit: ((inputs + upkeepWear) * share) / out,
		parts: {
			inputs: (inputs * share) / out,
			upkeepWear: (upkeepWear * share) / out,
			share,
		},
	};
}

/**
 * The default recipe of a material: the cheapest single-output recipe by
 * local unit cost (inputs at CX price); recipes with byproducts only when
 * none has a single output
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {string} ticker Material
 * @param {number} efficiency Efficiency as a factor, 1 = 100 %
 * @returns {string | null} Recipe id, null without recipes
 */
export function defaultRecipe(
	ctx: IChainContext,
	ticker: string,
	efficiency: number
): string | null {
	const cache = cacheOf(ctx).defaults;
	const key = `${ticker}|${efficiency}`;
	const cached = cache.get(key);
	if (cached !== undefined) return cached;

	const all = ctx.recipesByOutput.get(ticker) ?? [];
	const single = all.filter((r) => r.outputs.length === 1);
	const candidates = single.length ? single : all;

	let best: string | null = null;
	let bestCost = Infinity;
	for (const r of candidates) {
		const { unit } = recipeCost(ctx, r, ticker, efficiency, (t) =>
			buyPrice(ctx, t)
		);
		if (unit < bestCost) {
			bestCost = unit;
			best = r.recipe_id;
		}
	}
	cache.set(key, best);
	return best;
}

function tryExchange(
	ctx: IChainContext,
	tickerId: string
): Exchange | undefined {
	try {
		return ctx.getExchange(tickerId);
	} catch {
		return undefined;
	}
}

/**
 * Share of the 30 day average daily volume on the material's price
 * exchange; no trades count as red
 */
export function marketShare(
	ctx: IChainContext,
	ticker: string,
	perDay: number,
	type: PriceType
): IChainMarketShare {
	const exchange = ctx.prices.getPriceSource(ticker, type).volume;
	const traded = tryExchange(ctx, `${ticker}.${exchange}`)?.sum_traded_30d;
	const sharePct = traded ? (perDay / (traded / 30)) * 100 : null;
	const level =
		sharePct === null || sharePct >= MARKET_SHARE_RED
			? "red"
			: sharePct >= MARKET_SHARE_AMBER
				? "amber"
				: null;
	return { sharePct, level, exchange };
}

/** units per extractor and day at 100 %, as the plan's extraction recipe */
export function extractorRate(site: IChainExtractionSite): number {
	const type = resourceBuildingTicker[site.buildingTicker];
	if (!type || site.dailyExtraction <= 0) return 0;
	const { timeMs, extractionAmount } = calculateExtraction(
		type,
		site.dailyExtraction
	);
	return timeMs > 0 ? (extractionAmount * DAY_MS) / timeMs : 0;
}

/**
 * Cost per unit extracted on a site: the extractor's upkeep and wear
 * per building-day over its daily rate
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {IChainExtractionSite} site Planet and extractor
 * @param {number} efficiency Efficiency in %
 * @returns {number} Cost per unit, 0 without a rate
 */
export function extractionUnitCost(
	ctx: IChainContext,
	site: IChainExtractionSite,
	efficiency: number,
	lux: ChainLux = DEFAULT_LUX
): number {
	const rate = extractorRate(site) * (Math.max(efficiency, 1) / 100);
	return rate > 0 ? buildingDaily(ctx, site.buildingTicker, lux) / rate : 0;
}

/**
 * Every tier fully supplied with the given luxuries: the plan engine's
 * workforce efficiency at full satisfaction
 * @author jplacht
 *
 * @param {ChainLux} lux Luxuries
 * @returns {IWorkforceRecord} Workforce
 */
export function workforceRecord(lux: ChainLux): IWorkforceRecord {
	// capacity above required: satisfaction 1
	const efficiency = calculateSatisfaction(2, 1, hasLux1(lux), hasLux2(lux));
	return Object.fromEntries(
		WORKFORCE.map(([name]) => [
			name,
			{
				name,
				required: 0,
				capacity: 0,
				left: 0,
				lux1: hasLux1(lux),
				lux2: hasLux2(lux),
				efficiency,
			},
		])
	) as IWorkforceRecord;
}

/** every tier fully supplied, so the workforce factor is 1 */
const FULL_WORKFORCE = Object.fromEntries(
	WORKFORCE.map(([name]) => [
		name,
		{
			name,
			required: 0,
			capacity: 0,
			left: 0,
			lux1: false,
			lux2: false,
			efficiency: 1,
		},
	])
) as IWorkforceRecord;

const NO_EXPERTS = Object.fromEntries(
	expertNames.map((name) => [name, { name, amount: 0, bonus: 0 }])
) as IExpertRecord;

/** no experts of any type */
export function noExperts(): Record<ExpertType, number> {
	return Object.fromEntries(expertNames.map((n) => [n, 0])) as Record<
		ExpertType,
		number
	>;
}

/**
 * The expert type a building expertise employs
 * @author jplacht
 *
 * @param {string | null | undefined} expertise Building expertise
 * @returns {ExpertType | null} Expert type, null without expertise
 */
export function expertTypeOf(
	expertise: string | null | undefined
): ExpertType | null {
	return expertise
		? MAP_BUILDING_EXPERTISE_EXPERTS[expertise as BuildingExpertise]
		: null;
}

/**
 * The expert split worth most: the top three types by weight, at most 5
 * per type and 6 in total, by Σ weight × expert bonus
 * @author jplacht
 *
 * @param {Partial<Record<ExpertType, number>>} weights Value per type
 * @returns {Record<ExpertType, number>} Experts per type
 */
export function bestExpertSplit(
	weights: Partial<Record<ExpertType, number>>
): Record<ExpertType, number> {
	const types = (Object.keys(weights) as ExpertType[])
		.filter((t) => weights[t]! > 0)
		.sort((a, b) => weights[b]! - weights[a]!)
		.slice(0, 3);
	const best = noExperts();
	const current = noExperts();
	let bestValue = -1;
	const visit = (i: number, left: number, value: number) => {
		if (i === types.length) {
			if (value > bestValue + EPS) {
				bestValue = value;
				for (const t of types) best[t] = current[t];
			}
			return;
		}
		// more on the heavier type first, so ties keep it
		for (let n = Math.min(MAX_EXPERTS_PER_TYPE, left); n >= 0; n--) {
			current[types[i]] = n;
			visit(
				i + 1,
				left - n,
				value + weights[types[i]]! * calculateExpertBonus(n)
			);
		}
	};
	visit(0, MAX_EXPERTS_TOTAL, 0);
	return best;
}

/** a base's luxuries and experts */
export interface IChainSetup {
	lux: ChainLux;
	experts: Record<ExpertType, number>;
}

const setupRecords = new Map<
	string,
	{ workforce: IWorkforceRecord; experts: IExpertRecord }
>();

function recordsOf(setup: IChainSetup | undefined) {
	if (!setup) return { workforce: FULL_WORKFORCE, experts: NO_EXPERTS };
	const key = `${setup.lux}|${expertNames.map((n) => setup.experts[n]).join("")}`;
	let records = setupRecords.get(key);
	if (!records) {
		records = {
			workforce: workforceRecord(setup.lux),
			experts: calculateExperts(
				expertNames.map((type) => ({
					type,
					amount: setup.experts[type],
				}))
			),
		};
		setupRecords.set(key, records);
	}
	return records;
}

/**
 * A planet's running COGC program as a plan's program
 * @author jplacht
 *
 * @param {PlanetSearchIndexEntry | null} planet Planet
 * @param {number} now Epoch ms
 * @returns {PlanCOGCProgram} Program, "---" without one
 */
export function runningCOGC(
	planet: PlanetSearchIndexEntry | null,
	now: number
): PlanCOGCProgram {
	const program = planet ? activeProgram(planet, now) : null;
	if (!program || program === "Invalid") return "---";
	return program.replace(/^(ADVERTISING|WORKFORCE)_/, "") as PlanCOGCProgram;
}

/**
 * The program a base uses on a planet: the running one for "auto"
 * @author jplacht
 *
 * @param {IChainBase} base Base
 * @param {PlanetSearchIndexEntry | null} planet Planet
 * @param {number} now Epoch ms
 * @returns {PlanCOGCProgram} Program
 */
export function baseCOGC(
	base: IChainBase,
	planet: PlanetSearchIndexEntry | null,
	now: number
): PlanCOGCProgram {
	if (base.cogc === "auto") return runningCOGC(planet, now);
	return base.cogc === "none" ? "---" : base.cogc;
}

/**
 * A building's factor on a planet from the plan engine: COGC, workforce
 * program and fertility, and with a setup the base's workforce (every tier
 * supplied with its luxuries) and experts; without a setup a full
 * workforce and no experts (the planet's factors only). Without a planet
 * no COGC and no fertility count.
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {PlanetSearchIndexEntry | null} planet Planet
 * @param {PlanCOGCProgram} cogc Program
 * @param {string} buildingTicker Building
 * @param {IChainSetup} [setup] The base's luxuries and experts
 * @returns {number} Factor, 0 for a farm without fertility
 */
export function planetFactor(
	ctx: IChainContext,
	planet: PlanetSearchIndexEntry | null,
	cogc: PlanCOGCProgram,
	buildingTicker: string,
	setup?: IChainSetup
): number {
	const building = ctx.buildings.get(buildingTicker);
	if (!building || (!planet && !setup)) return 1;
	const { workforce, experts } = recordsOf(setup);
	return calculateBuildingEfficiency(
		building,
		// the efficiency reads only the fertility
		{ fertility: planet?.fertility ?? 0 } as Planet,
		false,
		planet ? cogc : "---",
		workforce,
		experts,
		undefined
	).totalEfficiency;
}

/** construction cost per hab for the hab solver; storage costs nothing there */
function habCosts(ctx: IChainContext): IInfrastructureCosts {
	const costs = { STO: 0, STA: 0, STE: 0, STV: 0, STW: 0 } as Record<
		string,
		number
	>;
	for (const hab of HABS)
		costs[hab] = ctx.buildings.has(hab)
			? buildingCosts(ctx, hab).construction
			: 1e15;
	return costs as IInfrastructureCosts;
}

const habArea = (solution: Solution, ctx: IChainContext) =>
	solution.variables.reduce(
		(sum, [ticker, n]) =>
			sum + n * (ctx.buildings.get(ticker)?.area_cost ?? 0),
		0
	);

/**
 * optimizeHabs("auto"), but the cheapest habs when they fit or when the
 * buildings alone fill the area: proving that nothing fits is slow
 */
function fittingHabs(
	ctx: IChainContext,
	required: IWorkforceRecord,
	available: number
): Solution {
	const costs = habCosts(ctx);
	const cheapest = optimizeHabs("cost", costs, required, available);
	if (
		available <= 0 ||
		(cheapest.status === "optimal" && habArea(cheapest, ctx) <= available)
	)
		return cheapest;
	return optimizeHabs("auto", costs, required, available);
}

/**
 * A base's footprint: its buildings, one STO, the core module and the
 * habs for its workforce in the area three permits leave
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {Pick<IChainBuildingType, "ticker" | "built" | "exact" | "expertise">[]} types Buildings
 * @param {ChainLux} [lux] Luxuries the workforce gets
 * @returns {IChainFootprint} Footprint
 */
export function baseFootprint(
	ctx: IChainContext,
	types: Pick<
		IChainBuildingType,
		"ticker" | "built" | "exact" | "expertise"
	>[],
	lux: ChainLux = DEFAULT_LUX
): IChainFootprint {
	const workforce: Record<WorkforceType, number> = {
		pioneer: 0,
		settler: 0,
		technician: 0,
		engineer: 0,
		scientist: 0,
	};
	const expertise: Record<string, number> = {};
	const materials = new Map<string, number>();
	let area = CORE_AREA;
	let upkeep = 0;
	let construction = 0;
	let built = 0;
	let exact = 0;

	const addConstruction = (ticker: string, amount: number) => {
		const building = ctx.buildings.get(ticker);
		if (!building) return;
		area += amount * building.area_cost;
		construction += amount * buildingCosts(ctx, ticker).construction;
		for (const m of building.costs)
			materials.set(
				m.material_ticker,
				(materials.get(m.material_ticker) ?? 0) +
					m.material_amount * amount
			);
	};

	for (const type of types) {
		built += type.built;
		exact += type.exact;
		addConstruction(type.ticker, type.built);
		upkeep += type.built * buildingCosts(ctx, type.ticker, lux).upkeep;
		const building = ctx.buildings.get(type.ticker);
		if (building)
			for (const [name, key] of WORKFORCE)
				workforce[name] += building[key] * type.built;
		if (type.expertise)
			expertise[type.expertise] =
				(expertise[type.expertise] ?? 0) + type.built;
	}
	addConstruction(STORAGE, 1);

	const habs: IChainHab[] = [];
	const areaBefore = area;
	if (Object.values(workforce).some((w) => w > 0)) {
		const required = Object.fromEntries(
			WORKFORCE.map(([name]) => [
				name,
				{ ...FULL_WORKFORCE[name], required: workforce[name] },
			])
		) as IWorkforceRecord;
		const solution = fittingHabs(ctx, required, MAX_AREA - area);
		if (solution.status === "optimal")
			for (const [ticker, amount] of solution.variables) {
				if (amount <= 0) continue;
				const before = area;
				addConstruction(ticker, amount);
				habs.push({ ticker, amount, area: area - before });
			}
	}

	const permits = Math.min(
		MAX_PERMITS,
		Math.max(1, Math.ceil((area - PERMIT_AREA) / PERMIT_AREA - EPS))
	);
	return {
		built,
		exact,
		area,
		habArea: area - areaBefore,
		areaAvailable: PERMIT_AREA * (permits + 1),
		permits,
		overArea: area > MAX_AREA + EPS,
		workforce,
		expertise,
		upkeep,
		wear: construction / WEAR_DAYS,
		construction,
		constructionMaterials: materials,
		habs,
	};
}

interface IPassRow {
	source: ChainRowSource;
	perDay: number;
	covered: number;
	have: number;
	/** buildings at 100 %, independent of efficiency */
	load: number;
}

interface IPass {
	rows: Map<string, IPassRow>;
	links: IChainLink[];
	byproducts: Map<string, number>;
	/** per byproduct: produced per producing material */
	byproductFrom: Map<string, Map<string, number>>;
}

const EMPTY_FOOTPRINT: IChainFootprint = {
	built: 0,
	exact: 0,
	area: 0,
	habArea: 0,
	areaAvailable: PERMIT_AREA * 2,
	permits: 1,
	overArea: false,
	workforce: {
		pioneer: 0,
		settler: 0,
		technician: 0,
		engineer: 0,
		scientist: 0,
	},
	expertise: {},
	upkeep: 0,
	wear: 0,
	construction: 0,
	constructionMaterials: new Map(),
	habs: [],
};

const FIRST_BASE: IChainBase = {
	id: "A",
	name: "",
	planetId: null,
	cogc: "auto",
};

/**
 * Solves a chain
 * @author jplacht
 *
 * @param {IChainInput} input Targets, settings and per-material choices
 * @param {IChainContext} ctx Game data and prices
 * @returns {IChainResult} Rows, links, byproducts, footprint and totals
 */
export function solveChain(
	input: IChainInput,
	ctx: IChainContext
): IChainResult {
	const efficiency = Math.max(input.efficiency, 1) / 100;
	const bases = input.bases.length ? input.bases : [FIRST_BASE];

	const targetPerDay = new Map<string, number>();
	for (const t of input.targets)
		if (t.perDay > 0)
			targetPerDay.set(
				t.ticker,
				(targetPerDay.get(t.ticker) ?? 0) + t.perDay
			);

	const canMake = (t: string) => (ctx.recipesByOutput.get(t)?.length ?? 0) > 0;
	const canExtract = (t: string) => ctx.resources.has(t);

	const sources = new Map<string, ChainSource>();
	const sourceOf = (t: string): ChainSource => {
		let s = sources.get(t);
		if (s) return s;
		const isTarget = targetPerDay.has(t);
		s = input.source[t];
		if (
			(s === "make" && !canMake(t)) ||
			(s === "extract" && !canExtract(t)) ||
			(s === "buy" && isTarget)
		)
			s = undefined;
		s ??= canMake(t)
			? "make"
			: canExtract(t) && (input.rawSource === "extract" || isTarget)
				? "extract"
				: "buy";
		sources.set(t, s);
		return s;
	};

	const recipes = new Map<string, Recipe>();
	const recipeOf = (t: string): Recipe => {
		let r = recipes.get(t);
		if (r) return r;
		const all = ctx.recipesByOutput.get(t) ?? [];
		r =
			all.find((x) => x.recipe_id === input.recipeId[t]) ??
			all.find((x) => x.recipe_id === defaultRecipe(ctx, t, efficiency))!;
		recipes.set(t, r);
		return r;
	};

	const baseIdOf = (t: string): string =>
		bases.some((b) => b.id === input.baseOf[t])
			? input.baseOf[t]
			: bases[0].id;
	const planetOf = (id: string): PlanetSearchIndexEntry | null => {
		const planetId = bases.find((b) => b.id === id)?.planetId;
		return (planetId && ctx.planets?.get(planetId)) || null;
	};
	const cogcs = new Map<string, PlanCOGCProgram>(
		bases.map((b) => [b.id, baseCOGC(b, planetOf(b.id), ctx.now)])
	);

	interface ISite {
		site: IChainExtractionSite;
		typical: boolean;
		notOnPlanet: boolean;
	}
	const sites = new Map<string, ISite | null>();
	// the base planet's own site wins over a picked or the typical one
	const siteOf = (t: string): ISite | null => {
		if (sites.has(t)) return sites.get(t)!;
		const options = ctx.extraction?.get(t);
		let s: ISite | null = null;
		if (options) {
			const planet = planetOf(baseIdOf(t));
			const onBase =
				planet &&
				options.sites.find(
					(x) => x.planetId === planet.planet_natural_id
				);
			const picked = options.sites.find(
				(x) => x.planetId === input.planetId[t]
			);
			s = onBase
				? { site: onBase, typical: false, notOnPlanet: false }
				: {
						site: picked ?? options.typical,
						typical: !picked,
						notOnPlanet: planet !== null,
					};
		}
		sites.set(t, s);
		return s;
	};

	// the bases' luxuries and experts, set once the demand is known
	const setups = new Map<string, IChainSetup>();
	// chain efficiency times the base's factor, per base and building
	const factors = new Map<string, number>();
	const effOf = (t: string): number => {
		const ticker =
			sourceOf(t) === "make"
				? recipeOf(t).building_ticker
				: siteOf(t)?.site.buildingTicker;
		if (!ticker) return efficiency;
		const id = baseIdOf(t);
		const key = `${id}|${ticker}`;
		let f = factors.get(key);
		if (f === undefined) {
			f = planetFactor(
				ctx,
				planetOf(id),
				cogcs.get(id)!,
				ticker,
				setups.get(id)
			);
			factors.set(key, f);
		}
		return efficiency * f;
	};

	// depth-first post-order: inputs before their consumers
	const order: string[] = [];
	const seen = new Set<string>();
	const onStack = new Set<string>();
	const cycleEdges = new Set<string>();
	const cycles: string[] = [];
	const visit = (t: string): boolean => {
		if (onStack.has(t)) {
			if (!cycles.includes(t)) cycles.push(t);
			return true;
		}
		if (seen.has(t)) return false;
		seen.add(t);
		onStack.add(t);
		if (sourceOf(t) === "make")
			for (const i of recipeOf(t).inputs)
				if (visit(i.material_ticker))
					cycleEdges.add(`${t}>${i.material_ticker}`);
		onStack.delete(t);
		order.push(t);
		return false;
	};
	for (const t of targetPerDay.keys()) visit(t);

	const rates = new Map<string, number>();
	const rateOf = (t: string) => {
		let r = rates.get(t);
		if (r === undefined) {
			const s = siteOf(t);
			r = s ? extractorRate(s.site) : 0;
			rates.set(t, r);
		}
		return r;
	};

	// own production per day; targets never use it
	const haveOf = (t: string): number => {
		const h = input.have?.[t];
		if (h === undefined || targetPerDay.has(t)) return 0;
		return h === "all" ? Infinity : Math.max(0, h);
	};

	const runPass = (supply: Map<string, number>): IPass => {
		const need = new Map(targetPerDay);
		const pass: IPass = {
			rows: new Map(),
			links: [],
			byproducts: new Map(),
			byproductFrom: new Map(),
		};
		for (let k = order.length - 1; k >= 0; k--) {
			const t = order[k];
			const gross = need.get(t) ?? 0;
			// byproducts first, then own production, the rest from the source
			const covered = Math.min(gross, supply.get(t) ?? 0);
			const have = Math.min(gross - covered, haveOf(t));
			const perDay = Math.max(0, gross - covered - have);
			let load = 0;
			const source = perDay <= EPS && have > EPS ? "have" : sourceOf(t);

			if (source === "make") {
				const r = recipeOf(t);
				const out = r.outputs.find(
					(o) => o.material_ticker === t
				)!.material_amount;
				const runs = perDay / out;
				load = (runs * r.time_ms) / DAY_MS;
				for (const i of r.inputs) {
					if (cycleEdges.has(`${t}>${i.material_ticker}`)) continue;
					const q = runs * i.material_amount;
					need.set(
						i.material_ticker,
						(need.get(i.material_ticker) ?? 0) + q
					);
					pass.links.push({
						input: i.material_ticker,
						consumer: t,
						perDay: q,
					});
				}
				for (const o of r.outputs) {
					if (o.material_ticker === t) continue;
					const x = o.material_ticker;
					const q = runs * o.material_amount;
					pass.byproducts.set(x, (pass.byproducts.get(x) ?? 0) + q);
					if (runs > EPS) {
						const from = pass.byproductFrom.get(x) ?? new Map();
						from.set(t, (from.get(t) ?? 0) + q);
						pass.byproductFrom.set(x, from);
					}
				}
			} else if (source === "extract") {
				const rate = rateOf(t);
				load = rate > 0 ? perDay / rate : 0;
			}
			pass.rows.set(t, {
				source,
				perDay: source === "have" ? 0 : perDay,
				covered,
				have,
				load,
			});
		}
		return pass;
	};

	let pass = runPass(new Map());
	if (input.byproducts === "cover")
		for (let i = 0; i < COVER_PASSES; i++) {
			const next = runPass(pass.byproducts);
			const keys = new Set([
				...next.byproducts.keys(),
				...pass.byproducts.keys(),
			]);
			const stable = [...keys].every(
				(k) =>
					Math.abs(
						(next.byproducts.get(k) ?? 0) -
							(pass.byproducts.get(k) ?? 0)
					) < EPS
			);
			pass = next;
			if (stable) break;
		}

	// materials nothing needs any more drop out: the inputs of Have rows and
	// of steps byproducts cover fully
	const needed = order.filter((t) => {
		const p = pass.rows.get(t)!;
		return targetPerDay.has(t) || p.perDay + p.covered + p.have > EPS;
	});
	order.splice(0, order.length, ...needed);
	const links = pass.links.filter((l) => l.perDay > EPS);

	// experts per base: the user's or the split worth most, weighted by the
	// output value per expertise (building-days without prices)
	for (const b of bases) {
		const value: Partial<Record<ExpertType, number>> = {};
		const load: Partial<Record<ExpertType, number>> = {};
		for (const t of order) {
			if (baseIdOf(t) !== b.id) continue;
			const source = sourceOf(t);
			const ticker =
				source === "make"
					? recipeOf(t).building_ticker
					: source === "extract"
						? siteOf(t)?.site.buildingTicker
						: undefined;
			const type = expertTypeOf(
				ticker ? ctx.buildings.get(ticker)?.expertise : null
			);
			const p = pass.rows.get(t)!;
			if (!type || p.load <= EPS) continue;
			value[type] = (value[type] ?? 0) + p.perDay * sellPrice(ctx, t);
			load[type] = (load[type] ?? 0) + p.load;
		}
		const priced = Object.values(value).some((v) => v > EPS);
		setups.set(b.id, {
			lux: b.lux ?? DEFAULT_LUX,
			experts: b.experts
				? { ...noExperts(), ...b.experts }
				: bestExpertSplit(priced ? value : load),
		});
	}

	// unit costs, inputs first
	const unitCost = new Map<string, number>();
	const users = new Map<string, Set<string>>();
	for (const l of links) {
		const u = users.get(l.input) ?? new Set();
		u.add(l.consumer);
		users.set(l.input, u);
	}

	const rows: Record<string, IChainRow> = {};
	for (const t of order) {
		const p = pass.rows.get(t)!;
		const source = pass.rows.get(t)!.source;
		const price = buyPrice(ctx, t);
		const isTarget = targetPerDay.has(t);
		// bought and had rows run no buildings here
		const noStep = source === "buy" || source === "have";
		const eff = noStep ? efficiency : effOf(t);
		// a farm without fertility is costed at the chain efficiency
		const costEff = eff > 0 ? eff : efficiency;
		const lux = setups.get(baseIdOf(t))!.lux;
		let uc = 0;
		let costParts: IChainCostParts | null = null;
		let recipe: Recipe | null = null;
		let buildingTicker: string | null = null;
		let site: IChainExtractionSite | null = null;
		let typicalSite = false;
		let notOnPlanet = false;

		if (noStep) uc = price;
		else if (source === "extract") {
			const s = siteOf(t);
			if (s) {
				site = s.site;
				typicalSite = s.typical;
				notOnPlanet = s.notOnPlanet;
				buildingTicker = s.site.buildingTicker;
				uc = extractionUnitCost(ctx, s.site, costEff * 100, lux);
				costParts = { inputs: 0, upkeepWear: uc, share: 1 };
			}
		} else {
			recipe = recipeOf(t);
			buildingTicker = recipe.building_ticker;
			const cost = recipeCost(
				ctx,
				recipe,
				t,
				costEff,
				(x) => unitCost.get(x) ?? buyPrice(ctx, x),
				lux
			);
			uc = cost.unit;
			costParts = cost.parts;
		}
		unitCost.set(t, uc);

		const market =
			source === "buy"
				? p.perDay > EPS
					? marketShare(ctx, t, p.perDay, "BUY")
					: null
				: isTarget
					? marketShare(ctx, t, targetPerDay.get(t)!, "SELL")
					: null;

		const priceSource = ctx.prices.getPriceSource(t, "BUY");
		rows[t] = {
			ticker: t,
			perDay: p.perDay,
			covered: p.covered,
			have: p.have,
			haveAvailable: haveOf(t) === Infinity ? null : haveOf(t),
			source,
			target: isTarget,
			targetPerDay: targetPerDay.get(t) ?? 0,
			canMake: canMake(t),
			canExtract: canExtract(t),
			recipe,
			recipeCount: ctx.recipesByOutput.get(t)?.length ?? 0,
			defaultRecipeId: canMake(t) ? defaultRecipe(ctx, t, efficiency) : null,
			buildingTicker,
			base: noStep ? null : baseIdOf(t),
			load: p.load,
			efficiency: eff,
			noFarming: !noStep && eff <= 0,
			notOnPlanet,
			buildings: eff > 0 ? p.load / eff : 0,
			site,
			typicalSite,
			pending: source === "extract" && !site,
			unitCost: uc,
			costParts,
			price,
			sellPrice: sellPrice(ctx, t),
			exchange: priceSource.exchange ?? priceSource.volume,
			users: [...(users.get(t) ?? [])],
			cheaper:
				!noStep &&
				!isTarget &&
				price > 0 &&
				uc > price + EPS,
			market,
		};
	}

	// byproducts: what the chain covers with them, the rest is sold
	const byproducts: IChainByproduct[] = [];
	for (const [ticker, produced] of pass.byproducts) {
		if (produced <= EPS) continue;
		const used = Math.min(produced, rows[ticker]?.covered ?? 0);
		const sold = produced - used;
		const from = pass.byproductFrom.get(ticker) ?? new Map();
		byproducts.push({
			ticker,
			produced,
			used,
			sold,
			from: [...from.keys()],
			fromAmounts: Object.fromEntries(from),
			sellPrice: sellPrice(ctx, ticker),
			market: sold > EPS ? marketShare(ctx, ticker, sold, "SELL") : null,
		});
	}

	// building types share capacity across recipes, inside one base only
	const types = new Map<string, IChainBuildingType>();
	for (const t of order) {
		const row = rows[t];
		if (!row.buildingTicker || !row.base || row.buildings <= EPS) continue;
		const key = `${row.base}|${row.buildingTicker}`;
		const type = types.get(key) ?? {
			ticker: row.buildingTicker,
			base: row.base,
			efficiency: row.efficiency,
			exact: 0,
			built: 0,
			materials: [],
			expertise: ctx.buildings.get(row.buildingTicker)?.expertise ?? null,
		};
		type.exact += row.buildings;
		type.materials.push(t);
		types.set(key, type);
	}
	const buildingTypes = [...types.values()];
	for (const type of buildingTypes)
		type.built = Math.max(1, Math.ceil(type.exact - 1e-6));
	buildingTypes.sort(
		(a, b) =>
			a.base.localeCompare(b.base) ||
			b.built - a.built ||
			b.exact - a.exact
	);

	const baseResults: IChainBaseResult[] = bases.map((b) => {
		const own = buildingTypes.filter((type) => type.base === b.id);
		const materials = order.filter((t) => rows[t].base === b.id);
		return {
			// a base without steps builds nothing, not even its STO
			...(materials.length
				? baseFootprint(ctx, own, setups.get(b.id)!.lux)
				: EMPTY_FOOTPRINT),
			id: b.id,
			name: b.name,
			planet: planetOf(b.id),
			cogc: cogcs.get(b.id)!,
			running: runningCOGC(planetOf(b.id), ctx.now),
			lux: setups.get(b.id)!.lux,
			experts: setups.get(b.id)!.experts,
			expertsAuto: !b.experts,
			buildingTypes: own,
			materials,
			noFarming: materials.filter((t) => rows[t].noFarming),
			notOnPlanet: materials.filter((t) => rows[t].notOnPlanet),
		};
	});

	return {
		order,
		rows,
		links,
		byproducts,
		buildingTypes,
		bases: baseResults,
		totals: totalsOf(
			ctx,
			rows,
			order,
			targetPerDay,
			byproducts,
			baseResults
		),
		warnings: {
			cheaper: order.filter((t) => rows[t].cheaper),
			thin: order.filter(
				(t) => rows[t].source === "buy" && rows[t].market?.level
			),
			cycles: cycles.filter((t) => t in rows),
		},
	};
}

/** spec 1's totals, summed over the bases' footprints */
function totalsOf(
	ctx: IChainContext,
	rows: Record<string, IChainRow>,
	order: string[],
	targetPerDay: Map<string, number>,
	byproducts: IChainByproduct[],
	bases: IChainFootprint[]
): IChainTotals {
	const workforce: Record<WorkforceType, number> = {
		pioneer: 0,
		settler: 0,
		technician: 0,
		engineer: 0,
		scientist: 0,
	};
	const expertise: Record<string, number> = {};
	const materials = new Map<string, number>();
	const habs = new Map<string, IChainHab>();
	let area = 0;
	let habArea = 0;
	let upkeep = 0;
	let wear = 0;
	let construction = 0;
	let built = 0;
	let exact = 0;

	for (const b of bases) {
		area += b.area;
		habArea += b.habArea;
		upkeep += b.upkeep;
		wear += b.wear;
		construction += b.construction;
		built += b.built;
		exact += b.exact;
		for (const [tier, n] of Object.entries(b.workforce))
			workforce[tier as WorkforceType] += n;
		for (const [name, n] of Object.entries(b.expertise))
			expertise[name] = (expertise[name] ?? 0) + n;
		for (const [ticker, n] of b.constructionMaterials)
			materials.set(ticker, (materials.get(ticker) ?? 0) + n);
		for (const h of b.habs) {
			const sum = habs.get(h.ticker) ?? {
				ticker: h.ticker,
				amount: 0,
				area: 0,
			};
			sum.amount += h.amount;
			sum.area += h.area;
			habs.set(h.ticker, sum);
		}
	}

	let bought = 0;
	let boughtCount = 0;
	let own = 0;
	let ownCount = 0;
	for (const t of order) {
		const row = rows[t];
		if (row.have > EPS) {
			own += row.have * row.price;
			ownCount++;
		}
		if (row.source !== "buy" || row.perDay <= EPS) continue;
		bought += row.perDay * row.price;
		boughtCount++;
	}

	let targetsValue = 0;
	for (const [t, q] of targetPerDay) targetsValue += q * sellPrice(ctx, t);
	const byproductsValue = byproducts.reduce(
		(s, b) => s + b.sold * b.sellPrice,
		0
	);
	const outputValue = targetsValue + byproductsValue;
	// own production counts like a bought input at its CX price
	const profit = outputValue - bought - own - upkeep - wear;

	return {
		targetsValue,
		byproductsValue,
		outputValue,
		bought,
		boughtCount,
		own,
		ownCount,
		upkeep,
		wear,
		profit,
		built,
		exact,
		area,
		habArea,
		workforce,
		expertise,
		construction,
		constructionMaterials: [...materials]
			.map(([ticker, amount]) => ({ ticker, amount }))
			.sort(
				(a, b) =>
					b.amount * buyPrice(ctx, b.ticker) -
					a.amount * buyPrice(ctx, a.ticker)
			),
		habs: [...habs.values()],
		payback: profit > 0 ? construction / profit : null,
	};
}

/**
 * Every recipe of a material with its effect on the chain: re-solves the
 * chain with each option. In-use first, then by Δ profit.
 * @author jplacht
 *
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context
 * @param {string} ticker Material
 * @param {IChainResult} [base] The current solution, solved if not given
 * @returns {IChainRecipeEffect[]} Options
 */
export function recipeEffects(
	input: IChainInput,
	ctx: IChainContext,
	ticker: string,
	base: IChainResult = solveChain(input, ctx)
): IChainRecipeEffect[] {
	const current = base.rows[ticker]?.recipe?.recipe_id;
	const fallback = base.rows[ticker]?.defaultRecipeId;
	const forced: IChainInput = {
		...input,
		source: { ...input.source, [ticker]: "make" },
	};

	return (ctx.recipesByOutput.get(ticker) ?? [])
		.map((recipe) => {
			const inUse = recipe.recipe_id === current;
			const result = inUse
				? base
				: solveChain(
						{
							...forced,
							recipeId: { ...input.recipeId, [ticker]: recipe.recipe_id },
						},
						ctx
					);
			return {
				recipe,
				unitCost: result.rows[ticker]?.unitCost ?? 0,
				inUse,
				isDefault: recipe.recipe_id === fallback,
				byproducts: recipe.outputs.length > 1,
				deltaProfit: result.totals.profit - base.totals.profit,
				deltaBuilt: result.totals.built - base.totals.built,
			};
		})
		.sort(
			(a, b) =>
				Number(b.inUse) - Number(a.inUse) || b.deltaProfit - a.deltaProfit
		);
}
