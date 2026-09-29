// Engine
import {
	defaultFilter,
	MAX_JUMPS,
	MAX_SORT_KEYS,
	parseRefKey,
	refKey,
} from "@/features/planet_search/planetSearch.engine";

// Schemas
import { PlanetCOGCProgramTypeSchema } from "@/features/api/schemas/gameData.schemas";
import {
	PlanetSearchExtraSchema,
	PlanetSearchInfrastructureSchema,
	type PlanetSearchFilter,
	type PlanetSearchMaterialGroup,
	type PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";

// Types & Interfaces
import type {
	IPlanetSearchSort,
	IPlanetSearchState,
} from "@/features/planet_search/planetSearch.types";

type IQueryValue = string | null | undefined | (string | null)[];
export type IPlanetSearchQuery = Record<string, IQueryValue>;

export const MAX_PINS = 4;

const TICKER = /^[A-Z0-9]{1,3}$/;

function first(v: IQueryValue): string {
	const s = Array.isArray(v) ? v[0] : v;
	return typeof s === "string" ? s : "";
}

function list(v: IQueryValue): string[] {
	return [
		...new Set(
			first(v)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		),
	];
}

function oneOf<T extends string>(
	values: string[],
	options: readonly T[]
): T[] {
	return values.filter((v): v is T => options.includes(v as T));
}

/**
 * Readable query params for a search state; defaults are left out
 * @author jplacht
 */
export function encodeSearch(state: IPlanetSearchState): Record<string, string> {
	const f = state.filter;
	const def = defaultFilter();
	const q: Record<string, string> = {};

	if (f.text) q.q = f.text;
	if (JSON.stringify(f.materialGroups) !== JSON.stringify(def.materialGroups))
		q.m = f.materialGroups
			.map((g) => `${g.op}:${g.materials.join("|")}`)
			.join(",");
	if (f.groupsOp === "any") q.g = "any";
	const mins = Object.entries(f.minDaily);
	if (mins.length) q.d = mins.map(([t, n]) => `${t}:${n}`).join(",");
	if (f.cogc.length) q.cogc = f.cogc.join(",");
	if (f.infrastructure.length) q.infra = f.infrastructure.join(",");
	if (f.fertile) q.fert = "1";
	if (f.surface.join() !== def.surface.join())
		q.surf = f.surface.map((s) => (s === "rocky" ? "r" : "g")).join("");
	if (f.acceptedExtras.length) q.x = f.acceptedExtras.join(",");
	if (f.references.length) q.ref = f.references.map(refKey).join(",");
	if (f.maxJumps !== def.maxJumps) q.j = String(f.maxJumps);
	if (state.sort.length)
		q.sort = state.sort.map((s) => `${s.key}:${s.dir}`).join(",");
	if (state.view === "matrix") q.view = "matrix";
	if (state.pins.length) q.pin = state.pins.join(",");

	return q;
}

function decodeGroups(v: IQueryValue): PlanetSearchMaterialGroup[] {
	// not list(): identical groups are allowed
	return first(v).split(",").flatMap((part) => {
		const [op, mats = ""] = part.split(":");
		if (op !== "any" && op !== "all") return [];
		const materials = [
			...new Set(mats.split("|").filter((t) => TICKER.test(t))),
		];
		return [{ op, materials }];
	});
}

function decodeSort(s: string): IPlanetSearchSort | null {
	const dir = s.slice(s.lastIndexOf(":") + 1);
	const key = s.slice(0, s.lastIndexOf(":"));
	if (dir !== "asc" && dir !== "desc") return null;

	const valid =
		key === "name" ||
		key === "fert" ||
		(key.startsWith("mat:") && TICKER.test(key.slice(4))) ||
		(key.startsWith("ref:") && parseRefKey(key.slice(4)) !== undefined);
	return valid ? { key, dir } : null;
}

/** A comma-separated sort chain; a single key is the old format */
function decodeSorts(v: IQueryValue): IPlanetSearchSort[] {
	const sorts: IPlanetSearchSort[] = [];
	for (const part of first(v).split(",")) {
		const s = decodeSort(part.trim());
		if (s && !sorts.some((x) => x.key === s.key)) sorts.push(s);
	}
	return sorts.slice(0, MAX_SORT_KEYS);
}

/**
 * Search state from query params; invalid values are dropped silently
 * @author jplacht
 */
export function decodeSearch(query: IPlanetSearchQuery): IPlanetSearchState {
	const def = defaultFilter();

	const groups = decodeGroups(query.m);
	const materials = new Set(groups.flatMap((g) => g.materials));

	const minDaily: Record<string, number> = {};
	for (const part of list(query.d)) {
		const [t, n] = part.split(":");
		const value = Number(n);
		if (materials.has(t) && n !== "" && Number.isFinite(value) && value >= 0)
			minDaily[t] = value;
	}

	const surf = first(query.surf);
	const surface: PlanetSearchFilter["surface"] = [];
	if (surf.includes("r")) surface.push("rocky");
	if (surf.includes("g")) surface.push("gaseous");

	const references = list(query.ref)
		.map(parseRefKey)
		.filter((r): r is PlanetSearchReference => r !== undefined);

	const j = Number(first(query.j));
	const jumpsValid =
		first(query.j) !== "" && Number.isInteger(j) && j >= 0 && j <= MAX_JUMPS;

	return {
		filter: {
			text: first(query.q),
			materialGroups: groups.length ? groups : def.materialGroups,
			groupsOp: first(query.g) === "any" ? "any" : "all",
			minDaily,
			cogc: oneOf(
				list(query.cogc),
				PlanetCOGCProgramTypeSchema.options.filter((o) => o !== "Invalid")
			),
			infrastructure: oneOf(
				list(query.infra),
				PlanetSearchInfrastructureSchema.options
			),
			fertile: first(query.fert) === "1",
			surface: surface.length ? surface : def.surface,
			acceptedExtras: oneOf(list(query.x), PlanetSearchExtraSchema.options),
			references,
			maxJumps: jumpsValid ? j : def.maxJumps,
		},
		sort: decodeSorts(query.sort),
		view: first(query.view) === "matrix" ? "matrix" : "list",
		pins: list(query.pin)
			.filter((p) => /^[A-Za-z0-9-]{1,16}$/.test(p))
			.slice(0, MAX_PINS),
	};
}
