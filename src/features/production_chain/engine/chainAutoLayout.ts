// Engine
import {
	BASE_IDS,
	chainShipping,
	cogcFits,
	pieceOf,
	rankPlanets,
} from "@/features/production_chain/engine/chainBases";
import {
	baseCOGC,
	baseFootprint,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type {
	ChainBaseShare,
	ChainMaxArea,
	IChainBase,
	IChainContext,
	IChainInput,
	IChainResult,
	IChainRow,
} from "@/features/production_chain/engine/chainSolver.types";

/**
 * # Auto layout
 *
 * Lays a solved chain out into bases a player could build: one expertise
 * each, up to the max base size, planets picked for COGC first, then
 * closeness. Greedy, no optimiser. The rules are documented in
 * docs/features/production_chain.md.
 */

const EPS = 1e-9;
export const DEFAULT_MAX_AREA: ChainMaxArea = 500;
export const MAX_AREAS: ChainMaxArea[] = [500, 750, 1000];
/** an expertise group this large gets bases of its own */
const GROUP_MIN_BUILDINGS = 1.5;
/** steps this small are bought when a whole building costs more */
const BUY_HINT_BUILDINGS = 0.2;
/** jumps assumed when the pathfinder doesn't know a system */
const UNKNOWN_JUMPS = 50;
/** fit into N bases stops at this precision, units per day */
const FIT_PRECISION = 0.01;
const FIT_MAX_DOUBLINGS = 12;

export interface IChainLayoutOptions {
	/** a base's name from its expertise, null for a mixed base */
	nameOf: (expertise: string | null) => string;
	/** jumps between two systems, null when unknown */
	jumps?: (from: string, to: string) => number | null;
	/** planets the user already has a base on */
	ownBases?: ReadonlySet<string>;
	/** systems of the selected empire's planets */
	empireSystems?: string[];
}

/**
 * A step so small that its whole building costs more per unit than
 * buying it on the CX
 * @author jplacht
 *
 * @param {IChainRow} row Row
 * @returns {boolean} Buy it
 */
export function buyHint(row: IChainRow): boolean {
	if (row.source !== "make" || row.target || !row.costParts) return false;
	if (row.buildings <= EPS || row.buildings >= BUY_HINT_BUILDINGS)
		return false;
	if (row.price <= 0) return false;
	// upkeep per unit grows from the used share to the whole building
	const whole =
		row.costParts.inputs + row.costParts.upkeepWear / row.buildings;
	return whole > row.price + EPS;
}

/** a step's built buildings: all of it, or a split step's counts */
const builtOf = (row: IChainRow) =>
	Math.max(1, Math.ceil(row.buildings - 1e-6));

interface IDraft {
	expertise: string | null;
	/** built buildings per step */
	counts: Map<string, number>;
}

/**
 * Packs the chain's steps into bases: expertise groups fill bases up to
 * the max area (steps split by whole buildings where needed), small
 * groups join the base they ship most with
 */
function packBases(
	result: IChainResult,
	ctx: IChainContext,
	maxArea: number
): IDraft[] {
	const steps = result.order
		.map((t) => result.rows[t])
		.filter((r) => r.buildingTicker && r.buildings > EPS);
	const expertiseOf = (r: IChainRow) =>
		ctx.buildings.get(r.buildingTicker!)?.expertise ?? null;
	const rowOf = (t: string) => result.rows[t];

	const areaOf = (counts: Map<string, number>): number => {
		const types = new Map<
			string,
			{
				ticker: string;
				exact: number;
				built: number;
				expertise: string | null;
			}
		>();
		for (const [t, n] of counts) {
			const row = rowOf(t);
			const ticker = row.buildingTicker!;
			const type = types.get(ticker) ?? {
				ticker,
				exact: 0,
				built: 0,
				expertise: expertiseOf(row),
			};
			type.exact += (row.buildings * n) / builtOf(row);
			types.set(ticker, type);
		}
		for (const type of types.values())
			type.built = Math.max(1, Math.ceil(type.exact - 1e-6));
		return baseFootprint(ctx, [...types.values()]).area;
	};
	const fits = (d: IDraft, t: string, n: number, cap = maxArea) => {
		const next = new Map(d.counts);
		next.set(t, (next.get(t) ?? 0) + n);
		return areaOf(next) <= cap + EPS;
	};
	const put = (d: IDraft, t: string, n: number) =>
		d.counts.set(t, (d.counts.get(t) ?? 0) + n);

	const groups = new Map<string, { exact: number; rows: IChainRow[] }>();
	for (const r of steps) {
		const e = expertiseOf(r) ?? "";
		const g = groups.get(e) ?? { exact: 0, rows: [] };
		g.exact += r.buildings;
		g.rows.push(r);
		groups.set(e, g);
	}
	const ranked = [...groups].sort((a, b) => b[1].exact - a[1].exact);

	const drafts: IDraft[] = [];
	const open = (expertise: string | null): IDraft | null => {
		if (drafts.length >= BASE_IDS.length) return null;
		const d: IDraft = { expertise, counts: new Map() };
		drafts.push(d);
		return d;
	};

	// expertise groups, first fit decreasing over the group's bases; a
	// group the max size splits apart fills bases up to the largest size
	// instead, one fuller base beats several alike
	const largest = MAX_AREAS.at(-1)!;
	const small: IChainRow[] = [];
	for (const [expertise, g] of ranked) {
		if (g.exact < GROUP_MIN_BUILDINGS - EPS || !expertise) {
			small.push(...g.rows);
			continue;
		}
		const packGroup = (cap: number): IDraft[] => {
			const own: IDraft[] = [];
			for (const r of [...g.rows].sort(
				(a, b) => b.buildings - a.buildings
			)) {
				let left = builtOf(r);
				// ponytail: extraction steps stay whole, a piece on another
				// planet would need that planet's own rate; split them if a
				// measured chain needs it
				const least = r.source === "extract" ? left : 1;
				for (const d of own) {
					let k = left;
					while (k >= least && !fits(d, r.ticker, k, cap)) k--;
					if (k < least) k = 0;
					if (k > 0) {
						put(d, r.ticker, k);
						left -= k;
					}
					if (!left) break;
				}
				while (left > 0) {
					// a new base takes at least one building; at the cap the
					// rest goes over the last one
					const fresh = open(expertise);
					const d = fresh ?? own.at(-1) ?? drafts.at(-1);
					if (!d) break;
					let k = left;
					if (fresh) {
						own.push(fresh);
						while (k > least && !fits(d, r.ticker, k, cap)) k--;
					}
					put(d, r.ticker, k);
					left -= k;
				}
			}
			return own;
		};
		const own = packGroup(maxArea);
		if (own.length > 1 && maxArea < largest) {
			drafts.splice(drafts.length - own.length);
			packGroup(largest);
		}
	}

	// small groups: to the base they ship most t/day with, where it fits
	const weightOf = (t: string) => ctx.materials.get(t)?.weight ?? 0;
	const linked = (r: IChainRow, d: IDraft) =>
		result.links.reduce((s, l) => {
			const other =
				l.input === r.ticker
					? l.consumer
					: l.consumer === r.ticker
						? l.input
						: null;
			return other && d.counts.has(other)
				? s + l.perDay * weightOf(l.input)
				: s;
		}, 0);
	const total = (r: IChainRow) =>
		result.links
			.filter((l) => l.input === r.ticker || l.consumer === r.ticker)
			.reduce((s, l) => s + l.perDay * weightOf(l.input), 0);
	for (const r of small.sort((a, b) => total(b) - total(a))) {
		const n = builtOf(r);
		const ranked = drafts
			.map((d, i) => ({ d, w: linked(r, d), i }))
			.sort((a, b) => b.w - a.w || a.i - b.i);
		const target =
			ranked.find((c) => fits(c.d, r.ticker, n))?.d ??
			open(null) ??
			ranked[0]?.d;
		if (target) put(target, r.ticker, n);
	}
	return drafts;
}

/** the next free base letters */
function freeIds(bases: IChainBase[], n: number): string[] {
	return BASE_IDS.filter((id) => !bases.some((b) => b.id === id)).slice(0, n);
}

/** names, numbered when a name is taken */
function nameBases(
	drafts: { expertise: string | null }[],
	nameOf: (expertise: string | null) => string,
	taken: string[] = []
): string[] {
	const names = [...taken];
	return drafts.map((d) => {
		const name = nameOf(d.expertise);
		let unique = name;
		for (let n = 2; names.includes(unique); n++) unique = `${name} ${n}`;
		names.push(unique);
		return unique;
	});
}

/** baseOf from the drafts: one base = whole step, else the counts */
function draftShares(
	drafts: IDraft[],
	ids: string[]
): Record<string, ChainBaseShare> {
	const baseOf: Record<string, ChainBaseShare> = {};
	drafts.forEach((d, i) => {
		for (const [t, n] of d.counts) (baseOf[t] ??= {})[ids[i]] = n;
	});
	for (const share of Object.values(baseOf)) {
		const [only, ...more] = Object.keys(share);
		if (!more.length) share[only] = 1;
	}
	return baseOf;
}

/** steps bought because a whole building costs more */
function withBuys(input: IChainInput, ctx: IChainContext): IChainInput {
	const result = solveChain(input, ctx);
	const buy = result.order.filter((t) => buyHint(result.rows[t]));
	if (!buy.length) return input;
	const source = { ...input.source };
	for (const t of buy) source[t] = "buy";
	return { ...input, source };
}

/**
 * The chain laid out into bases without planets
 * @author jplacht
 *
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context
 * @param {(expertise: string | null) => string} nameOf Base name
 * @returns {IChainInput} Input with the new bases, assignments and buys
 */
export function layoutBases(
	input: IChainInput,
	ctx: IChainContext,
	nameOf: (expertise: string | null) => string
): IChainInput {
	const maxArea = input.maxArea ?? DEFAULT_MAX_AREA;
	// solved in one plain base, so the planets of old bases don't count
	const plain: IChainInput = {
		...input,
		bases: [{ id: BASE_IDS[0], name: "", planetId: null, cogc: "auto" }],
		baseOf: {},
	};
	const bought = withBuys(plain, ctx);
	const drafts = packBases(solveChain(bought, ctx), ctx, maxArea);
	if (!drafts.length)
		return {
			...bought,
			bases: [{ ...plain.bases[0], name: nameOf(null) }],
		};
	const ids = BASE_IDS.slice(0, drafts.length);
	const names = nameBases(drafts, nameOf);
	return {
		...bought,
		bases: drafts.map((_, i) => ({
			id: ids[i],
			name: names[i],
			planetId: null,
			cogc: "auto",
		})),
		baseOf: draftShares(drafts, ids),
	};
}

/** t/day shipped between two bases, both directions */
function baseWeights(
	result: IChainResult,
	ctx: IChainContext
): Map<string, number> {
	const w = new Map<string, number>();
	for (const r of chainShipping(result, ctx.materials, () => null)) {
		const key = [r.from, r.to].sort().join(">");
		w.set(key, (w.get(key) ?? 0) + r.weight);
	}
	return w;
}

/**
 * Picks planets for bases, largest first: planets where the base can be
 * built (resources, fertility, area), then the ones running a COGC
 * program the base benefits from, then fewest jumps weighted by t/day to
 * bases already placed and to the empire's planets. A planet with no
 * free plot or an own base, or one picked already, is skipped.
 * @author jplacht
 *
 * @param {IChainInput} input Chain input, its other bases' planets taken
 * @param {IChainContext} ctx Chain context, with the planet index loaded
 * @param {string[]} ids Bases to place
 * @param {IChainLayoutOptions} opts Jumps, own bases and empire
 * @returns {IChainInput} Input with the planets set
 */
export function pickPlanets(
	input: IChainInput,
	ctx: IChainContext,
	ids: string[],
	opts: Omit<IChainLayoutOptions, "nameOf">
): IChainInput {
	if (!ctx.planets) return input;
	const maxArea = input.maxArea ?? DEFAULT_MAX_AREA;
	const result = solveChain(input, ctx);
	const weights = baseWeights(result, ctx);
	const used = new Set(
		input.bases
			.filter((b) => !ids.includes(b.id) && b.planetId)
			.map((b) => b.planetId!)
	);
	const candidates = [...ctx.planets.values()].filter((p) => {
		if (opts.ownBases?.has(p.planet_natural_id)) return false;
		if (p.plots_total == null) return true;
		return p.plots_total - (p.plots_used ?? 0) > 0;
	});
	const placed = new Map<string, PlanetSearchIndexEntry>();
	for (const b of input.bases)
		if (b.planetId && used.has(b.planetId)) {
			const p = ctx.planets.get(b.planetId);
			if (p) placed.set(b.id, p);
		}

	const jumps = (a: string, b: string) =>
		a === b ? 0 : (opts.jumps?.(a, b) ?? UNKNOWN_JUMPS);
	const empire = opts.empireSystems ?? [];
	const areaOf = (id: string) =>
		result.bases.find((b) => b.id === id)?.area ?? 0;
	const order = [...ids]
		.filter((id) =>
			result.bases.some((b) => b.id === id && b.materials.length)
		)
		.sort((a, b) => areaOf(b) - areaOf(a));

	const planetOf: Record<string, string> = {};
	for (const id of order) {
		const free = candidates.filter((p) => !used.has(p.planet_natural_id));
		const tickers =
			result.bases
				.find((b) => b.id === id)
				?.buildingTypes.map((t) => t.ticker) ?? [];
		const linked = [...placed].map(([other, p]) => ({
			p,
			w: weights.get([id, other].sort().join(">")) ?? 0,
		}));
		const wSum = linked.reduce((s, l) => s + l.w, 0);
		const choice = input.bases.find((b) => b.id === id)!;
		// a base the layout filled past the max size may stay that size
		const limit = Math.min(
			MAX_AREAS.at(-1)!,
			Math.max(maxArea, areaOf(id))
		);
		// cheap keys first: COGC fit (per program), then distance (per
		// system); planets without a fitting program only when none with
		// one can build the base
		const fitsProgram = new Map<PlanCOGCProgram, boolean>();
		const cogcOf = (planet: PlanetSearchIndexEntry) => {
			const program = baseCOGC(choice, planet, ctx.now);
			let ok = fitsProgram.get(program);
			if (ok === undefined) {
				ok = cogcFits(ctx, program, tickers);
				fitsProgram.set(program, ok);
			}
			return ok;
		};
		const bySystem = new Map<string, number>();
		const distanceOf = (sys: string) => {
			let d = bySystem.get(sys);
			if (d === undefined) {
				const toBases = wSum
					? linked.reduce(
							(s, l) => s + l.w * jumps(sys, l.p.system_id),
							0
						) / wSum
					: 0;
				const toEmpire = empire.length
					? empire.reduce((s, e) => s + jumps(sys, e), 0) /
						empire.length
					: 0;
				d = toBases + toEmpire;
				bySystem.set(sys, d);
			}
			return d;
		};
		const withCogc = free.filter(cogcOf);
		const fitting = new Set(withCogc);
		const without = free.filter((p) => !fitting.has(p));
		let best: PlanetSearchIndexEntry | undefined;
		let first: PlanetSearchIndexEntry | undefined;
		for (const group of [withCogc, without]) {
			if (best || !group.length) continue;
			const cheap = group
				.map((planet) => ({
					planet,
					distance: distanceOf(planet.system_id),
				}))
				.sort(
					(a, b) =>
						a.distance - b.distance ||
						a.planet.planet_natural_id.localeCompare(
							b.planet.planet_natural_id
						)
				);
			first ??= cheap[0].planet;
			// solved tie group by tie group until one can build the base
			for (let i = 0; i < cheap.length && !best;) {
				let j = i + 1;
				while (
					j < cheap.length &&
					Math.abs(cheap[j].distance - cheap[i].distance) < EPS
				)
					j++;
				const fits = rankPlanets(
					result,
					input,
					ctx,
					id,
					cheap.slice(i, j).map((c) => c.planet)
				).filter(
					(f) =>
						!f.missing.length &&
						!f.noFarming &&
						f.area <= limit + EPS
				);
				fits.sort((a, b) => a.area - b.area);
				best = fits[0]?.planet;
				i = j;
			}
		}
		// nothing can build it: the first by COGC and distance
		best ??= first;
		if (!best) continue;
		planetOf[id] = best.planet_natural_id;
		used.add(best.planet_natural_id);
		placed.set(id, best);
	}
	return {
		...input,
		bases: input.bases.map((b) =>
			b.id in planetOf ? { ...b, planetId: planetOf[b.id] } : b
		),
	};
}

/**
 * Auto layout: buys tiny steps, packs the chain into bases and picks
 * their planets
 * @author jplacht
 *
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context
 * @param {IChainLayoutOptions} opts Names, jumps, own bases and empire
 * @returns {IChainInput} Laid out input
 */
export function autoLayout(
	input: IChainInput,
	ctx: IChainContext,
	opts: IChainLayoutOptions
): IChainInput {
	const laid = layoutBases(input, ctx, opts.nameOf);
	const placed = pickPlanets(
		laid,
		ctx,
		laid.bases.map((b) => b.id),
		opts
	);
	// COGC and experts can push more steps under the hint: buy those too,
	// dropping bases left without steps
	const bought = withBuys(placed, ctx);
	const kept = solveChain(bought, ctx).bases.filter(
		(b) => b.materials.length
	);
	const out = kept.length
		? {
				...bought,
				bases: bought.bases.filter((b) =>
					kept.some((k) => k.id === b.id)
				),
			}
		: bought;
	return mergeAlike(out, ctx);
}

/** the expertise with the most exact buildings in a base */
export function mainExpertise(result: IChainResult, id: string): string | null {
	const exact = new Map<string, number>();
	for (const t of result.buildingTypes)
		if (t.base === id && t.expertise)
			exact.set(t.expertise, (exact.get(t.expertise) ?? 0) + t.exact);
	return [...exact].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Bases of one expertise merged once their planets are known (COGC and
 * experts shrink them), while the merged base fits the largest base size
 * and loses no resource or fertility
 */
function mergeAlike(input: IChainInput, ctx: IChainContext): IChainInput {
	const largest = MAX_AREAS.at(-1)!;
	let result = solveChain(input, ctx);
	// pairs that didn't fit stay apart until one of them changes
	const failed = new Set<string>();
	for (let merged = true; merged;) {
		merged = false;
		const used = result.bases.filter((b) => b.materials.length);
		for (let i = 0; i < used.length && !merged; i++)
			for (let j = i + 1; j < used.length && !merged; j++) {
				const [a, b] = [used[i], used[j]];
				const e = mainExpertise(result, a.id);
				if (!e || e !== mainExpertise(result, b.id)) continue;
				if (failed.has(`${a.id}>${b.id}`)) continue;
				const next = mergeBases(result, input, b.id, a.id);
				const after = solveChain(next, ctx);
				const m = after.bases.find((x) => x.id === a.id)!;
				if (
					m.area > largest + EPS ||
					m.notOnPlanet.length >
						a.notOnPlanet.length + b.notOnPlanet.length ||
					m.noFarming.length > a.noFarming.length + b.noFarming.length
				) {
					failed.add(`${a.id}>${b.id}`);
					continue;
				}
				for (const k of [...failed])
					if (k.split(">").includes(a.id)) failed.delete(k);
				[input, result, merged] = [next, after, true];
			}
	}
	// letters without gaps again
	const id = new Map(input.bases.map((b, i) => [b.id, BASE_IDS[i]]));
	return {
		...input,
		bases: input.bases.map((b) => ({ ...b, id: id.get(b.id)! })),
		baseOf: Object.fromEntries(
			Object.entries(input.baseOf).map(([t, s]) => [
				t,
				Object.fromEntries(
					Object.entries(s)
						.filter(([b]) => id.has(b))
						.map(([b, n]) => [id.get(b)!, n])
				),
			])
		),
	};
}

/** every step's counts, implicit ones whole in the first base */
function fullShares(
	result: IChainResult,
	input: IChainInput
): Record<string, ChainBaseShare> {
	// bought and had steps keep their base for when they are made again
	const baseOf: Record<string, ChainBaseShare> = Object.fromEntries(
		Object.entries(input.baseOf).map(([t, s]) => [t, { ...s }])
	);
	for (const t of result.order) {
		const row = result.rows[t];
		if (!row.shares.length) continue;
		const own = input.baseOf[t];
		baseOf[t] =
			own && Object.keys(own).length > 1
				? { ...own }
				: { [row.shares[0].base]: builtOf(row) };
	}
	return baseOf;
}

/** single pieces back to "whole" */
function tidy(
	baseOf: Record<string, ChainBaseShare>
): Record<string, ChainBaseShare> {
	const out: Record<string, ChainBaseShare> = {};
	for (const [t, share] of Object.entries(baseOf)) {
		const ids = Object.keys(share).filter((id) => share[id] > 0);
		if (!ids.length) continue;
		out[t] =
			ids.length === 1
				? { [ids[0]]: 1 }
				: Object.fromEntries(ids.map((id) => [id, share[id]]));
	}
	return out;
}

/**
 * Merges a base into another: its pieces join the target, which keeps
 * its planet
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {IChainInput} input Chain input
 * @param {string} from Base to remove
 * @param {string} into Base that stays
 * @returns {IChainInput} Input
 */
export function mergeBases(
	result: IChainResult,
	input: IChainInput,
	from: string,
	into: string
): IChainInput {
	if (from === into || !input.bases.some((b) => b.id === into)) return input;
	const baseOf = fullShares(result, input);
	for (const share of Object.values(baseOf))
		if (share[from]) {
			share[into] = (share[into] ?? 0) + share[from];
			delete share[from];
		}
	return {
		...input,
		bases: input.bases.filter((b) => b.id !== from),
		baseOf: tidy(baseOf),
	};
}

/**
 * Separates a base: one new base per further expertise, or half of its
 * buildings for a base of one expertise. New bases get planets.
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context
 * @param {string} id Base to separate
 * @param {IChainLayoutOptions} opts Names, jumps, own bases and empire
 * @returns {IChainInput | null} Input, null when there is nothing to separate
 */
export function separateBase(
	result: IChainResult,
	input: IChainInput,
	ctx: IChainContext,
	id: string,
	opts: IChainLayoutOptions
): IChainInput | null {
	const baseOf = fullShares(result, input);
	const rows = result.order
		.map((t) => result.rows[t])
		.filter((r) => r.buildingTicker && pieceOf(r, id) > 0);
	const expertiseOf = (r: IChainRow) =>
		ctx.buildings.get(r.buildingTicker!)?.expertise ?? null;

	const groups = new Map<
		string | null,
		{ exact: number; rows: IChainRow[] }
	>();
	for (const r of rows) {
		const e = expertiseOf(r);
		const g = groups.get(e) ?? { exact: 0, rows: [] };
		g.exact += r.buildings * pieceOf(r, id);
		g.rows.push(r);
		groups.set(e, g);
	}
	const ranked = [...groups].sort((a, b) => b[1].exact - a[1].exact);
	const moves: { expertise: string | null; take: (t: string) => number }[] =
		[];

	if (ranked.length > 1)
		for (const [expertise, g] of ranked.slice(1))
			moves.push({
				expertise,
				take: (t) =>
					g.rows.some((r) => r.ticker === t) ? baseOf[t][id] : 0,
			});
	else if (rows.length) {
		// one expertise: half the buildings, steps balanced by size
		const take = new Map<string, number>();
		if (rows.length === 1) {
			const n = baseOf[rows[0].ticker][id];
			if (n < 2) return null;
			take.set(rows[0].ticker, n - Math.floor(n / 2));
		} else {
			let stay = 0;
			let go = 0;
			for (const r of [...rows].sort(
				(a, b) => b.buildings - a.buildings
			)) {
				const size = r.buildings * pieceOf(r, id);
				if (go < stay) {
					take.set(r.ticker, baseOf[r.ticker][id]);
					go += size;
				} else stay += size;
			}
		}
		moves.push({
			expertise: ranked[0][0],
			take: (t) => take.get(t) ?? 0,
		});
	}
	const ids = freeIds(input.bases, moves.length);
	if (!ids.length) return null;

	moves.slice(0, ids.length).forEach((m, i) => {
		for (const r of rows) {
			const n = m.take(r.ticker);
			if (!n) continue;
			const share = baseOf[r.ticker];
			share[id] -= n;
			share[ids[i]] = (share[ids[i]] ?? 0) + n;
		}
	});
	const names = nameBases(
		moves,
		opts.nameOf,
		input.bases.map((b) => b.name)
	);
	const next: IChainInput = {
		...input,
		bases: [
			...input.bases,
			...ids.map((newId, i): IChainBase => ({
				id: newId,
				name: names[i],
				planetId: null,
				cogc: "auto",
			})),
		],
		baseOf: tidy(baseOf),
	};
	return pickPlanets(next, ctx, ids, opts);
}

/**
 * The largest rate, all targets scaled alike, whose layout uses at most
 * n bases, none over the largest base size
 * @author jplacht
 *
 * @param {IChainInput} input Chain input
 * @param {IChainContext} ctx Chain context
 * @param {number} n Bases
 * @returns {IChainInput} Input with the targets scaled, null when even the smallest rate doesn't fit
 */
export function fitBases(
	input: IChainInput,
	ctx: IChainContext,
	n: number
): IChainInput | null {
	const largest = Math.max(0, ...input.targets.map((t) => t.perDay));
	if (largest <= 0 || n < 1) return null;
	const scaled = (s: number): IChainInput => ({
		...input,
		targets: input.targets.map((t) => ({
			...t,
			perDay: Math.max(
				FIT_PRECISION,
				Math.floor(((t.perDay * s) / FIT_PRECISION) * (1 + 1e-9)) *
					FIT_PRECISION
			),
		})),
	});
	const fits = (s: number) => {
		const laid = layoutBases(scaled(s), ctx, () => "");
		const bases = solveChain(laid, ctx).bases.filter(
			(b) => b.materials.length
		);
		return bases.length <= n && bases.every((b) => !b.overArea);
	};

	let lo = FIT_PRECISION / largest;
	if (!fits(lo)) return null;
	let hi = 1;
	for (let i = 0; i < FIT_MAX_DOUBLINGS && fits(hi); i++) {
		lo = hi;
		hi *= 2;
	}
	while ((hi - lo) * largest > FIT_PRECISION) {
		const mid = (lo + hi) / 2;
		if (fits(mid)) lo = mid;
		else hi = mid;
	}
	// the bisection stops within a step: try the next whole 0.01s
	const step = FIT_PRECISION / largest;
	let next = (Math.floor((lo * largest) / FIT_PRECISION + 1e-9) + 1) * step;
	while (next < hi + step && fits(next)) {
		lo = next;
		next += step;
	}
	return scaled(lo);
}
