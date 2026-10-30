// Engine
import { BASE_IDS } from "@/features/production_chain/engine/chainBases";
import {
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
} from "@/features/planning/engine/efficiency";

// Schemas
import {
	ExpertTypeSchema,
	PlanCOGCProgramSchema,
} from "@/features/api/schemas/planningData.schemas";

// Types & Interfaces
import type {
	ChainBaseCOGC,
	ChainByproductMode,
	ChainExperts,
	ChainHave,
	ChainLux,
	ChainRawSource,
	ChainSource,
	IChainBase,
	IChainInput,
} from "@/features/production_chain/engine/chainSolver.types";

export interface IChainState {
	input: IChainInput;
	/** CX preference, undefined for the user's default */
	cx: string | undefined;
}

type IQueryValue = string | null | (string | null)[] | undefined;

const TICKER = /^[A-Z0-9]{1,3}$/;
const SOURCES: ChainSource[] = ["make", "buy", "extract"];
const RAW: ChainRawSource[] = ["buy", "extract"];
const BYPRODUCTS: ChainByproductMode[] = ["cover", "sell"];

export const DEFAULT_EFFICIENCY = 100;
const MAX_EFFICIENCY = 1000;

const first = (v: IQueryValue): string | undefined =>
	(Array.isArray(v) ? v[0] : v) ?? undefined;

/** "A:x,B:y" into pairs, split at the first colon; bad tickers dropped */
function pairs(v: IQueryValue): [string, string][] {
	const s = first(v);
	if (!s) return [];
	return s
		.split(",")
		.map((p): [string, string] => [
			p.slice(0, p.indexOf(":")),
			p.slice(p.indexOf(":") + 1),
		])
		.filter(([t, value]) => TICKER.test(t) && value !== "");
}

/** the one base a chain starts with */
export function firstBase(): IChainBase {
	return { id: BASE_IDS[0], name: "", planetId: null, cogc: "auto" };
}

const COGC_CHOICES: string[] = [
	"auto",
	"none",
	...PlanCOGCProgramSchema.options,
];

const LUX: ChainLux[] = ["none", "lux1", "lux2", "both"];
const NO_EXPERTS = "none";

/** escapes what splits the value; the router encodes the rest */
const escape = (s: string) => s.replace(/[%:,]/g, encodeURIComponent);

/** "Agriculture-5.Chemistry-1", "none" for none, "" for auto */
function encodeExperts(experts: ChainExperts | undefined): string {
	if (!experts) return "";
	const parts = Object.entries(experts)
		.filter(([, n]) => n && n > 0)
		.map(([type, n]) => `${type}-${n}`);
	return parts.length ? parts.join(".") : NO_EXPERTS;
}

function decodeExperts(v: string | undefined): ChainExperts | undefined {
	if (!v) return undefined;
	const experts: ChainExperts = {};
	let total = 0;
	if (v === NO_EXPERTS) return experts;
	for (const part of v.split(".")) {
		const [type, n] = part.split("-");
		const amount = Number(n);
		const parsed = ExpertTypeSchema.safeParse(type);
		if (parsed.success && Number.isInteger(amount) && amount > 0)
			experts[parsed.data] = Math.min(
				amount,
				MAX_EXPERTS_PER_TYPE,
				MAX_EXPERTS_TOTAL - total
			);
		total = Object.values(experts).reduce((s, n) => s + n, 0);
	}
	return experts;
}

/** "A:name:planet:cogc:lux:experts,B:…"; lux and experts empty for the defaults */
function encodeBases(bases: IChainBase[]): string {
	return bases
		.map((b) => {
			const parts = [
				b.id,
				escape(b.name),
				escape(b.planetId ?? ""),
				b.cogc,
			];
			const lux = b.lux && b.lux !== "both" ? b.lux : "";
			const experts = encodeExperts(b.experts);
			if (lux || experts) parts.push(lux, experts);
			return parts.join(":");
		})
		.join(",");
}

function decodeBases(v: IQueryValue): IChainBase[] {
	const bases: IChainBase[] = [];
	for (const part of (first(v) ?? "").split(",")) {
		const [id, name, planet, cogc, lux, experts] = part.split(":");
		if (!BASE_IDS.includes(id) || bases.some((b) => b.id === id)) continue;
		try {
			const base: IChainBase = {
				id,
				name: decodeURIComponent(name ?? ""),
				planetId: decodeURIComponent(planet ?? "") || null,
				cogc: COGC_CHOICES.includes(cogc)
					? (cogc as ChainBaseCOGC)
					: "auto",
			};
			if (LUX.includes(lux as ChainLux) && lux !== "both")
				base.lux = lux as ChainLux;
			const split = decodeExperts(experts);
			if (split) base.experts = split;
			bases.push(base);
		} catch {
			// a broken escape: the base is dropped
		}
	}
	return bases.length ? bases : [firstBase()];
}

const join = (record: Record<string, string | number>) =>
	Object.entries(record)
		.map(([t, v]) => `${t}:${v}`)
		.join(",");

/**
 * A chain as URL query values. Empty overrides are left out.
 * @author jplacht
 *
 * @param {IChainState} state Chain
 * @returns {Record<string, string>} Query
 */
export function encodeChain(state: IChainState): Record<string, string> {
	const { input } = state;
	const query: Record<string, string> = {
		t: input.targets.map((t) => `${t.ticker}:${t.perDay}`).join(","),
		eff: String(input.efficiency),
		raw: input.rawSource,
		byp: input.byproducts,
	};
	if (Object.keys(input.source).length) query.src = join(input.source);
	if (Object.keys(input.recipeId).length) query.r = join(input.recipeId);
	if (Object.keys(input.planetId).length) query.planet = join(input.planetId);
	query.bases = encodeBases(input.bases);
	if (Object.keys(input.baseOf).length) query.base = join(input.baseOf);
	// two decimals are enough for amounts per day, rounded up so a link never
	// leaves a sliver to make
	const have = Object.fromEntries(
		Object.entries(input.have ?? {})
			.map(([t, v]) => [
				t,
				v === "all" ? v : Math.ceil(v * 100 - 1e-6) / 100,
			])
			.filter(([, v]) => v !== 0)
	);
	if (Object.keys(have).length) query.have = join(have);
	if (state.cx) query.cx = state.cx;
	return query;
}

/**
 * A chain from URL query values; unknown or broken values fall back to
 * the defaults
 * @author jplacht
 *
 * @param {Record<string, IQueryValue>} query Query
 * @returns {IChainState | null} Chain, null without targets
 */
export function decodeChain(
	query: Record<string, IQueryValue>
): IChainState | null {
	const targets = pairs(query.t)
		.map(([ticker, v]) => ({ ticker, perDay: Number(v) }))
		.filter((t) => Number.isFinite(t.perDay) && t.perDay > 0);
	if (!targets.length) return null;

	const eff = Number(first(query.eff));
	const raw = first(query.raw) as ChainRawSource;
	const byp = first(query.byp) as ChainByproductMode;

	const bases = decodeBases(query.bases);
	const have: Record<string, ChainHave> = {};
	for (const [t, v] of pairs(query.have)) {
		const n = Number(v);
		if (v === "all") have[t] = "all";
		else if (Number.isFinite(n) && n > 0) have[t] = n;
	}
	return {
		input: {
			targets,
			efficiency:
				Number.isFinite(eff) && eff >= 1 && eff <= MAX_EFFICIENCY
					? eff
					: DEFAULT_EFFICIENCY,
			rawSource: RAW.includes(raw) ? raw : "buy",
			byproducts: BYPRODUCTS.includes(byp) ? byp : "cover",
			source: Object.fromEntries(
				pairs(query.src).filter(([, v]) =>
					SOURCES.includes(v as ChainSource)
				)
			) as Record<string, ChainSource>,
			recipeId: Object.fromEntries(pairs(query.r)),
			planetId: Object.fromEntries(pairs(query.planet)),
			bases,
			baseOf: Object.fromEntries(
				pairs(query.base).filter(([, id]) =>
					bases.some((b) => b.id === id)
				)
			),
			...(Object.keys(have).length ? { have } : {}),
		},
		cx: first(query.cx) || undefined,
	};
}
