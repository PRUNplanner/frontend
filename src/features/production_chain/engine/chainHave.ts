// Types & Interfaces
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";
import type {
	ChainHave,
	IChainResult,
} from "@/features/production_chain/engine/chainSolver.types";
import type { IChainHaveOverride } from "@/features/production_chain/productionChain.types";

/**
 * # Own production
 *
 * What an empire's plans make beyond what they use, and which plan
 * supplies the Have rows of a solved chain. The rules are documented in
 * docs/features/production_chain.md.
 */

const EPS = 1e-9;

/** supplier key of a typed or linked amount: "Your bases" */
export const OWN_SUPPLIER = "own";

export interface IChainHaveSupply {
	/** plan uuid, OWN_SUPPLIER for a typed or linked amount */
	key: string;
	plan: ICheckPlan | null;
	perDay: number;
	/** the plan's net surplus of the material, null for OWN_SUPPLIER */
	surplus: number | null;
}

const deltaOf = (plan: ICheckPlan, ticker: string) =>
	plan.result.materialio.find((m) => m.ticker === ticker)?.delta ?? 0;

/**
 * An empire's net surplus: Σ of its plans' material I/O deltas, positive
 * totals only
 * @author jplacht
 *
 * @param {ICheckPlan[]} plans Plans through the plan engine
 * @returns {Map<string, number>} Per day by ticker
 */
export function empireSurplus(plans: ICheckPlan[]): Map<string, number> {
	const sum = new Map<string, number>();
	for (const p of plans)
		for (const m of p.result.materialio)
			sum.set(m.ticker, (sum.get(m.ticker) ?? 0) + m.delta);
	return new Map([...sum].filter(([, q]) => q > EPS));
}

/**
 * Who supplies each Have row: an empire's amount comes from its plans with
 * a positive delta in name order, each giving what is left up to its
 * delta; a typed or linked amount from "Your bases"
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {ICheckPlan[]} plans The empire's plans
 * @param {(ticker: string) => boolean} fromEmpire Whether the amount is the empire's
 * @returns {Record<string, IChainHaveSupply[]>} Suppliers by ticker
 */
export function haveSuppliers(
	result: IChainResult,
	plans: ICheckPlan[],
	fromEmpire: (ticker: string) => boolean
): Record<string, IChainHaveSupply[]> {
	const sorted = [...plans].sort((a, b) => a.name.localeCompare(b.name));
	const out: Record<string, IChainHaveSupply[]> = {};
	for (const t of result.order) {
		const used = result.rows[t].have;
		if (used <= EPS) continue;
		if (!fromEmpire(t)) {
			out[t] = [{ key: OWN_SUPPLIER, plan: null, perDay: used, surplus: null }];
			continue;
		}
		let left = used;
		const list: IChainHaveSupply[] = [];
		for (const plan of sorted) {
			const delta = deltaOf(plan, t);
			if (delta <= EPS || left <= EPS) continue;
			const perDay = Math.min(delta, left);
			list.push({ key: plan.uuid, plan, perDay, surplus: delta });
			left -= perDay;
		}
		out[t] = list;
	}
	return out;
}

/**
 * The surplus the chain doesn't use
 * @author jplacht
 *
 * @param {ReadonlyMap<string, number>} surplus Net surplus by ticker
 * @param {IChainResult} result Solved chain
 * @returns {{ ticker: string; perDay: number }[]} What is left
 */
export function unusedSurplus(
	surplus: ReadonlyMap<string, number>,
	result: IChainResult
): { ticker: string; perDay: number }[] {
	return [...surplus]
		.map(([ticker, q]) => ({
			ticker,
			perDay: q - (result.rows[ticker]?.have ?? 0),
		}))
		.filter((u) => u.perDay > EPS);
}

/**
 * What the solver gets: the user's amounts over the empire's surplus,
 * "off" removing a material
 * @author jplacht
 *
 * @param {ReadonlyMap<string, number>} surplus The empire's net surplus
 * @param {Record<string, IChainHaveOverride>} overrides Typed or linked amounts
 * @returns {Record<string, ChainHave>} Have per ticker
 */
export function effectiveHave(
	surplus: ReadonlyMap<string, number>,
	overrides: Record<string, IChainHaveOverride>
): Record<string, ChainHave> {
	const out: Record<string, ChainHave> = Object.fromEntries(surplus);
	for (const [t, o] of Object.entries(overrides))
		if (o.value === "off") delete out[t];
		else out[t] = o.value;
	return out;
}

/**
 * The overrides after setting one: an amount, "off" (kept only while the
 * empire has a surplus of it to hide) or undefined for the empire's again
 * @author jplacht
 *
 * @param {Record<string, IChainHaveOverride>} overrides Current overrides
 * @param {string} ticker Material
 * @param {ChainHave | "off" | undefined} value New value
 * @param {ReadonlyMap<string, number>} surplus The empire's net surplus
 * @returns {Record<string, IChainHaveOverride>} New overrides
 */
export function withHave(
	overrides: Record<string, IChainHaveOverride>,
	ticker: string,
	value: ChainHave | "off" | undefined,
	surplus: ReadonlyMap<string, number>
): Record<string, IChainHaveOverride> {
	const next = { ...overrides };
	if (value === undefined || (value === "off" && !surplus.has(ticker)))
		delete next[ticker];
	else next[ticker] = { value, origin: "typed" };
	return next;
}

/** picking an empire: typed amounts stay and win, linked ones and "off" go */
export function typedOnly(
	overrides: Record<string, IChainHaveOverride>
): Record<string, IChainHaveOverride> {
	return Object.fromEntries(
		Object.entries(overrides).filter(
			([, o]) => o.origin === "typed" && o.value !== "off"
		)
	);
}
