/**
 * Planet search engine: pure functions over the planet search index.
 *
 * Every planet gets a bitmask of the filter dimensions it fails. Results
 * are the planets failing none; the facet count of an option only needs
 * the planets failing nothing but that option's own dimension, and only
 * that dimension is re-evaluated for them.
 */

// Util
import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
import { PlanetCOGCProgramTypeSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type {
	PlanetCOGCProgramType,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type {
	IPlanetSearchChip,
	IPlanetSearchContext,
	IPlanetSearchFacets,
	IPlanetSearchHint,
	IPlanetSearchNameNote,
	IPlanetSearchSection,
	IPlanetSearchSort,
} from "@/features/planet_search/planetSearch.types";
import {
	PlanetSearchCXSchema,
	PlanetSearchExtraSchema,
	PlanetSearchInfrastructureSchema,
	PlanetSearchSurfaceSchema,
	type PlanetSearchCX,
	type PlanetSearchExtra,
	type PlanetSearchFilter,
	type PlanetSearchInfrastructure,
	type PlanetSearchMaterialGroup,
	type PlanetSearchReference,
	type PlanetSearchSurface,
} from "@/features/planet_search/planetSearch.schemas";

export const SEARCH_EXTRAS = PlanetSearchExtraSchema.options;
export const SEARCH_INFRASTRUCTURE = PlanetSearchInfrastructureSchema.options;
export const SEARCH_CX = PlanetSearchCXSchema.options;
export const SEARCH_SURFACES = PlanetSearchSurfaceSchema.options;
export const SEARCH_COGC: PlanetCOGCProgramType[] =
	PlanetCOGCProgramTypeSchema.options.filter((o) => o !== "Invalid");
export const MAX_JUMPS = 30;

export function defaultFilter(): PlanetSearchFilter {
	return {
		text: "",
		materialGroups: [{ op: "any", materials: [] }],
		groupsOp: "all",
		minDaily: {},
		cogc: [],
		infrastructure: [],
		fertile: false,
		surface: ["rocky"],
		acceptedExtras: [],
		references: [],
		maxJumps: 10,
	};
}

const SEARCH_SECTIONS: IPlanetSearchSection[] = [
	"conditions",
	"extras",
	"cogc",
	"infrastructure",
];

/**
 * The section at its widest, the state hiding the fewest planets. Not
 * "everything ticked": a ticked COGC program or infrastructure narrows.
 * @author jplacht
 */
export function widenSection(
	filter: PlanetSearchFilter,
	section: IPlanetSearchSection
): PlanetSearchFilter {
	switch (section) {
		case "conditions":
			return { ...filter, surface: [...SEARCH_SURFACES], fertile: false };
		case "extras":
			return { ...filter, acceptedExtras: [...SEARCH_EXTRAS] };
		case "cogc":
			return { ...filter, cogc: [] };
		case "infrastructure":
			return { ...filter, infrastructure: [] };
	}
}

export function isSectionWide(
	filter: PlanetSearchFilter,
	section: IPlanetSearchSection
): boolean {
	switch (section) {
		case "conditions":
			return (
				!filter.fertile &&
				SEARCH_SURFACES.every((s) => filter.surface.includes(s))
			);
		case "extras":
			return SEARCH_EXTRAS.every((e) => filter.acceptedExtras.includes(e));
		case "cogc":
			return !filter.cogc.length;
		case "infrastructure":
			return !filter.infrastructure.length;
	}
}

/*
 * Small helpers shared with the UI
 */

export function toggle<T>(list: T[], value: T): T[] {
	return list.includes(value)
		? list.filter((v) => v !== value)
		: [...list, value];
}

export function refKey(ref: PlanetSearchReference): string {
	return ref.kind === "plan" ? `plan:${ref.planUuid}` : `cx:${ref.code}`;
}

export function toggleReference(
	filter: PlanetSearchFilter,
	ref: PlanetSearchReference
): PlanetSearchFilter {
	const key = refKey(ref);
	const has = filter.references.some((r) => refKey(r) === key);
	return {
		...filter,
		references: has
			? filter.references.filter((r) => refKey(r) !== key)
			: [...filter.references, ref],
	};
}

/** Drops minimums of materials no longer in any group */
function pruneMinDaily(filter: PlanetSearchFilter): PlanetSearchFilter {
	const used = new Set(filter.materialGroups.flatMap((g) => g.materials));
	const minDaily = Object.fromEntries(
		Object.entries(filter.minDaily).filter(([t]) => used.has(t))
	);
	return { ...filter, minDaily };
}

export function setGroups(
	filter: PlanetSearchFilter,
	groups: PlanetSearchMaterialGroup[]
): PlanetSearchFilter {
	return pruneMinDaily({
		...filter,
		materialGroups: groups.length ? groups : [{ op: "any", materials: [] }],
	});
}

export function addMaterial(
	filter: PlanetSearchFilter,
	groupIndex: number,
	ticker: string
): PlanetSearchFilter {
	return {
		...filter,
		materialGroups: filter.materialGroups.map((g, i) =>
			i === groupIndex && !g.materials.includes(ticker)
				? { ...g, materials: [...g.materials, ticker] }
				: g
		),
	};
}

/** Tickers found in the index, alphabetically */
export function indexMaterials(index: PlanetSearchIndexEntry[]): string[] {
	const set = new Set<string>();
	for (const p of index)
		for (const r of p.resources) set.add(r.material_ticker);
	return [...set].sort();
}

/** The program running at `now`, the index keeps ended ones until its rebuild */
export function activeProgram(
	planet: PlanetSearchIndexEntry,
	now: number
): PlanetCOGCProgramType | null {
	const running = planet.cogc_programs.find(
		(c) => c.start_epochms <= now && now <= c.end_epochms
	);
	return running?.program_type ?? null;
}

export function planetInfrastructure(
	planet: PlanetSearchIndexEntry
): PlanetSearchInfrastructure[] {
	const flags: [boolean, PlanetSearchInfrastructure][] = [
		[planet.has_localmarket, "LM"],
		[planet.has_chamberofcommerce, "COGC"],
		[planet.has_warehouse, "WAR"],
		[planet.has_administrationcenter, "ADM"],
		[planet.has_shipyard, "SHY"],
	];
	return flags.filter(([has]) => has).map(([, v]) => v);
}

/*
 * Prepared planets
 */

interface IPrepared {
	entry: PlanetSearchIndexEntry;
	res: Map<string, number>;
	extrasMask: number;
	infraMask: number;
	rocky: boolean;
	fertile: boolean;
	haystack: string;
}

const preparedCache = new WeakMap<PlanetSearchIndexEntry[], IPrepared[]>();

function extrasMaskOf(extras: PlanetSearchExtra[]): number {
	let mask = 0;
	for (const e of extras) mask |= 1 << SEARCH_EXTRAS.indexOf(e);
	return mask;
}

function infraMaskOf(infra: PlanetSearchInfrastructure[]): number {
	let mask = 0;
	for (const i of infra) mask |= 1 << SEARCH_INFRASTRUCTURE.indexOf(i);
	return mask;
}

function prepare(index: PlanetSearchIndexEntry[]): IPrepared[] {
	const cached = preparedCache.get(index);
	if (cached) return cached;

	const prepared = index.map((entry) => ({
		entry,
		res: new Map(
			entry.resources.map((r) => [r.material_ticker, r.daily_extraction])
		),
		extrasMask: extrasMaskOf(
			environmentExtras(entry)
				.map((e) => e.ticker)
				.filter((t): t is PlanetSearchExtra =>
					SEARCH_EXTRAS.includes(t as PlanetSearchExtra)
				)
		),
		infraMask: infraMaskOf(planetInfrastructure(entry)),
		rocky: entry.surface,
		fertile: entry.fertility > -1,
		haystack:
			`${entry.planet_natural_id} ${entry.planet_name}`.toLowerCase(),
	}));
	preparedCache.set(index, prepared);
	return prepared;
}

/*
 * Predicates, one per filter dimension
 */

type Predicate = (p: IPrepared) => boolean;

const DIMENSIONS = [
	"text",
	"materials",
	"cogc",
	"infrastructure",
	"fertile",
	"surface",
	"extras",
	"references",
] as const;
type Dimension = (typeof DIMENSIONS)[number];

const SECTION_DIMENSIONS: Record<IPlanetSearchSection, Dimension[]> = {
	conditions: ["surface", "fertile"],
	extras: ["extras"],
	cogc: ["cogc"],
	infrastructure: ["infrastructure"],
};

const PASS: Predicate = () => true;

function predicate(
	dim: Dimension,
	f: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): Predicate {
	switch (dim) {
		case "text": {
			const q = f.text.trim().toLowerCase();
			return q ? (p) => p.haystack.includes(q) : PASS;
		}
		case "materials": {
			const groups = f.materialGroups.filter((g) => g.materials.length);
			if (!groups.length) return PASS;
			const has = (p: IPrepared, t: string) => {
				const daily = p.res.get(t);
				return daily !== undefined && daily >= (f.minDaily[t] ?? 0);
			};
			const group = (p: IPrepared, g: PlanetSearchMaterialGroup) =>
				g.op === "all"
					? g.materials.every((t) => has(p, t))
					: g.materials.some((t) => has(p, t));
			return f.groupsOp === "any"
				? (p) => groups.some((g) => group(p, g))
				: (p) => groups.every((g) => group(p, g));
		}
		case "cogc": {
			if (!f.cogc.length) return PASS;
			const wanted = new Set(f.cogc);
			return (p) => {
				const active = activeProgram(p.entry, ctx.now);
				return active !== null && wanted.has(active);
			};
		}
		case "infrastructure": {
			const mask = infraMaskOf(f.infrastructure);
			return mask ? (p) => (p.infraMask & mask) === mask : PASS;
		}
		case "fertile":
			return f.fertile ? (p) => p.fertile : PASS;
		case "surface": {
			const rocky = f.surface.includes("rocky");
			const gaseous = f.surface.includes("gaseous");
			return (p) => (p.rocky ? rocky : gaseous);
		}
		case "extras": {
			const rejected = ~extrasMaskOf(f.acceptedExtras);
			return (p) => (p.extrasMask & rejected) === 0;
		}
		case "references": {
			// unknown references (another player's plan) are ignored
			const maps = f.references
				.map((r) => ctx.refJumps(r))
				.filter((m): m is Map<string, number> => m !== undefined);
			if (!maps.length) return PASS;
			return (p) =>
				maps.every((m) => {
					const j = m.get(p.entry.system_id);
					return j !== undefined && j <= f.maxJumps;
				});
		}
	}
}

function failMasks(
	prepared: IPrepared[],
	f: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): Uint8Array {
	const preds = DIMENSIONS.map((d) => predicate(d, f, ctx));
	const masks = new Uint8Array(prepared.length);
	for (let i = 0; i < prepared.length; i++) {
		let m = 0;
		for (let d = 0; d < preds.length; d++)
			if (!preds[d](prepared[i])) m |= 1 << d;
		masks[i] = m;
	}
	return masks;
}

function countIn(
	pool: IPrepared[],
	f: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): number {
	const preds = DIMENSIONS.map((d) => predicate(d, f, ctx));
	let n = 0;
	for (const p of pool) if (preds.every((pred) => pred(p))) n++;
	return n;
}

/**
 * Planets matching the filter, in index order
 * @author jplacht
 */
export function filterPlanets(
	index: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): PlanetSearchIndexEntry[] {
	const prepared = prepare(index);
	const masks = failMasks(prepared, filter, ctx);
	return prepared.filter((_, i) => masks[i] === 0).map((p) => p.entry);
}

/**
 * Result counts if each panel option were toggled
 * @author jplacht
 *
 * @param materials Material options (usually indexMaterials)
 * @param references Reference options (the empire's plans and the CX)
 */
export function facetCounts(
	index: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext,
	materials: string[],
	references: PlanetSearchReference[]
): IPlanetSearchFacets {
	const prepared = prepare(index);
	const masks = failMasks(prepared, filter, ctx);

	// planets failing nothing but `dim`, per dimension
	const candidates = (dim: Dimension): IPrepared[] => {
		const others = ~(1 << DIMENSIONS.indexOf(dim));
		return prepared.filter((_, i) => (masks[i] & others) === 0);
	};
	const counter = (dim: Dimension) => {
		const pool = candidates(dim);
		return (toggled: PlanetSearchFilter): number => {
			const pred = predicate(dim, toggled, ctx);
			let n = 0;
			for (const p of pool) if (pred(p)) n++;
			return n;
		};
	};

	const countMaterials = counter("materials");
	const countSurface = counter("surface");
	const countExtras = counter("extras");
	const countCOGC = counter("cogc");
	const countInfra = counter("infrastructure");
	const countRefs = counter("references");

	// a widened section passes every planet on its own dimensions
	const countAny = (section: IPlanetSearchSection): number => {
		let own = 0;
		for (const d of SECTION_DIMENSIONS[section])
			own |= 1 << DIMENSIONS.indexOf(d);
		let n = 0;
		for (const m of masks) if ((m & ~own) === 0) n++;
		return n;
	};

	return {
		any: Object.fromEntries(
			SEARCH_SECTIONS.map((s) => [s, countAny(s)])
		) as Record<IPlanetSearchSection, number>,
		materials: filter.materialGroups.map((g, gi) =>
			Object.fromEntries(
				materials
					.filter((t) => !g.materials.includes(t))
					.map((t) => [t, countMaterials(addMaterial(filter, gi, t))])
			)
		),
		surface: Object.fromEntries(
			SEARCH_SURFACES.map((s) => [
				s,
				countSurface({ ...filter, surface: toggle(filter.surface, s) }),
			])
		) as Record<PlanetSearchSurface, number>,
		fertile: counter("fertile")({ ...filter, fertile: !filter.fertile }),
		extras: Object.fromEntries(
			SEARCH_EXTRAS.map((e) => [
				e,
				countExtras({
					...filter,
					acceptedExtras: toggle(filter.acceptedExtras, e),
				}),
			])
		) as Record<PlanetSearchExtra, number>,
		cogc: Object.fromEntries(
			SEARCH_COGC.map((c) => [
				c,
				countCOGC({ ...filter, cogc: toggle(filter.cogc, c) }),
			])
		),
		infrastructure: Object.fromEntries(
			SEARCH_INFRASTRUCTURE.map((v) => [
				v,
				countInfra({
					...filter,
					infrastructure: toggle(filter.infrastructure, v),
				}),
			])
		) as Record<PlanetSearchInfrastructure, number>,
		references: Object.fromEntries(
			references.map((r) => [
				refKey(r),
				countRefs(toggleReference(filter, r)),
			])
		),
	};
}

/**
 * Active constraints as removable chips, in panel order
 * @author jplacht
 */
export function activeChips(filter: PlanetSearchFilter): IPlanetSearchChip[] {
	const def = defaultFilter();
	const chips: IPlanetSearchChip[] = [];
	const f = filter;

	if (f.text.trim())
		chips.push({
			kind: "text",
			key: "text",
			text: f.text.trim(),
			remove: { ...f, text: "" },
		});

	const groups = f.materialGroups.filter((g) => g.materials.length);
	if (f.groupsOp === "any" && groups.length > 1)
		chips.push({
			kind: "groups_any",
			key: "groups",
			groups,
			remove: setGroups(f, []),
		});
	else
		f.materialGroups.forEach((g, i) => {
			if (!g.materials.length) return;
			chips.push({
				kind: "group",
				key: `group:${i}`,
				group: g,
				remove: setGroups(
					f,
					f.materialGroups.filter((_, j) => j !== i)
				),
			});
		});

	if (f.cogc.length)
		chips.push({
			kind: "cogc",
			key: "cogc",
			programs: f.cogc,
			remove: { ...f, cogc: [] },
		});

	f.infrastructure.forEach((v) =>
		chips.push({
			kind: "infrastructure",
			key: `infra:${v}`,
			value: v,
			remove: { ...f, infrastructure: toggle(f.infrastructure, v) },
		})
	);

	if (f.fertile)
		chips.push({
			kind: "fertile",
			key: "fertile",
			remove: { ...f, fertile: false },
		});

	if (f.surface.join() !== def.surface.join())
		chips.push({
			kind: "surface",
			key: "surface",
			surface: f.surface,
			remove: { ...f, surface: def.surface },
		});

	if (f.acceptedExtras.length)
		chips.push({
			kind: "extras",
			key: "extras",
			extras: f.acceptedExtras,
			remove: { ...f, acceptedExtras: [] },
		});

	if (f.references.length)
		chips.push({
			kind: "references",
			key: "references",
			references: f.references,
			maxJumps: f.maxJumps,
			remove: { ...f, references: [] },
		});

	return chips;
}

/**
 * Up to 3 relaxations that show more planets, most planets first. Counts
 * are the totals after the relaxation.
 * @author jplacht
 *
 * @param options.baseline "all": relaxations of a search without results.
 * "name": only the planets matching the name text count, and a relaxation
 * must show more of them than the filter does now.
 */
export function restrictionHints(
	index: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext,
	options: { baseline: "all" | "name" }
): IPlanetSearchHint[] {
	const byName = options.baseline === "name";
	// the name shrinks the set once, every candidate is counted within it
	const pool = byName
		? prepare(index).filter(predicate("text", filter, ctx))
		: prepare(index);
	const floor = byName ? countIn(pool, filter, ctx) : 0;

	// counts are filled in below
	const candidates: IPlanetSearchHint[] = activeChips(filter)
		.filter((chip) => !(byName && chip.kind === "text"))
		.map((chip) => ({
			kind: "chip",
			chip,
			filter: chip.remove,
			count: 0,
		}));

	if (!filter.surface.includes("gaseous"))
		candidates.push({
			kind: "gaseous",
			filter: { ...filter, surface: [...filter.surface, "gaseous"] },
			count: 0,
		});
	if (!isSectionWide(filter, "extras"))
		candidates.push({
			kind: "extras",
			filter: widenSection(filter, "extras"),
			count: 0,
		});
	if (filter.references.length && filter.maxJumps < MAX_JUMPS) {
		const maxJumps = Math.min(MAX_JUMPS, filter.maxJumps + 3);
		candidates.push({
			kind: "jumps",
			maxJumps,
			filter: { ...filter, maxJumps },
			count: 0,
		});
	}

	if (byName)
		for (const section of ["conditions", "cogc", "infrastructure"] as const)
			if (!isSectionWide(filter, section))
				candidates.push({
					kind: "section",
					section,
					filter: widenSection(filter, section),
					count: 0,
				});

	// the first of two candidates with the same outcome stays
	const seen = new Set<string>();
	return candidates
		.filter((c) => {
			const key = JSON.stringify(c.filter);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.map((c) => ({ ...c, count: countIn(pool, c.filter, ctx) }))
		.filter((h) => h.count > floor)
		.sort((a, b) => b.count - a.count)
		.slice(0, 3);
}

/**
 * Tells when the other filters hide planets that match the name text:
 * how many, what would show them, and the filter showing all of them.
 * Null without name text or when nothing is hidden.
 * @author jplacht
 */
export function nameSearchNote(
	index: PlanetSearchIndexEntry[],
	filter: PlanetSearchFilter,
	ctx: IPlanetSearchContext
): IPlanetSearchNameNote | null {
	if (!filter.text.trim()) return null;

	const pool = prepare(index).filter(predicate("text", filter, ctx));
	const hidden = pool.length - countIn(pool, filter, ctx);
	if (hidden <= 0) return null;

	return {
		matches: pool.length,
		hidden,
		hints: restrictionHints(index, filter, ctx, { baseline: "name" }),
		showAll: SEARCH_SECTIONS.reduce(widenSection, {
			...defaultFilter(),
			text: filter.text,
		}),
	};
}

/*
 * Sorting
 */

export function defaultSort(filter: PlanetSearchFilter): IPlanetSearchSort {
	const first = filter.materialGroups.flatMap((g) => g.materials)[0];
	if (first) return { key: `mat:${first}`, dir: "desc" };
	if (filter.references.length)
		return { key: `ref:${refKey(filter.references[0])}`, dir: "asc" };
	return { key: "name", dir: "asc" };
}

export function parseRefKey(key: string): PlanetSearchReference | undefined {
	const [kind, value] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
	if (kind === "plan" && value) return { kind: "plan", planUuid: value };
	if (kind === "cx" && SEARCH_CX.includes(value as PlanetSearchCX))
		return { kind: "cx", code: value as PlanetSearchCX };
	return undefined;
}

/** Jumps from a reference to a planet, -1 if unreachable or unknown */
export function planetJumps(
	planet: PlanetSearchIndexEntry,
	ref: PlanetSearchReference,
	ctx: IPlanetSearchContext
): number {
	return ctx.refJumps(ref)?.get(planet.system_id) ?? -1;
}

type ISortValue = number | string | undefined;

function sortValue(
	key: string,
	ctx: IPlanetSearchContext
): (p: PlanetSearchIndexEntry) => ISortValue {
	if (key === "name") return (p) => p.planet_name || p.planet_natural_id;
	if (key === "fert")
		return (p) => (p.fertility > -1 ? p.fertility : undefined);
	if (key.startsWith("mat:")) {
		const ticker = key.slice(4);
		return (p) =>
			p.resources.find((r) => r.material_ticker === ticker)
				?.daily_extraction;
	}
	const ref = parseRefKey(key.slice(4));
	return (p) => {
		const j = ref ? planetJumps(p, ref, ctx) : -1;
		return j === -1 ? undefined : j;
	};
}

/**
 * Sorted copy by a chain of keys: each next key breaks the ties of the
 * ones before. Absent values (no material, unreachable) go last on every key.
 * @author jplacht
 */
export function sortPlanets(
	planets: PlanetSearchIndexEntry[],
	sorts: IPlanetSearchSort[],
	ctx: IPlanetSearchContext
): PlanetSearchIndexEntry[] {
	const getters = sorts.map((s) => ({
		dir: s.dir === "asc" ? 1 : -1,
		value: sortValue(s.key, ctx),
	}));
	const keyed = planets.map((p) => ({
		p,
		v: getters.map((g) => g.value(p)),
	}));

	keyed.sort((a, b) => {
		for (let i = 0; i < getters.length; i++) {
			const x = a.v[i];
			const y = b.v[i];
			if (x === y) continue;
			if (x === undefined) return 1;
			if (y === undefined) return -1;
			const cmp =
				typeof x === "string"
					? x.localeCompare(y as string)
					: x - (y as number);
			if (cmp !== 0) return getters[i].dir * cmp;
		}
		return 0;
	});
	return keyed.map((k) => k.p);
}

/** Longest sort chain */
export const MAX_SORT_KEYS = 4;

/**
 * A header click on the sort chain. A plain click sorts by that column
 * alone (flipping it if it already is the only key). An additive click
 * (shift) cycles the column through add → flip → remove as a tiebreaker.
 * @author jplacht
 */
export function applySortClick(
	sorts: IPlanetSearchSort[],
	key: string,
	firstDir: IPlanetSearchSort["dir"],
	additive: boolean
): IPlanetSearchSort[] {
	const flip = (d: IPlanetSearchSort["dir"]) => (d === "asc" ? "desc" : "asc");
	const existing = sorts.find((s) => s.key === key);

	if (!additive)
		return sorts.length === 1 && existing
			? [{ key, dir: flip(existing.dir) }]
			: [{ key, dir: firstDir }];

	if (!existing)
		return sorts.length < MAX_SORT_KEYS
			? [...sorts, { key, dir: firstDir }]
			: sorts;
	if (existing.dir === firstDir)
		return sorts.map((s) => (s.key === key ? { key, dir: flip(s.dir) } : s));
	return sorts.filter((s) => s.key !== key);
}

/*
 * Display helpers
 */

/** Fertility as shown in game, null when the planet isn't fertile */
export function fertilityPercent(planet: PlanetSearchIndexEntry): number | null {
	return planet.fertility > -1 ? (1 + planet.fertility * (10 / 33)) * 100 : null;
}

/** Highest max_daily_extraction per ticker; the best daily_extraction if that is higher or missing (0) */
export function materialMax(
	index: PlanetSearchIndexEntry[]
): Record<string, number> {
	const max: Record<string, number> = {};
	for (const p of index)
		for (const r of p.resources)
			max[r.material_ticker] = Math.max(
				max[r.material_ticker] ?? 0,
				r.max_daily_extraction,
				r.daily_extraction
			);
	return max;
}

/** How many results have each material, keyed by ticker */
export function foundMaterials(
	planets: PlanetSearchIndexEntry[]
): Record<string, number> {
	const found: Record<string, number> = {};
	for (const p of planets)
		for (const r of p.resources)
			found[r.material_ticker] = (found[r.material_ticker] ?? 0) + 1;
	return found;
}

/** Filtered materials in group order, without duplicates */
export function filteredMaterials(filter: PlanetSearchFilter): string[] {
	return [...new Set(filter.materialGroups.flatMap((g) => g.materials))];
}

/**
 * Compare ranking: 1 is best, 0 worst, null when there's nothing to rank.
 * A missing value is worst; the present ones then scale from 0.4 to 1 so
 * they stay above it.
 * @author jplacht
 */
export function rankValues(
	values: (number | null)[],
	higherIsBetter: boolean
): (number | null)[] {
	if (values.length < 2) return values.map(() => null);
	const present = values.filter((v): v is number => v !== null);
	const max = Math.max(...present);
	const min = Math.min(...present);
	const missing = present.length < values.length;

	return values.map((v) => {
		if (v === null) return 0;
		// equal values are all best, whichever direction is better
		const scaled = max === min ? 1 : (v - min) / (max - min);
		const rank = higherIsBetter || max === min ? scaled : 1 - scaled;
		return missing ? 0.4 + 0.6 * rank : rank;
	});
}
