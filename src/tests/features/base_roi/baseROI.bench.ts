import { describe, vi } from "vitest";
import { bench } from "@/tests/bench";

// Composables
import { usePlanContext } from "@/features/planning/usePlanContext";
import { usePathfinder } from "@/features/pathfinding/usePathfinder";
import { useExchangeData } from "@/database/services/useExchangeData";

// Unit
import {
	calculateBase,
	planetCandidates,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import {
	calculateMetrics,
	filterRows,
} from "@/features/base_roi/baseROIMetrics";
import { profitHistory } from "@/features/base_roi/baseROIHistory";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import {
	CHUNK_SIZE,
	STANDARD_PLANET,
} from "@/features/base_roi/baseROI.constants";
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Test Data
import { setupPlanningTestData } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planetIndex from "@/tests/test_data/api_data_planet_search_index.json";
import planetTemplate from "@/tests/test_data/api_data_planet_etherwind.json";

// Types & Interfaces
import type {
	Planet,
	PlanetSearchIndexEntry,
} from "@/features/api/schemas/gameData.schemas";
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseROICandidate,
	IBaseROIRow,
	IBaseROIRowInput,
	IBaseROISeries,
} from "@/features/base_roi/baseROI.types";
import type { IPlanContext } from "@/features/planning/engine/engine.types";

/**
 * Base ROI benchmarks (B10), run with `pnpm vitest bench --run`. Node +
 * jsdom numbers. Planet rows: every index planet within 7 jumps of AI1,
 * as full planets built from the index entry (its environment and
 * resources on the etherwind planet).
 *
 * Counters: plans (rows), runs (calculatePlan calls), recipeOptions
 * (optimalProduction.find calls), chunks and the longest chunk.
 */

const counters = vi.hoisted(() => ({ runs: 0, recipeOptions: 0 }));

vi.mock("@/features/planning/engine/calculatePlan", async () => {
	const actual: any = await vi.importActual(
		"@/features/planning/engine/calculatePlan"
	);
	return {
		...actual,
		calculatePlan: (...args: unknown[]) => {
			counters.runs++;
			return actual.calculatePlan(...args);
		},
	};
});

const find = optimalProduction.find;
optimalProduction.find = function (...args: Parameters<typeof find>) {
	counters.recipeOptions++;
	return find.apply(optimalProduction, args);
} as typeof find;

await setupPlanningTestData();
const { loadGameData, createPrices } = usePlanContext();
const gameData = await loadGameData();
const getExchange = useExchangeData().getExchangeTickerLoaded;
const { getJumpsFrom, systemidAI1 } = usePathfinder();
const fromAI1 = getJumpsFrom(systemidAI1);

const env = { LOW: 0.1, NORMAL: 1, HIGH: 3 };
const temperature = { LOW: -50, NORMAL: 25, HIGH: 100 };
const index = planetIndex as unknown as PlanetSearchIndexEntry[];
const planets = new Map<string, Planet>(
	index.map((e) => [
		e.planet_natural_id,
		{
			...(planetTemplate as Planet),
			...e,
			gravity: env[e.gravity_type],
			pressure: env[e.pressure_type],
			temperature: temperature[e.temperature_type],
			resources: e.resources.map((r) => ({ ...r, factor: 0 })),
		},
	])
);

const settings: BaseROISettings = defaultBaseROISettings();
const recipes = recipeCandidates(gameData);
const { within, beyond } = planetCandidates(
	index,
	gameData,
	(s) => fromAI1.get(s) ?? -1,
	settings.maxJumps
);

const standard: IPlanContext = {
	...gameData,
	planet: STANDARD_PLANET,
	prices: createPrices(STANDARD_PLANET.planet_natural_id, undefined),
};
const contexts = new Map<string, IPlanContext>();
const contextOf = (c: IBaseROICandidate): IPlanContext => {
	if (!c.planetNaturalId) return standard;
	let ctx = contexts.get(c.planetNaturalId);
	if (!ctx) {
		ctx = {
			...gameData,
			planet: planets.get(c.planetNaturalId)!,
			prices: createPrices(c.planetNaturalId, undefined),
		};
		contexts.set(c.planetNaturalId, ctx);
	}
	return ctx;
};

let longestChunk = 0;
let chunks = 0;
function engineRows(
	candidates: IBaseROICandidate[],
	s: BaseROISettings = settings
): IBaseROIRowInput[] {
	const out: IBaseROIRowInput[] = [];
	for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
		const start = performance.now();
		for (const c of candidates.slice(i, i + CHUNK_SIZE)) {
			const ctx = contextOf(c);
			out.push(
				toRowInput(
					c,
					calculateBase(c, ctx, s, undefined),
					ctx,
					getExchange
				)
			);
		}
		chunks++;
		longestChunk = Math.max(longestChunk, performance.now() - start);
	}
	return out;
}
const withMetrics = (
	inputs: IBaseROIRowInput[],
	s: BaseROISettings = settings
): IBaseROIRow[] =>
	inputs.map((i) => ({ ...i, metrics: calculateMetrics(i, s, 0) }));

const full = (): number => {
	const rows = withMetrics(engineRows([...recipes, ...within]));
	return filterRows(rows, beyond, settings).rows.length;
};

// one counted run per workload
const allInputs = engineRows([...recipes, ...within]);
const allRows = withMetrics(allInputs);
const series: IBaseROISeries = { AI1: {} };
for (const row of allRows)
	for (const m of row.materials)
		series.AI1![m.ticker] ??= Array.from({ length: 30 }, (_, d) =>
			d % 5 === 0 ? null : m.price * (1 + (d % 3) / 50)
		);

const workloads: [string, () => number][] = [
	["B10a recipe rows, standard planet", () => engineRows(recipes).length],
	["B10b planet rows within 7 jumps of AI1", () => engineRows(within).length],
	["B10c full table, defaults", full],
	[
		"B10d filter only (min market capacity, logistics)",
		() =>
			filterRows(
				withMetrics(allInputs, { ...settings, logistics: "none" }),
				beyond,
				{ ...settings, minMarketCapacity: 0.2 }
			).rows.length,
	],
	[
		"B10d recalculation (experts 3)",
		() =>
			withMetrics(
				engineRows([...recipes, ...within], { ...settings, experts: 3 })
			).length,
	],
	[
		"B10e profit history, every row",
		() =>
			allRows.map((r) =>
				profitHistory(r.materials, r.degradation, series)
			).length,
	],
];

for (const [name, run] of workloads) {
	Object.assign(counters, { runs: 0, recipeOptions: 0 });
	chunks = 0;
	longestChunk = 0;
	const start = performance.now();
	const plans = run();
	const ms = performance.now() - start;
	console.log(
		`[count] ${name}: rows=${plans} runs=${counters.runs} ` +
			`recipeOptions=${counters.recipeOptions} chunks=${chunks} ` +
			`longestChunk=${longestChunk.toFixed(0)}ms once=${ms.toFixed(0)}ms`
	);
}

describe("B10 base ROI", () => {
	for (const [name, run] of workloads)
		bench(name, () => void run(), {
			iterations: 5,
			warmupIterations: 1,
			time: 0,
			warmupTime: 0,
		});
});
