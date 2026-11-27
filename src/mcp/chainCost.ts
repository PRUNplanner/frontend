// Engine
import {
	groupRecipesByOutput,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { extractionOptions } from "@/features/production_chain/engine/chainExtraction";
import { emptyInput } from "@/features/production_chain/engine/chainUrl";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// Util
import { getPlanetSearchIndex } from "@/mcp/gameData";
import { basisBook, type PriceBasis } from "@/mcp/priceBasis";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IMcpGameData } from "@/mcp/gameData";
import type { CX, Plan } from "@prunplanner/engine/schemas";
import type { IPlanCalculation } from "@prunplanner/engine";
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";
import type {
	IChainContext,
	IChainInput,
	IChainResult,
} from "@/features/production_chain/engine/chainSolver.types";

/** materials the solver extracts instead of making */
export const RESOURCES: ReadonlySet<string> = new Set(
	RESOURCE_MATERIAL_OPTIONS.map((o) => o.value)
);

/** a calculated plan as the chain's own production reads it */
export const checkPlan = (plan: Plan, calc: IPlanCalculation): ICheckPlan => ({
	id: plan.uuid,
	uuid: plan.uuid,
	name: plan.plan_name,
	planetId: plan.planet_natural_id,
	cogc: plan.plan_cogc,
	result: calc.result,
	profit: calc.overview.profit,
});

export interface IChainCost {
	input: IChainInput;
	ctx: IChainContext;
	result: IChainResult;
}

/**
 * The Production Chains solver for one material with the page's defaults
 * (one base, 100 % efficiency), own production as "have". Without a planet
 * extraction uses the typical planet; with one the chain's base sits there
 * (its resources and yields, COGC and fees, as the page's base planet) and
 * a material it can't extract is made, or bought without a recipe
 * @author jplacht
 *
 * @param {IBackend} b Backend client (planet index when extraction is needed)
 * @param {IMcpGameData} gameData Game data
 * @param {object} opts Ticker, amount per day, prices, own production, raw source, base planet
 * @returns {Promise<IChainCost>} Input, context and the solved chain
 */
export async function chainCost(
	b: IBackend,
	gameData: IMcpGameData,
	opts: {
		ticker: string;
		perDay: number;
		// more materials made in the same chain, balanced with ticker
		also?: { ticker: string; perDay: number }[];
		cx: CX | undefined;
		basis: PriceBasis;
		have: Map<string, number>;
		rawSource?: IChainInput["rawSource"];
		planetId?: string;
	}
): Promise<IChainCost> {
	const empty = emptyInput();
	let input: IChainInput = {
		...empty,
		targets: [
			{ ticker: opts.ticker, perDay: opts.perDay },
			...(opts.also ?? []),
		],
		rawSource: opts.rawSource ?? "buy",
		have: Object.fromEntries(opts.have),
		bases: opts.planetId
			? empty.bases.map((base, i) =>
					i ? base : { ...base, planetId: opts.planetId! }
				)
			: empty.bases,
	};
	const ctx: IChainContext = {
		recipesByOutput: groupRecipesByOutput(
			Object.values(gameData.recipesByBuilding).flat()
		),
		buildings: gameData.buildings,
		materials: gameData.materials,
		// no planet: as the page, only empire-wide preferences
		prices: basisBook(opts.basis, opts.cx, "", gameData),
		getExchange: gameData.getExchange,
		resources: RESOURCES,
		now: Date.now(),
	};
	let result = solveChain(input, ctx);
	// extraction and a base planet need the planet index (as the page)
	if (opts.planetId || result.order.some((t) => result.rows[t].pending)) {
		const index = await getPlanetSearchIndex(b);
		ctx.extraction = extractionOptions(index);
		ctx.planets = new Map(index.map((p) => [p.planet_natural_id, p]));
		result = solveChain(input, ctx);
	}
	// what the base's planet can't extract is made, or bought without a recipe
	const missing = result.order.filter(
		(t) =>
			result.rows[t].source === "extract" &&
			result.rows[t].notOnPlanet &&
			!result.rows[t].target
	);
	if (missing.length) {
		input = {
			...input,
			source: {
				...input.source,
				...Object.fromEntries(
					missing.map((t) => [
						t,
						ctx.recipesByOutput.get(t)?.length ? "make" : "buy",
					])
				),
			},
		};
		result = solveChain(input, ctx);
	}
	return { input, ctx, result };
}
