// Engine
import {
	baseFootprint,
	bestExpertSplit,
	buildingConstruction,
	defaultRecipe,
	expertTypeOf,
	extractorRate,
	MAX_AREA,
	marketShare,
	noExperts,
	planetFactor,
	recipeCost,
	runningCOGC,
	workerUpkeep,
} from "@/features/production_chain/engine/chainSolver";
import { BASE_IDS } from "@/features/production_chain/engine/chainBases";
import { resourceBuildingTicker } from "@/features/planning/engine/buildings";
import {
	calculateBuildingWorkforceEfficiency,
	calculateExpertBonus,
	expertNames,
} from "@/features/planning/engine/efficiency";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type {
	ExpertType,
	PlanCOGCProgram,
	WorkforceType,
} from "@/features/api/schemas/planningData.schemas";
import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";
import type {
	ChainExperts,
	ChainLux,
	IChainBase,
	IChainContext,
	IChainInput,
} from "@/features/production_chain/engine/chainSolver.types";
import type {
	CheckDefault,
	CheckKind,
	ICheckBase,
	ICheckChain,
	ICheckChainRow,
	ICheckExpertsFinding,
	ICheckFinding,
	ICheckFixFinding,
	ICheckInput,
	ICheckLocationFinding,
	ICheckLuxFinding,
	ICheckOption,
	ICheckPlan,
	ICheckPlots,
	ICheckResult,
	ICheckSold,
	ICheckStep,
} from "@/features/production_chain/engine/chainCheck.types";

/**
 * # Chain check
 *
 * Checks how an empire makes what it sells: its plans' steps (one per plan
 * building and recipe) as the plan engine calculated them, followed back
 * from the chosen targets, each compared with the chain planner's choices.
 * Pure and synchronous. The rules are documented in
 * docs/features/production_chain.md.
 */

const DAY_MS = 86_400_000;
const EPS = 1e-6;
const WEAR_DAYS = 180;
/** a recipe must be this much cheaper per unit */
const RECIPE_MIN_SAVING = 0.03;
/** a planet must suit a step this much better */
const LOCATION_MIN_RATIO = 1.1;
const CORE_MODULE = "CM";
const TIERS: WorkforceType[] = [
	"pioneer",
	"settler",
	"technician",
	"engineer",
	"scientist",
];
const LUX1 = 1 + 1 / 11;
const LUX2 = 1 + 2 / 13;

/**
 * A planet's plots, null when unknown
 * @author jplacht
 *
 * @param {PlanetSearchIndexEntry} planet Planet
 * @returns {ICheckPlots | null} Free and total plots, ghost sites
 */
export function planetPlots(
	planet: PlanetSearchIndexEntry
): ICheckPlots | null {
	if (planet.plots_total == null) return null;
	return {
		total: planet.plots_total,
		free: planet.plots_total - (planet.plots_used ?? 0),
		ghost: planet.supports_ghost_sites === true,
	};
}

/**
 * Base letters: A … Z, then AA, AB, …
 * @author jplacht
 *
 * @param {number} i Index
 * @returns {string} Letter
 */
export function baseLetter(i: number): string {
	const head = Math.floor(i / 26);
	const letter = String.fromCharCode(65 + (i % 26));
	return head ? baseLetter(head - 1) + letter : letter;
}

/**
 * A plan's luxuries: lux 1 or 2 when every tier it employs gets them
 * @author jplacht
 *
 * @param {IWorkforceRecord} workforce Plan workforce
 * @returns {ChainLux} Luxuries
 */
export function planLux(workforce: IWorkforceRecord): ChainLux {
	const used = TIERS.filter((t) => workforce[t].required > 0);
	const l1 = used.length > 0 && used.every((t) => workforce[t].lux1);
	const l2 = used.length > 0 && used.every((t) => workforce[t].lux2);
	return l1 && l2 ? "both" : l1 ? "lux1" : l2 ? "lux2" : "none";
}

const add = (rec: Record<string, number>, key: string, n: number) => {
	rec[key] = (rec[key] ?? 0) + n;
};

/** the plan's steps: one per building and active recipe that runs */
function planSteps(ctx: IChainContext, plan: ICheckPlan): ICheckStep[] {
	const steps: ICheckStep[] = [];
	for (const b of plan.result.production.buildings) {
		if (!(b.totalBatchTime > 0) || !Number.isFinite(b.totalBatchTime))
			continue;
		const batchRuns = (DAY_MS * b.amount) / b.totalBatchTime;
		// both are material values: negative
		const daily = -b.workforceDailyCost - b.constructionCost / WEAR_DAYS;
		for (const ar of b.activeRecipes) {
			if (ar.amount <= 0) continue;
			const runs = ar.amount * batchRuns;
			const outputs: Record<string, number> = {};
			const inputs: Record<string, number> = {};
			for (const o of ar.recipe.outputs)
				add(outputs, o.material_ticker, o.material_amount * runs);
			for (const i of ar.recipe.inputs)
				add(inputs, i.material_ticker, i.material_amount * runs);
			const ticker = Object.keys(outputs).sort(
				(x, y) =>
					outputs[y] * ctx.prices.getPrice(y, "SELL") -
					outputs[x] * ctx.prices.getPrice(x, "SELL")
			)[0];
			steps.push({
				key: `${plan.id}:${b.name}:${ticker}`,
				base: plan.id,
				building: b.name,
				ticker,
				recipe: ar.recipe,
				extraction: b.name in resourceBuildingTicker,
				buildings: b.amount * ar.dailyShare,
				built: b.amount,
				efficiency: b.totalEfficiency,
				elements: b.efficiencyElements,
				outputs,
				inputs,
				perDay: outputs[ticker],
				daily,
				inputCost: 0,
				unitCost: 0,
				margin: 0,
				inChain: false,
			});
		}
	}
	return steps;
}

/** a step's cost share per output: by CX value, by quantity without prices */
function shareOf(ctx: IChainContext, step: ICheckStep, ticker: string): number {
	let value = 0;
	let amount = 0;
	for (const [t, q] of Object.entries(step.outputs)) {
		value += q * ctx.prices.getPrice(t, "SELL");
		amount += q;
	}
	// the ticker is one of the step's outputs
	const q = step.outputs[ticker];
	return value > 0
		? (q * ctx.prices.getPrice(ticker, "SELL")) / value
		: q / amount;
}

/**
 * Checks an empire's plans against the chains of its targets
 * @author jplacht
 *
 * @param {ICheckInput} input Plans, targets and settings
 * @param {IChainContext} ctx Chain context with the planet index
 * @returns {ICheckResult} Bases, findings, chains and totals
 */
export function checkEmpire(
	input: ICheckInput,
	ctx: IChainContext
): ICheckResult {
	const buy = (t: string) => ctx.prices.getPrice(t, "BUY");
	const sell = (t: string) => ctx.prices.getPrice(t, "SELL");
	const planetOf = (id: string) => ctx.planets?.get(id) ?? null;

	const stepsOf = new Map<string, ICheckStep[]>();
	const all: ICheckStep[] = [];
	for (const plan of input.plans) {
		const steps = planSteps(ctx, plan);
		stepsOf.set(plan.id, steps);
		all.push(...steps);
	}

	// net per material: production and workforce over all plans
	const net: Record<string, number> = {};
	for (const plan of input.plans)
		for (const m of plan.result.materialio) add(net, m.ticker, m.delta);
	const producers = new Map<string, ICheckStep[]>();
	for (const s of all)
		for (const [t, q] of Object.entries(s.outputs))
			if (q > EPS) producers.set(t, [...(producers.get(t) ?? []), s]);
	const made = (t: string) => producers.has(t);

	// unit cost per material made in the empire; a loop falls back to the price
	const unitCosts = new Map<string, number>();
	const stepCost = (s: ICheckStep) =>
		Object.entries(s.inputs).reduce(
			(sum, [t, q]) => sum + q * unitIn(t),
			0
		) +
		s.daily * s.buildings;
	const unitCost = (t: string): number => {
		const known = unitCosts.get(t);
		if (known !== undefined) return known;
		unitCosts.set(t, buy(t));
		let cost = 0;
		let out = 0;
		// only made materials get here
		for (const s of producers.get(t)!) {
			cost += stepCost(s) * shareOf(ctx, s, t);
			out += s.outputs[t];
		}
		const uc = cost / out;
		unitCosts.set(t, uc);
		return uc;
	};
	const unitIn = (t: string) => (made(t) ? unitCost(t) : buy(t));

	for (const s of all) {
		s.inputCost = Object.entries(s.inputs).reduce(
			(sum, [t, q]) => sum + q * unitIn(t),
			0
		);
		// a step that runs makes some of its main output
		s.unitCost =
			((s.inputCost + s.daily * s.buildings) *
				shareOf(ctx, s, s.ticker)) /
			s.perDay;
		s.margin =
			Object.entries(s.outputs).reduce(
				(sum, [t, q]) => sum + q * sell(t),
				0
			) - s.inputCost;
	}

	const sold: ICheckSold[] = Object.entries(net)
		.filter(([t, q]) => q > EPS && sell(t) > 0)
		.map(([ticker, perDay]) => ({
			ticker,
			perDay,
			value: perDay * sell(ticker),
		}))
		.sort((a, b) => b.value - a.value);

	// chains: from each target through the inputs of the steps that make it
	const chains: ICheckChain[] = [];
	for (const target of input.targets) {
		if (!made(target)) continue;
		const rows: ICheckChainRow[] = [];
		const seen = new Set<string>();
		const visit = (t: string, depth: number) => {
			if (seen.has(t)) return;
			seen.add(t);
			const steps = producers.get(t) ?? [];
			rows.push({
				ticker: t,
				depth,
				made: steps.reduce((sum, s) => sum + s.outputs[t], 0),
				steps,
				unitCost: unitIn(t),
				price: buy(t),
				chainDefault: chainDefault(t, steps),
			});
			const inputs = new Set(steps.flatMap((s) => Object.keys(s.inputs)));
			for (const i of inputs) visit(i, depth + 1);
		};
		visit(target, 0);
		const steps = rows.flatMap((r) => r.steps);
		for (const s of steps) s.inChain = true;
		chains.push({
			target,
			sold: Math.max(net[target], 0),
			value: Math.max(net[target], 0) * sell(target),
			bases: [...new Set(steps.map((s) => s.base))],
			rows,
		});
	}

	function chainDefault(t: string, steps: ICheckStep[]): CheckDefault {
		const recipes = ctx.recipesByOutput.get(t) ?? [];
		const id = recipes.length ? defaultRecipe(ctx, t, 1) : null;
		const recipe = recipes.find((r) => r.recipe_id === id);
		if (steps.some((s) => s.extraction))
			return unitCost(t) <= buy(t)
				? { kind: "extract" }
				: { kind: "buy_cheaper" };
		if (steps.length)
			return !recipe || steps.some((s) => s.recipe.recipe_id === id)
				? { kind: "same" }
				: { kind: "recipe", recipe };
		if (!recipe) return { kind: "raw" };
		const cost = recipeCost(ctx, recipe, t, 1, buy).unit;
		return cost < buy(t)
			? { kind: "make", recipe, cost }
			: { kind: "bought" };
	}

	const targets = new Set(input.targets);
	const empirePlanets = new Set(input.plans.map((p) => p.planetId));
	const runningCache = new Map<string, PlanCOGCProgram>();
	const runningOf = (planet: PlanetSearchIndexEntry) => {
		let r = runningCache.get(planet.planet_natural_id);
		if (r === undefined) {
			r = runningCOGC(planet, ctx.now);
			runningCache.set(planet.planet_natural_id, r);
		}
		return r;
	};
	// COGC and fertility factor per planet and building, the same for every step
	const factors = new Map<string, number>();
	const factorOf = (p: PlanetSearchIndexEntry, building: string) => {
		const key = `${p.planet_natural_id}|${building}`;
		let v = factors.get(key);
		if (v === undefined) {
			v = planetFactor(ctx, p, runningOf(p), building);
			factors.set(key, v);
		}
		return v;
	};
	// a program's factor for a building, planet aside
	const neutral = { fertility: 0 } as PlanetSearchIndexEntry;
	const programFactor = (program: PlanCOGCProgram, building: string) =>
		planetFactor(ctx, neutral, program, building);

	// extraction sites per material and planet
	const siteOf = (t: string, planetId: string) =>
		ctx.extraction?.get(t)?.sites.find((x) => x.planetId === planetId);

	const bases: ICheckBase[] = [];
	const findings: ICheckFinding[] = [];

	for (const plan of input.plans) {
		const steps = stepsOf.get(plan.id)!;
		const planet = planetOf(plan.planetId);
		const running = planet ? runningOf(planet) : "---";
		const checked = steps.some((s) => s.inChain);
		const own: ICheckFinding[] = [];
		const positive = (s: ICheckStep) => Math.max(s.margin, 0);

		// expert weights: the margin per expertise
		const weights: Partial<Record<ExpertType, number>> = {};
		for (const s of steps) {
			const type = expertTypeOf(ctx.buildings.get(s.building)?.expertise);
			if (type) weights[type] = (weights[type] ?? 0) + positive(s);
		}
		const bestExperts = bestExpertSplit(weights);
		const experts = noExperts();
		for (const n of expertNames) experts[n] = plan.result.experts[n].amount;

		if (checked && planet) {
			// plan fixes
			if (plan.cogc !== "---" && plan.cogc !== running) {
				const hit = steps.filter((s) =>
					s.elements.some((e) => e.efficiencyType === "COGC")
				);
				const delta = hit.reduce((sum, s) => {
					const v = s.elements
						.filter((e) => e.efficiencyType === "COGC")
						.reduce((p, e) => p * e.value, 1);
					return sum + positive(s) * (1 / v - 1);
				}, 0);
				if (hit.length) {
					const v = hit[0].elements
						.filter((e) => e.efficiencyType === "COGC")
						.reduce((p, e) => p * e.value, 1);
					own.push(
						fix(
							"lost",
							plan,
							plan.cogc,
							running,
							hit,
							delta,
							1 / v - 1
						)
					);
				}
			}
			if (running !== "---" && running !== plan.cogc) {
				const hit = steps.filter(
					(s) => programFactor(running, s.building) > 1 + EPS
				);
				const delta = hit.reduce(
					(sum, s) =>
						sum +
						positive(s) * (programFactor(running, s.building) - 1),
					0
				);
				if (hit.length)
					own.push(
						fix(
							"missed",
							plan,
							plan.cogc,
							running,
							hit,
							delta,
							programFactor(running, hit[0].building) - 1
						)
					);
			}

			for (const s of steps) {
				if (!s.inChain) continue;
				own.push(...recipeFindings(s));
				const price = buy(s.ticker);
				if (
					!targets.has(s.ticker) &&
					price > 0 &&
					s.unitCost > price + EPS
				)
					own.push({
						id: `buy:${s.key}`,
						kind: "buy",
						base: plan.id,
						step: s,
						delta: (s.unitCost - price) * s.perDay,
						construction: 0,
						payback: null,
						cost: s.unitCost,
						price,
						market: marketShare(ctx, s.ticker, s.perDay, "BUY"),
					});
				const move = locationFinding(plan, planet, s);
				if (move) own.push(move);
			}

			if (input.setup) {
				const lux = luxFinding(plan, steps);
				if (lux) own.push(lux);
				const gain = steps.reduce((sum, s) => {
					const type = expertTypeOf(
						ctx.buildings.get(s.building)?.expertise
					);
					if (!type) return sum;
					const ratio =
						(1 + calculateExpertBonus(bestExperts[type])) /
						(1 + calculateExpertBonus(experts[type]));
					return sum + positive(s) * (ratio - 1);
				}, 0);
				if (gain > EPS) {
					const f: ICheckExpertsFinding = {
						id: `experts:${plan.id}`,
						kind: "setup",
						setup: "experts",
						base: plan.id,
						step: null,
						delta: gain,
						construction: 0,
						payback: null,
						experts: bestExperts,
						now: experts,
					};
					own.push(f);
				}
			}
		}

		// fixes and the user's picks always show
		const shown = own.filter(
			(f) =>
				f.kind === "fix" ||
				(f.kind === "location" && f.picked) ||
				Math.abs(f.delta) >= input.min
		);
		// alternatives on one step don't add up: the best one counts
		const best = new Map<string, number>();
		let gain = 0;
		for (const f of shown) {
			if (f.step && f.kind !== "fix")
				best.set(
					f.step.key,
					Math.max(best.get(f.step.key) ?? 0, f.delta)
				);
			else gain += f.delta;
		}
		for (const v of best.values()) gain += v;

		const effs = steps.map((s) => s.efficiency);
		bases.push({
			id: plan.id,
			plan,
			planet,
			running,
			lux: planLux(plan.result.workforce),
			experts,
			bestExperts,
			steps,
			checked,
			targets: chains
				.filter((c) => c.bases.includes(plan.id))
				.map((c) => c.target),
			buildings: plan.result.production.buildings.reduce(
				(sum, b) => sum + b.amount,
				0
			),
			efficiency: {
				min: effs.length ? Math.min(...effs) : 0,
				max: effs.length ? Math.max(...effs) : 0,
			},
			free: MAX_AREA - plan.result.area.areaUsed,
			verdict: !checked
				? "out"
				: shown.some((f) => f.kind === "fix")
					? "fix"
					: shown.length
						? "imp"
						: "ok",
			findings: shown,
			gain,
		});
		findings.push(...shown);
	}

	function fix(
		kind: "lost" | "missed",
		plan: ICheckPlan,
		program: PlanCOGCProgram,
		running: PlanCOGCProgram,
		steps: ICheckStep[],
		delta: number,
		factor: number
	): ICheckFixFinding {
		return {
			id: `fix:${kind}:${plan.id}`,
			kind: "fix",
			fix: kind,
			base: plan.id,
			step: null,
			delta,
			construction: 0,
			payback: null,
			program,
			running,
			steps,
			factor,
		};
	}

	function recipeFindings(s: ICheckStep): ICheckFinding[] {
		if (s.extraction || s.efficiency <= 0) return [];
		// every recipe here outputs the step's material
		const unit = (r: ICheckStep["recipe"]) => {
			const out = r.outputs.find(
				(o) => o.material_ticker === s.ticker
			)!.material_amount;
			const inputs = r.inputs.reduce(
				(sum, i) => sum + i.material_amount * unitIn(i.material_ticker),
				0
			);
			return (
				(inputs + (s.daily * r.time_ms) / DAY_MS / s.efficiency) / out
			);
		};
		const now = s.recipe.outputs.length === 1 ? unit(s.recipe) : s.unitCost;
		let best: { recipe: ICheckStep["recipe"]; cost: number } | null = null;
		for (const r of ctx.recipesByOutput.get(s.ticker)!) {
			if (
				r.recipe_id === s.recipe.recipe_id ||
				r.building_ticker !== s.building ||
				r.outputs.length !== 1
			)
				continue;
			const cost = unit(r);
			if (
				cost < now * (1 - RECIPE_MIN_SAVING) &&
				(!best || cost < best.cost)
			)
				best = { recipe: r, cost };
		}
		if (!best) return [];
		const out = best.recipe.outputs[0].material_amount;
		const need =
			(s.perDay * best.recipe.time_ms) / (DAY_MS * s.efficiency * out);
		const extra = Math.max(0, Math.ceil(need - s.buildings - EPS));
		const construction = extra * buildingConstruction(ctx, s.building);
		const delta = (now - best.cost) * s.perDay;
		return [
			{
				id: `recipe:${s.key}`,
				kind: "recipe",
				base: s.base,
				step: s,
				delta,
				construction,
				payback:
					construction > 0 && delta > 0 ? construction / delta : null,
				recipe: best.recipe,
				now,
				alt: best.cost,
				need,
				extra,
			},
		];
	}

	function locationFinding(
		plan: ICheckPlan,
		planet: PlanetSearchIndexEntry,
		s: ICheckStep
	): ICheckLocationFinding | null {
		const building = ctx.buildings.get(s.building)!;
		const expertise = building.expertise;
		const pf = (p: PlanetSearchIndexEntry) => {
			let v = factorOf(p, s.building);
			if (s.extraction) {
				const site = siteOf(s.ticker, p.planet_natural_id);
				v *= site ? extractorRate(site) : 0;
			}
			return v;
		};
		const here = pf(planet);
		if (here <= 0) return null;

		const n = Math.max(1, Math.ceil(s.buildings - EPS));
		const moved = n * buildingConstruction(ctx, s.building);
		let fresh: { area: number; construction: number } | null = null;
		const newBase = () =>
			(fresh ??= (() => {
				const fp = baseFootprint(ctx, [
					{ ticker: s.building, built: n, exact: n, expertise },
				]);
				return {
					area: fp.area,
					construction:
						fp.construction +
						buildingConstruction(ctx, CORE_MODULE),
				};
			})());

		const options: ICheckOption[] = [];
		const option = (
			p: PlanetSearchIndexEntry,
			ratio: number,
			ownBase: ICheckPlan | null
		) => {
			const gain = (ratio - 1) * Math.max(s.margin, 0);
			const area = ownBase ? n * building.area_cost : newBase().area;
			const free = ownBase
				? MAX_AREA - ownBase.result.area.areaUsed
				: null;
			const construction = ownBase ? moved : newBase().construction;
			const plots = ownBase ? null : planetPlots(p);
			const noPlot = plots !== null && plots.free <= 0;
			const payback = gain > EPS ? construction / gain : null;
			const site = s.extraction
				? siteOf(s.ticker, p.planet_natural_id)
				: null;
			const running = runningOf(p);
			options.push({
				planet: p,
				own: ownBase?.id ?? null,
				ratio,
				gain,
				construction,
				payback,
				area,
				free,
				fits: ownBase ? area <= free! + EPS : area <= MAX_AREA + EPS,
				plots,
				full: noPlot && !plots!.ghost,
				ghostOnly: noPlot && plots!.ghost,
				slow: payback === null || payback > input.payback,
				running,
				runsProgram: !!expertise && running === expertise,
				rate: site ? extractorRate(site) : null,
			});
		};

		// one option per planet: the first base on it
		const listed = new Set([plan.planetId]);
		for (const other of input.plans) {
			const p = planetOf(other.planetId);
			if (!p || listed.has(other.planetId)) continue;
			listed.add(other.planetId);
			const ratio = pf(p) / here;
			if (ratio >= LOCATION_MIN_RATIO - EPS) option(p, ratio, other);
		}
		for (const p of ctx.planets!.values()) {
			if (empirePlanets.has(p.planet_natural_id)) continue;
			const ratio = pf(p) / here;
			if (ratio >= LOCATION_MIN_RATIO - EPS) option(p, ratio, null);
		}
		if (!options.length) return null;
		options.sort((a, b) => b.gain - a.gain || b.ratio - a.ratio);

		const ok = (o: ICheckOption) => o.fits && !o.full && !o.slow;
		const suggested = options.find(ok) ?? null;
		const pickId = input.picks[s.key];
		const picked = pickId
			? options.find((o) => o.planet.planet_natural_id === pickId)
			: undefined;
		const chosen = picked ?? suggested;
		if (!chosen) return null;
		return {
			id: `location:${s.key}`,
			kind: "location",
			base: plan.id,
			step: s,
			delta: chosen.gain,
			construction: chosen.construction,
			payback: chosen.payback,
			options,
			option: chosen,
			suggested,
			picked: !!picked,
			better: picked ? [] : options.slice(0, options.indexOf(chosen)),
			here,
			hereRate: s.extraction
				? extractorRate(siteOf(s.ticker, planet.planet_natural_id)!)
				: null,
			expertise,
		};
	}

	function luxFinding(
		plan: ICheckPlan,
		steps: ICheckStep[]
	): ICheckLuxFinding | null {
		const workforce = plan.result.workforce;
		const used = TIERS.filter((t) => workforce[t].required > 0);
		if (used.every((t) => workforce[t].lux1 && workforce[t].lux2))
			return null;
		const full = Object.fromEntries(
			TIERS.map((t) => {
				const w = workforce[t];
				return [
					t,
					{
						...w,
						lux1: true,
						lux2: true,
						efficiency:
							w.efficiency *
							(w.lux1 ? 1 : LUX1) *
							(w.lux2 ? 1 : LUX2),
					},
				];
			})
		) as IWorkforceRecord;
		let gain = 0;
		let weight = 0;
		let weighted = 0;
		for (const s of steps) {
			// a step runs, so its workforce factor is above 0
			const building = ctx.buildings.get(s.building)!;
			const now = calculateBuildingWorkforceEfficiency(
				building,
				workforce
			);
			const ratio =
				calculateBuildingWorkforceEfficiency(building, full) / now;
			gain += Math.max(s.margin, 0) * (ratio - 1);
			weight += s.buildings;
			weighted += s.buildings * (ratio - 1);
		}
		const cost = used.reduce(
			(sum, t) =>
				sum +
				workforce[t].required *
					(workerUpkeep(ctx, t, true, true) -
						workerUpkeep(
							ctx,
							t,
							workforce[t].lux1,
							workforce[t].lux2
						)),
			0
		);
		const delta = gain - cost;
		if (delta <= EPS) return null;
		return {
			id: `lux:${plan.id}`,
			kind: "setup",
			setup: "lux",
			base: plan.id,
			step: null,
			delta,
			construction: 0,
			payback: null,
			lux: planLux(workforce),
			gain,
			cost,
			factor: weighted / weight,
		};
	}

	findings.sort(
		(a, b) =>
			Number(b.kind === "fix") - Number(a.kind === "fix") ||
			b.delta - a.delta
	);

	const counts: Record<CheckKind, number> = {
		fix: 0,
		recipe: 0,
		buy: 0,
		location: 0,
		setup: 0,
	};
	for (const f of findings) counts[f.kind]++;
	const moves = findings.filter((f) => f.kind === "location");
	const checkedBases = bases.filter((b) => b.checked);
	const soldSet = new Set(sold.map((s) => s.ticker));

	return {
		bases,
		sold,
		net,
		chains,
		findings,
		totals: {
			profit: input.plans.reduce((sum, p) => sum + p.profit, 0),
			gain: bases.reduce((sum, b) => sum + b.gain, 0),
			checked: checkedBases.length,
			optimal: checkedBases.filter((b) => b.verdict === "ok").length,
			counts,
			setupGain: findings
				.filter((f) => f.kind === "setup")
				.reduce((sum, f) => sum + f.delta, 0),
			moveCost: moves.reduce((sum, f) => sum + f.construction, 0),
			moveGain: moves.reduce((sum, f) => sum + f.delta, 0),
		},
		unchecked: [
			...new Set(
				bases
					.filter((b) => !b.checked)
					.flatMap((b) => b.steps.map((s) => s.ticker))
					.filter((t) => soldSet.has(t) && !targets.has(t))
			),
		],
	};
}

/**
 * Plan a chain with a finding's change: the chain of the finding's
 * material at the empire's amount, its bases with their planets, COGC,
 * luxuries and experts, recipes and sources as planned
 * @author jplacht
 *
 * @param {ICheckResult} check Check result
 * @param {ICheckFinding} finding Recipe, buy or location finding
 * @returns {IChainInput | null} Chain input, null outside the chains
 */
export function tryInPlanner(
	check: ICheckResult,
	finding: ICheckFinding
): IChainInput | null {
	const step = finding.step;
	const chain = step
		? check.chains.find((c) => c.rows.some((r) => r.ticker === step.ticker))
		: undefined;
	if (!step || !chain) return null;

	const letters = new Map<string, string>();
	const chainBases: IChainBase[] = [];
	const addBase = (base: Omit<IChainBase, "id">, key: string) => {
		if (letters.has(key)) return letters.get(key)!;
		const id = BASE_IDS[chainBases.length];
		if (!id) return BASE_IDS[0];
		chainBases.push({ id, ...base });
		letters.set(key, id);
		return id;
	};
	const fromPlan = (id: string) => {
		const b = check.bases.find((x) => x.id === id)!;
		const experts: ChainExperts = {};
		for (const [type, n] of Object.entries(b.experts))
			if (n > 0) experts[type as ExpertType] = n;
		return addBase(
			{
				name: b.plan.name,
				planetId: b.plan.planetId,
				cogc: b.plan.cogc === "---" ? "none" : b.plan.cogc,
				lux: b.lux,
				experts,
			},
			id
		);
	};
	for (const id of chain.bases) fromPlan(id);

	const input: IChainInput = {
		targets: [{ ticker: chain.target, perDay: Math.max(chain.sold, EPS) }],
		efficiency: 100,
		rawSource: "buy",
		byproducts: "cover",
		source: {},
		recipeId: {},
		planetId: {},
		bases: chainBases,
		baseOf: {},
	};
	for (const row of chain.rows) {
		if (!row.steps.length) {
			if (row.chainDefault.kind !== "raw")
				input.source[row.ticker] = "buy";
			continue;
		}
		const main = [...row.steps].sort(
			(a, b) => b.outputs[row.ticker] - a.outputs[row.ticker]
		)[0];
		input.baseOf[row.ticker] = letters.get(main.base) ?? BASE_IDS[0];
		if (main.extraction) input.source[row.ticker] = "extract";
		else {
			input.source[row.ticker] = "make";
			input.recipeId[row.ticker] = main.recipe.recipe_id;
		}
	}

	if (finding.kind === "recipe")
		input.recipeId[step.ticker] = finding.recipe.recipe_id;
	else if (finding.kind === "buy") input.source[step.ticker] = "buy";
	else {
		// fixes and setup have no step: a location
		const o = (finding as ICheckLocationFinding).option;
		input.baseOf[step.ticker] = o.own
			? fromPlan(o.own)
			: addBase(
					{
						name: o.planet.planet_name,
						planetId: o.planet.planet_natural_id,
						cogc: "auto",
					},
					o.planet.planet_natural_id
				);
	}
	return input;
}
