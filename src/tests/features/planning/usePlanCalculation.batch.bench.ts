import { effectScope, ref, toRef } from "vue";
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

/**
 * Phase 0 batch baseline (B6-B8) for the planning engine refactor, run with
 * `pnpm vitest bench --run`. Node + jsdom numbers, not browser numbers.
 *
 * Counters, without touching src/:
 * - plans: usePlanCalculation instances created
 * - runs: calculate() executions, counted at calculateInfrastructureCosts,
 *   which calculate() calls exactly once (explicit calls and watcher runs)
 * - recipeOptions: optimalProduction.find, called once per recipe option
 */

const counters = vi.hoisted(() => ({ plans: 0, runs: 0, recipeOptions: 0 }));

vi.mock("@/features/planning/usePlanCalculation", async () => {
	const actual: any = await vi.importActual(
		"@/features/planning/usePlanCalculation"
	);
	return {
		...actual,
		usePlanCalculation: (...args: unknown[]) => {
			counters.plans++;
			return actual.usePlanCalculation(...args);
		},
	};
});

vi.mock("@/features/cx/usePrice", async () => {
	const actual: any = await vi.importActual("@/features/cx/usePrice");
	return {
		...actual,
		usePrice: (...args: unknown[]) => {
			const price = actual.usePrice(...args);
			return {
				...price,
				calculateInfrastructureCosts: (...a: unknown[]) => {
					counters.runs++;
					return price.calculateInfrastructureCosts(...a);
				},
			};
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
const empireUuid = ref("a208d74e-d07f-4722-8192-9b55d4140f58");
const empireOptions = ref(empire_list as unknown as IPlanEmpireElement[]);
const cxUuid = ref<string | undefined>(undefined);

// mirrors EmpireView.calculateEmpire without its result cache
async function empireLike(): Promise<void> {
	for (const plan of empirePlans) {
		await Promise.resolve();
		const scope = effectScope();
		const { calculate } = scope.run(() =>
			// live: false as in EmpireView; ignored by versions without the option
			usePlanCalculation(toRef(plan), empireUuid, empireOptions, cxUuid, {
				live: false,
			})
		)!;
		scope.stop();
		await calculate();
		await new Promise((r) => setTimeout(r, 0));
	}
}

async function roiOverview(): Promise<void> {
	await useROIOverview(ref(etherwindPlan()), ref(undefined)).calculate();
}

async function resourceROI(): Promise<void> {
	await useResourceROIOverview(ref(undefined)).calculate("N");
}

const batches: [string, () => Promise<void>][] = [
	["B6 empire-like, 30 plans", empireLike],
	["B7 ROI overview", roiOverview],
	["B8 resource ROI, N", resourceROI],
];

// one counted run per batch, letting discarded watcher runs finish
for (const [name, run] of batches) {
	Object.assign(counters, { plans: 0, runs: 0, recipeOptions: 0 });
	const start = performance.now();
	await run();
	const ms = performance.now() - start;
	await new Promise((r) => setTimeout(r, 200));
	console.log(
		`[count] ${name}: plans=${counters.plans} runs=${counters.runs} ` +
			`runs/plan=${(counters.runs / counters.plans).toFixed(2)} ` +
			`recipeOptions=${counters.recipeOptions} once=${ms.toFixed(0)}ms`
	);
}

// how many runs one live instance does on creation and per edit
{
	Object.assign(counters, { plans: 0, runs: 0, recipeOptions: 0 });
	const plan = ref(etherwindPlan());
	const scope = effectScope();
	scope.run(() => usePlanCalculation(plan));
	await new Promise((r) => setTimeout(r, 200));
	const created = counters.runs;
	plan.value.plan_data.buildings[0].amount++;
	await new Promise((r) => setTimeout(r, 200));
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
