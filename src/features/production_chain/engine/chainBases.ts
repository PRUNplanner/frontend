// Engine
import {
	baseCOGC,
	baseFootprint,
	extractorRate,
	planetFactor,
} from "@/features/production_chain/engine/chainSolver";
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";
import { resourceBuildingTicker } from "@/features/planning/engine/buildings";
import { expertNames } from "@/features/planning/engine/efficiency";

// Types & Interfaces
import type {
	Building,
	Material,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type {
	InfrastructureType,
	PlanCOGCProgram,
	PlanCreateData,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type {
	IChainBaseResult,
	IChainContext,
	IChainExtractionSite,
	IChainFootprint,
	IChainInput,
	IChainResult,
} from "@/features/production_chain/engine/chainSolver.types";

/**
 * # Bases
 *
 * Splitting a solved chain into bases, shipping between them, ranking
 * planets for a base and drafting one plan per base. The rules are
 * documented in docs/features/production_chain.md.
 */

const EPS = 1e-9;
export const BASE_IDS = ["A", "B", "C", "D", "E", "F", "G", "H"];
/** a group of steps this large gets its own base when splitting */
const SPLIT_MIN_BUILDINGS = 1.5;
const SPLIT_MAX_BASES = 4;
/** created plans queue at most this many orders per recipe */
const MAX_RECIPE_AMOUNT = 10;
/** queue time shares may differ from the chain's by this much */
const RECIPE_SHARE_TOLERANCE = 0.05;

const TIERS: WorkforceType[] = [
	"pioneer",
	"settler",
	"technician",
	"engineer",
	"scientist",
];

/**
 * Whether a program helps any of the buildings: an advertising program
 * of its expertise, or a workforce program for a tier it employs
 * @author jplacht
 *
 * @param {IChainContext} ctx Chain context
 * @param {PlanCOGCProgram} program Program
 * @param {string[]} buildings Building tickers
 * @returns {boolean} Fits
 */
export function cogcFits(
	ctx: IChainContext,
	program: PlanCOGCProgram,
	buildings: string[]
): boolean {
	if (program === "---") return false;
	// a workforce program is named after the building's worker field
	const workers = program.toLowerCase();
	const isWorkforce = TIERS.some((t) => `${t}s` === workers);
	return buildings.some((ticker) => {
		const b = ctx.buildings.get(ticker);
		if (!b) return false;
		return isWorkforce
			? Number(b[workers as keyof Building]) > 0
			: b.expertise === program;
	});
}

export interface IChainSplit {
	/** expertise each new base is named after, null for none */
	expertise: (string | null)[];
	baseOf: Record<string, string>;
}

/**
 * Suggests bases by building expertise: groups of 1.5 or more exact
 * buildings (at the chain efficiency) get a base, largest first, at most
 * four; the other steps join the first base
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {IChainContext} ctx Chain context
 * @param {number} efficiency Chain efficiency in %
 * @returns {IChainSplit} Bases and assignments
 */
export function splitByExpertise(
	result: IChainResult,
	ctx: IChainContext,
	efficiency: number
): IChainSplit {
	const eff = Math.max(efficiency, 1) / 100;
	const groups = new Map<string, { exact: number; tickers: string[] }>();
	const steps = result.order.filter((t) => result.rows[t].source !== "buy");
	for (const t of steps) {
		const row = result.rows[t];
		const expertise = row.buildingTicker
			? ctx.buildings.get(row.buildingTicker)?.expertise
			: null;
		if (!expertise) continue;
		const g = groups.get(expertise) ?? { exact: 0, tickers: [] };
		g.exact += row.load / eff;
		g.tickers.push(t);
		groups.set(expertise, g);
	}

	const ranked = [...groups].sort((a, b) => b[1].exact - a[1].exact);
	const kept = ranked
		.filter(([, g]) => g.exact >= SPLIT_MIN_BUILDINGS - EPS)
		.slice(0, SPLIT_MAX_BASES);
	if (!kept.length)
		return {
			expertise: [ranked[0]?.[0] ?? null],
			baseOf: Object.fromEntries(steps.map((t) => [t, BASE_IDS[0]])),
		};

	const baseOf: Record<string, string> = Object.fromEntries(
		steps.map((t) => [t, BASE_IDS[0]])
	);
	kept.forEach(([, g], i) => {
		for (const t of g.tickers) baseOf[t] = BASE_IDS[i];
	});
	return { expertise: kept.map(([name]) => name), baseOf };
}

export interface IChainRouteMaterial {
	ticker: string;
	perDay: number;
}

export interface IChainRoute {
	/** a base id or an exchange code */
	from: string;
	to: string;
	materials: IChainRouteMaterial[];
	/** t per day */
	weight: number;
	/** m³ per day */
	volume: number;
	/** null when a system is unknown */
	jumps: number | null;
}

/**
 * What ships every day: links between bases, bought inputs from the CX
 * to the bases that use them, targets and sold byproducts to the CX.
 * Demand covered by byproducts ships from the bases that produce them.
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {ReadonlyMap<string, Material>} materials Materials by ticker
 * @param {(from: string, to: string) => number | null} jumps Jumps between two route ends
 * @returns {IChainRoute[]} Routes, between bases first
 */
export function chainShipping(
	result: IChainResult,
	materials: ReadonlyMap<string, Material>,
	jumps: (from: string, to: string) => number | null
): IChainRoute[] {
	const isBase = (end: string) => result.bases.some((b) => b.id === end);
	// Universe prices name no exchange to ship to
	const cx = (code: string | null | undefined) =>
		code && code !== "UNIVERSE" ? code : "CX";
	const byproduct = new Map(result.byproducts.map((b) => [b.ticker, b]));

	/** where a material comes from, as shares of its demand */
	const sourcesOf = (t: string): [string, number][] => {
		const row = result.rows[t];
		const gross = row.perDay + row.covered;
		if (gross <= EPS) return [];
		const own = row.source === "buy" ? cx(row.exchange) : row.base!;
		const list: [string, number][] = [[own, row.perDay / gross]];
		const from = byproduct.get(t)?.fromAmounts ?? {};
		const total = Object.values(from).reduce((s, q) => s + q, 0);
		if (row.covered > EPS && total > 0)
			for (const [p, q] of Object.entries(from))
				list.push([
					result.rows[p].base!,
					((row.covered / gross) * q) / total,
				]);
		return list;
	};

	const routes = new Map<string, Map<string, number>>();
	const add = (from: string, to: string, ticker: string, q: number) => {
		if (from === to || q <= EPS) return;
		const key = `${from}>${to}`;
		const route = routes.get(key) ?? new Map<string, number>();
		route.set(ticker, (route.get(ticker) ?? 0) + q);
		routes.set(key, route);
	};

	for (const l of result.links) {
		const to = result.rows[l.consumer]?.base;
		if (!to) continue;
		for (const [from, share] of sourcesOf(l.input))
			add(from, to, l.input, l.perDay * share);
	}
	for (const t of result.order) {
		const row = result.rows[t];
		if (!row.target) continue;
		for (const [from, share] of sourcesOf(t))
			add(from, cx(row.exchange), t, row.targetPerDay * share);
	}
	for (const b of result.byproducts) {
		const total = Object.values(b.fromAmounts).reduce((s, q) => s + q, 0);
		if (b.sold <= EPS || total <= 0) continue;
		for (const [p, q] of Object.entries(b.fromAmounts))
			add(
				result.rows[p].base!,
				cx(b.market?.exchange),
				b.ticker,
				(b.sold * q) / total
			);
	}

	const rank = (from: string, to: string) =>
		isBase(from) && isBase(to) ? 0 : isBase(to) ? 1 : 2;
	return [...routes]
		.map(([key, list]): IChainRoute => {
			const [from, to] = key.split(">");
			const items = [...list].map(([ticker, perDay]) => ({
				ticker,
				perDay,
			}));
			let weight = 0;
			let volume = 0;
			for (const m of items) {
				weight += m.perDay * (materials.get(m.ticker)?.weight ?? 0);
				volume += m.perDay * (materials.get(m.ticker)?.volume ?? 0);
			}
			return {
				from,
				to,
				materials: items,
				weight,
				volume,
				jumps: jumps(from, to),
			};
		})
		.sort(
			(a, b) =>
				rank(a.from, a.to) - rank(b.from, b.to) ||
				a.from.localeCompare(b.from) ||
				a.to.localeCompare(b.to)
		);
}

export interface IChainPlanetFit {
	planet: PlanetSearchIndexEntry;
	built: number;
	area: number;
	/** extracted materials the planet doesn't have */
	missing: string[];
	/** a farm without fertility */
	noFarming: boolean;
	/** the program in use on it for this base */
	cogc: PlanCOGCProgram;
}

/** the site a row extracts on without a base planet: picked or typical */
function chainSite(
	ctx: IChainContext,
	input: IChainInput,
	ticker: string
): IChainExtractionSite | undefined {
	const options = ctx.extraction?.get(ticker);
	return (
		options?.sites.find((s) => s.planetId === input.planetId[ticker]) ??
		options?.typical
	);
}

/**
 * A base's steps solved on every planet: built buildings, area with
 * habs, core module and STO, missing resources and farming. Demand stays
 * the chain's; only efficiency and extraction rates change.
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context, with the planet index loaded
 * @param {string} baseId Base
 * @param {PlanetSearchIndexEntry[]} planets Planets to rank
 * @returns {IChainPlanetFit[]} One per planet, in the given order
 */
export function rankPlanets(
	result: IChainResult,
	input: IChainInput,
	ctx: IChainContext,
	baseId: string,
	planets: PlanetSearchIndexEntry[]
): IChainPlanetFit[] {
	const base = input.bases.find((b) => b.id === baseId) ?? input.bases[0];
	const solved = result.bases.find((b) => b.id === base.id);
	const setup = solved && { lux: solved.lux, experts: solved.experts };
	const eff = Math.max(input.efficiency, 1) / 100;
	const rows = result.order
		.map((t) => result.rows[t])
		.filter((r) => r.base === base.id && r.buildingTicker);
	const footprints = new Map<string, IChainFootprint>();

	return planets.map((planet) => {
		const cogc = baseCOGC(base, planet, ctx.now);
		const exact = new Map<string, number>();
		const missing: string[] = [];
		let noFarming = false;

		for (const row of rows) {
			let ticker = row.buildingTicker!;
			let work = row.load;
			if (row.source === "extract") {
				const onPlanet = ctx.extraction
					?.get(row.ticker)
					?.sites.find(
						(s) => s.planetId === planet.planet_natural_id
					);
				if (!onPlanet) missing.push(row.ticker);
				const site = onPlanet ?? chainSite(ctx, input, row.ticker);
				const rate = site ? extractorRate(site) : 0;
				ticker = site?.buildingTicker ?? ticker;
				work = rate > 0 ? row.perDay / rate : 0;
			}
			const f = planetFactor(ctx, planet, cogc, ticker, setup);
			if (f <= 0) {
				noFarming = true;
				continue;
			}
			exact.set(ticker, (exact.get(ticker) ?? 0) + work / (eff * f));
		}

		const types = [...exact]
			.filter(([, n]) => n > EPS)
			.map(([ticker, n]) => ({
				ticker,
				exact: n,
				built: Math.max(1, Math.ceil(n - 1e-6)),
				expertise: ctx.buildings.get(ticker)?.expertise ?? null,
			}));
		// the habs only depend on what is built
		const key = types.map((t) => `${t.ticker}:${t.built}`).join(",");
		let fp = footprints.get(key);
		if (!fp) {
			fp = baseFootprint(ctx, types, setup?.lux);
			footprints.set(key, fp);
		}
		return {
			planet,
			built: fp.built,
			area: fp.area,
			missing,
			noFarming,
			cogc,
		};
	});
}

interface IRecipeLoad {
	recipeId: string;
	timeMs: number;
	/** buildings at 100 % */
	load: number;
}

/**
 * The smallest whole order amounts (at most 10 each) whose queue time
 * shares are within 5 % of the chain's; the closest when none is
 * @author jplacht
 *
 * @param {IRecipeLoad[]} recipes Recipes with their share of the work
 * @returns {number[]} Amount per recipe
 */
export function recipeAmounts(recipes: IRecipeLoad[]): number[] {
	const total = recipes.reduce((s, r) => s + r.load, 0);
	if (recipes.length <= 1 || total <= 0) return recipes.map(() => 1);
	const runs = recipes.map((r) => (r.timeMs > 0 ? r.load / r.timeMs : 0));
	const most = Math.max(...runs);

	let best: number[] = recipes.map(() => 1);
	let bestError = Infinity;
	for (let k = 1; k <= MAX_RECIPE_AMOUNT; k++) {
		const amounts = runs.map((r) =>
			Math.max(1, Math.round((k * r) / most))
		);
		const time = amounts.reduce((s, a, i) => s + a * recipes[i].timeMs, 0);
		const error = Math.max(
			...amounts.map((a, i) =>
				Math.abs(
					(a * recipes[i].timeMs) / time - recipes[i].load / total
				)
			)
		);
		if (error <= RECIPE_SHARE_TOLERANCE + EPS) return amounts;
		if (error < bestError) {
			bestError = error;
			best = amounts;
		}
	}
	return best;
}

/**
 * One plan per base with steps: its buildings and recipes, habs and one
 * STO, the base's COGC, permits, luxuries and experts; no HQ
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {Record<string, string>} names Plan name per base
 * @returns {{ base: string; data: PlanCreateData }[]} Drafts
 */
export function planDrafts(
	result: IChainResult,
	names: Record<string, string>
): { base: string; data: PlanCreateData }[] {
	return result.bases
		.filter((b) => b.materials.length && b.planet)
		.map((b) => ({ base: b.id, data: planDraft(result, b, names[b.id]) }));
}

function planDraft(
	result: IChainResult,
	base: IChainBaseResult,
	name: string
): PlanCreateData {
	const buildings = base.buildingTypes.map((type) => {
		const loads = new Map<string, IRecipeLoad>();
		for (const t of type.materials) {
			const row = result.rows[t];
			let recipe: IRecipeLoad | null = null;
			if (row.recipe)
				recipe = {
					recipeId: row.recipe.recipe_id,
					timeMs: row.recipe.time_ms,
					load: row.load,
				};
			else if (row.site && !row.notOnPlanet) {
				const kind = resourceBuildingTicker[row.site.buildingTicker];
				recipe = {
					recipeId: `${row.site.buildingTicker}#${t}`,
					timeMs: kind
						? calculateExtraction(kind, row.site.dailyExtraction)
								.timeMs
						: 0,
					load: row.load,
				};
			}
			if (!recipe) continue;
			const same = loads.get(recipe.recipeId);
			if (same) same.load += recipe.load;
			else loads.set(recipe.recipeId, recipe);
		}
		const list = [...loads.values()];
		const amounts = recipeAmounts(list);
		return {
			name: type.ticker,
			amount: type.built,
			active_recipes: list.map((r, i) => ({
				recipeid: r.recipeId,
				amount: amounts[i],
			})),
		};
	});

	return {
		plan_name: name,
		planet_natural_id: base.planet!.planet_natural_id,
		plan_permits_used: base.permits,
		plan_corphq: false,
		plan_cogc: base.cogc,
		plan_data: {
			experts: expertNames.map((type) => ({
				type,
				amount: base.experts[type],
			})),
			workforce: TIERS.map((type) => ({
				type,
				lux1: base.lux === "lux1" || base.lux === "both",
				lux2: base.lux === "lux2" || base.lux === "both",
			})),
			infrastructure: [
				...base.habs.map((h) => ({
					building: h.ticker as InfrastructureType,
					amount: h.amount,
				})),
				{ building: "STO", amount: 1 },
			],
			buildings,
		},
	};
}
