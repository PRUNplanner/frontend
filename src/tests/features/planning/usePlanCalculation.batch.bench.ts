import { effectScope, ref } from "vue";
import { bench, describe, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";

// Services
import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";

// Stores
import { planetsStore } from "@/database/stores";
import { useDB } from "@/database/composables/useDB";

// Composables
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
import { useROIOverview } from "@/features/roi_overview/useROIOverview";
import { useResourceROIOverview } from "@/features/resource_roi_overview/useResourceROIOverview";

// Static
import { optimalProduction } from "@/features/roi_overview/assets/optimalProduction";

// Types & Interfaces
import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import empire_list from "@/tests/test_data/api_data_empire_list.json";
import {
	etherwindPlan,
	largePlan,
	planetSearchWithN,
	setupPlanningTestData,
	smallPlan,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import { empireLike } from "@/tests/features/planning/usePlanCalculation.bench.empire";

/**
 * Batch benchmarks (B6-B8) of the planning engine, run with
 * `pnpm vitest bench --run`. Node + jsdom numbers, not browser numbers.
 *
 * Counters, without touching src/:
 * - plans: plans in the workload (each runner returns its count)
 * - runs: plan calculations. The engine counts calls of calculatePlan;
 *   before the engine, the infrastructure costs call that calculate()
 *   makes exactly once per run (explicit calls and watcher runs)
 * - recipeOptions: optimalProduction.find, called once per recipe option
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

vi.mock("@/features/cx/usePrice", async () => {
	const actual: any = await vi.importActual("@/features/cx/usePrice");
	return {
		...actual,
		usePrice: (...args: unknown[]) => {
			const price = actual.usePrice(...args);
			// calculate() calls one of these once per run, depending on version
			for (const name of [
				"calculateInfrastructureCosts",
				"calculateInfrastructureCostsWith",
			])
				if (price[name]) {
					const fn = price[name];
					price[name] = (...a: unknown[]) => {
						counters.runs++;
						return fn(...a);
					};
				}
			return price;
		},
	};
});

const find = optimalProduction.find;
optimalProduction.find = function (...args: Parameters<typeof find>) {
	counters.recipeOptions++;
	return find.apply(optimalProduction, args);
} as typeof find;

const planetSearch = planetSearchWithN();
await setupPlanningTestData();
axiosSetup();
new AxiosMockAdapter(apiService.client)
	.onPost("/data/planets/search/")
	.reply(200, planetSearch);
// @ts-expect-error mock data
await planetsStore.setMany([planet_etherwind, ...planetSearch]);
await useDB(planetsStore).preload(true);

// B6: 25 etherwind variants and 5 large plans
const etherwindVariants: (() => IPlan)[] = [
	etherwindPlan,
	smallPlan,
	() => {
		const p = etherwindPlan();
		p.plan_data.workforce.forEach((w) => (w.lux1 = w.lux2 = false));
		return p;
	},
	() => {
		const p = etherwindPlan();
		p.plan_data.experts.forEach((e) => (e.amount = 5));
		return p;
	},
	() => {
		const p = etherwindPlan();
		p.plan_corphq = true;
		return p;
	},
];
const empirePlans: IPlan[] = Array.from({ length: 30 }, (_, i) =>
	i % 6 === 5 ? largePlan() : etherwindVariants[i % 5]()
);
async function empire(): Promise<number> {
	await empireLike(
		empirePlans,
		"a208d74e-d07f-4722-8192-9b55d4140f58",
		empire_list as unknown as IPlanEmpireElement[],
		undefined
	);
	return empirePlans.length;
}

// one plan per recipe
async function roiOverview(): Promise<number> {
	return (
		await useROIOverview(ref(etherwindPlan()), ref(undefined)).calculate()
	)!.length;
}

// one plan per planet and extractor (RIG, EXT, COL)
async function resourceROI(): Promise<number> {
	await useResourceROIOverview(ref(undefined)).calculate("N");
	return planetSearch.length * 3;
}

const batches: [string, () => Promise<number>][] = [
	["B6 empire-like, 30 plans", empire],
	["B7 ROI overview", roiOverview],
	["B8 resource ROI, N", resourceROI],
];

// one counted run per batch, letting discarded watcher runs finish
for (const [name, run] of batches) {
	Object.assign(counters, { runs: 0, recipeOptions: 0 });
	const start = performance.now();
	const plans = await run();
	const ms = performance.now() - start;
	await new Promise((r) => setTimeout(r, 200));
	console.log(
		`[count] ${name}: plans=${plans} runs=${counters.runs} ` +
			`runs/plan=${(counters.runs / plans).toFixed(2)} ` +
			`recipeOptions=${counters.recipeOptions} once=${ms.toFixed(0)}ms`
	);
}

// how many runs one live instance does on creation and per edit
{
	Object.assign(counters, { runs: 0, recipeOptions: 0 });
	const plan = ref(etherwindPlan());
	const scope = effectScope();
	const { result } = scope.run(() => usePlanCalculation(plan))!;
	// reading the result lets a lazy calculation run; a watcher ran anyway
	await new Promise((r) => setTimeout(r, 200));
	void result.value;
	const created = counters.runs;
	plan.value.plan_data.buildings[0].amount++;
	await new Promise((r) => setTimeout(r, 200));
	void result.value;
	scope.stop();
	console.log(
		`[count] live etherwind: runs on create=${created} ` +
			`runs per edit=${counters.runs - created}`
	);
}

describe("batch", () => {
	for (const [name, run] of batches)
		bench(name, run, {
			iterations: 10,
			warmupIterations: 1,
			time: 0,
			warmupTime: 0,
		});
});
