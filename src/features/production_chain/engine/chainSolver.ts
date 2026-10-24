// Engine
import { calculateExtraction } from "@/features/planning/calculations/extractionCalculations";
import { optimizeHabs } from "@/features/planning/calculations/habOptimization";
import {
	getBuildingConstructionMaterials,
	resourceBuildingTicker,
} from "@/features/planning/engine/buildings";
import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/engine/workforce.constants";
import { getMaterialIOTotalPrice, type PriceType } from "@/features/cx/priceBook";
import {
	MARKET_SHARE_AMBER,
	MARKET_SHARE_RED,
} from "@/features/cx/marketCheck.util";

// Types & Interfaces
import type {
	Exchange,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type { IInfrastructureCosts } from "@/features/cx/usePrice.types";
import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";
import type {
	ChainSource,
	IChainBuildingType,
	IChainByproduct,
	IChainContext,
	IChainCostParts,
	IChainExtractionSite,
	IChainHab,
	IChainInput,
	IChainLink,
	IChainMarketShare,
	IChainRecipeEffect,
	IChainResult,
	IChainRow,
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
	/** daily workforce upkeep, basic needs at CX price */
	upkeep: number;
	construction: number;
}

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

function buildingCosts(ctx: IChainContext, ticker: string): IBuildingCosts {
	const cache = cacheOf(ctx).buildings;
	let costs = cache.get(ticker);
	if (costs) return costs;

	const building = ctx.buildings.get(ticker);
	if (!building) costs = { upkeep: 0, construction: 0 };
	else {
		let upkeep = 0;
		for (const [type, key] of WORKFORCE) {
			const workers = building[key];
			if (!workers) continue;
			for (const need of WORKFORCE_CONSUMPTION_MAP[type])
				if (!need.lux1 && !need.lux2)
					upkeep += workers * need.need * buyPrice(ctx, need.ticker);
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
	cache.set(ticker, costs);
	return costs;
}

/** upkeep and wear of one building for one day */
function buildingDaily(ctx: IChainContext, ticker: string): number {
	const c = buildingCosts(ctx, ticker);
	return c.upkeep + c.construction / WEAR_DAYS;
}

/**
 * Cost per unit of one output of a recipe: inputs at their unit cost plus
 * the building's upkeep and wear for the run, shared between outputs by
 * CX value (by quantity when no output has a price)
 */
function recipeCost(
	ctx: IChainContext,
	recipe: Recipe,
	ticker: string,
	efficiency: number,
	unitCostOf: (ticker: string) => number
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
		(buildingDaily(ctx, recipe.building_ticker) * recipe.time_ms) /
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
function marketShare(
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
function extractorRate(site: IChainExtractionSite): number {
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
	efficiency: number
): number {
	const rate = extractorRate(site) * (Math.max(efficiency, 1) / 100);
	return rate > 0 ? buildingDaily(ctx, site.buildingTicker) / rate : 0;
}

interface IPassRow {
	perDay: number;
	covered: number;
	buildings: number;
}

interface IPass {
	rows: Map<string, IPassRow>;
	links: IChainLink[];
	byproducts: Map<string, number>;
	byproductFrom: Map<string, Set<string>>;
}

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

	const siteOf = (
		t: string
	): { site: IChainExtractionSite; typical: boolean } | null => {
		const options = ctx.extraction?.get(t);
		if (!options) return null;
		const picked = options.sites.find((s) => s.planetId === input.planetId[t]);
		return picked
			? { site: picked, typical: false }
			: { site: options.typical, typical: true };
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
			const covered = Math.min(gross, supply.get(t) ?? 0);
			const perDay = gross - covered;
			let buildings = 0;
			const source = sourceOf(t);

			if (source === "make") {
				const r = recipeOf(t);
				const out = r.outputs.find(
					(o) => o.material_ticker === t
				)!.material_amount;
				const runs = perDay / out;
				buildings = (runs * r.time_ms) / DAY_MS / efficiency;
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
					pass.byproducts.set(
						x,
						(pass.byproducts.get(x) ?? 0) + runs * o.material_amount
					);
					if (runs > EPS) {
						const from = pass.byproductFrom.get(x) ?? new Set();
						from.add(t);
						pass.byproductFrom.set(x, from);
					}
				}
			} else if (source === "extract") {
				const rate = rateOf(t);
				buildings = rate > 0 ? perDay / (rate * efficiency) : 0;
			}
			pass.rows.set(t, { perDay, covered, buildings });
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

	// unit costs, inputs first
	const unitCost = new Map<string, number>();
	const users = new Map<string, Set<string>>();
	for (const l of pass.links) {
		const u = users.get(l.input) ?? new Set();
		u.add(l.consumer);
		users.set(l.input, u);
	}

	const rows: Record<string, IChainRow> = {};
	for (const t of order) {
		const p = pass.rows.get(t)!;
		const source = sourceOf(t);
		const price = buyPrice(ctx, t);
		const isTarget = targetPerDay.has(t);
		let uc = 0;
		let costParts: IChainCostParts | null = null;
		let recipe: Recipe | null = null;
		let buildingTicker: string | null = null;
		let site: IChainExtractionSite | null = null;
		let typicalSite = false;

		if (source === "buy") uc = price;
		else if (source === "extract") {
			const s = siteOf(t);
			if (s) {
				site = s.site;
				typicalSite = s.typical;
				buildingTicker = s.site.buildingTicker;
				uc = extractionUnitCost(ctx, s.site, input.efficiency);
				costParts = { inputs: 0, upkeepWear: uc, share: 1 };
			}
		} else {
			recipe = recipeOf(t);
			buildingTicker = recipe.building_ticker;
			const cost = recipeCost(
				ctx,
				recipe,
				t,
				efficiency,
				(x) => unitCost.get(x) ?? buyPrice(ctx, x)
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
			source,
			target: isTarget,
			targetPerDay: targetPerDay.get(t) ?? 0,
			canMake: canMake(t),
			canExtract: canExtract(t),
			recipe,
			recipeCount: ctx.recipesByOutput.get(t)?.length ?? 0,
			defaultRecipeId: canMake(t) ? defaultRecipe(ctx, t, efficiency) : null,
			buildingTicker,
			buildings: p.buildings,
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
				source !== "buy" &&
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
		byproducts.push({
			ticker,
			produced,
			used,
			sold,
			from: [...(pass.byproductFrom.get(ticker) ?? [])],
			sellPrice: sellPrice(ctx, ticker),
			market: sold > EPS ? marketShare(ctx, ticker, sold, "SELL") : null,
		});
	}

	// building types share capacity across recipes
	const types = new Map<string, IChainBuildingType>();
	for (const t of order) {
		const row = rows[t];
		if (!row.buildingTicker || row.buildings <= EPS) continue;
		const type = types.get(row.buildingTicker) ?? {
			ticker: row.buildingTicker,
			exact: 0,
			built: 0,
			materials: [],
			expertise: ctx.buildings.get(row.buildingTicker)?.expertise ?? null,
		};
		type.exact += row.buildings;
		type.materials.push(t);
		types.set(row.buildingTicker, type);
	}
	const buildingTypes = [...types.values()];
	for (const type of buildingTypes)
		type.built = Math.max(1, Math.ceil(type.exact - 1e-6));
	buildingTypes.sort((a, b) => b.built - a.built || b.exact - a.exact);

	return {
		order,
		rows,
		links: pass.links,
		byproducts,
		buildingTypes,
		totals: totalsOf(ctx, rows, order, targetPerDay, byproducts, buildingTypes),
		warnings: {
			cheaper: order.filter((t) => rows[t].cheaper),
			thin: order.filter(
				(t) => rows[t].source === "buy" && rows[t].market?.level
			),
			cycles,
		},
	};
}

function totalsOf(
	ctx: IChainContext,
	rows: Record<string, IChainRow>,
	order: string[],
	targetPerDay: Map<string, number>,
	byproducts: IChainByproduct[],
	buildingTypes: IChainBuildingType[]
): IChainResult["totals"] {
	const workforce: Record<WorkforceType, number> = {
		pioneer: 0,
		settler: 0,
		technician: 0,
		engineer: 0,
		scientist: 0,
	};
	const expertise: Record<string, number> = {};
	const materials = new Map<string, number>();
	let area = 0;
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

	for (const type of buildingTypes) {
		built += type.built;
		exact += type.exact;
		addConstruction(type.ticker, type.built);
		upkeep += type.built * buildingCosts(ctx, type.ticker).upkeep;
		const building = ctx.buildings.get(type.ticker);
		if (building)
			for (const [name, key] of WORKFORCE)
				workforce[name] += building[key] * type.built;
		if (type.expertise)
			expertise[type.expertise] =
				(expertise[type.expertise] ?? 0) + type.built;
	}

	// habitation for the built buildings' workforce, no area limit
	const habs: IChainHab[] = [];
	const areaBefore = area;
	if (Object.values(workforce).some((w) => w > 0)) {
		const costs = { STO: 0, STA: 0, STE: 0, STV: 0, STW: 0 } as Record<
			string,
			number
		>;
		for (const hab of HABS)
			costs[hab] = ctx.buildings.has(hab)
				? buildingCosts(ctx, hab).construction
				: 1e15;
		const required = Object.fromEntries(
			WORKFORCE.map(([name]) => [
				name,
				{
					name,
					required: workforce[name],
					capacity: 0,
					left: 0,
					lux1: false,
					lux2: false,
					efficiency: 1,
				},
			])
		) as IWorkforceRecord;
		const solution = optimizeHabs(
			"auto",
			costs as IInfrastructureCosts,
			required,
			Number.MAX_SAFE_INTEGER
		);
		if (solution.status === "optimal")
			for (const [ticker, amount] of solution.variables) {
				if (amount <= 0) continue;
				const before = area;
				addConstruction(ticker, amount);
				habs.push({ ticker, amount, area: area - before });
			}
	}

	let bought = 0;
	let boughtCount = 0;
	for (const t of order) {
		const row = rows[t];
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
	const wear = construction / WEAR_DAYS;
	const profit = outputValue - bought - upkeep - wear;

	return {
		targetsValue,
		byproductsValue,
		outputValue,
		bought,
		boughtCount,
		upkeep,
		wear,
		profit,
		built,
		exact,
		area,
		habArea: area - areaBefore,
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
		habs,
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
