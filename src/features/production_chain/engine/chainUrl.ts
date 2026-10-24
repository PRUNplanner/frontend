// Types & Interfaces
import type {
	ChainByproductMode,
	ChainRawSource,
	ChainSource,
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

const join = (record: Record<string, string>) =>
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
		},
		cx: first(query.cx) || undefined,
	};
}
