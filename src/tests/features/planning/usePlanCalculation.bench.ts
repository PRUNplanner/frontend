import { effectScope, ref, watch } from "vue";
import { bench, describe, vi } from "vitest";

// Composables
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
	findRecipeSwap,
	largePlan,
	setupPlanningTestData,
	smallPlan,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);

	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});

/**
 * Single-plan latency benchmarks of the planning engine, run with
 * `pnpm vitest bench --run`. Node + jsdom numbers, not browser numbers.
 */

await setupPlanningTestData();

const plans: [string, () => Plan][] = [
	["small", smallPlan],
	["etherwind", etherwindPlan],
	["large", largePlan],
];

// a live instance (watchers active) that has its first result
async function liveInstance(planFactory: () => Plan) {
	const plan = ref(planFactory());
	const scope = effectScope();
	const calc = scope.run(() => usePlanCalculation(plan))!;
	await vi.waitFor(() => {
		if (!calc.result.value.done) throw new Error("no result yet");
	});
	return { plan, calc };
}

type Live = Awaited<ReturnType<typeof liveInstance>>;

// resolves once the watcher replaced result.value after edit()
function editToResult(live: Live, edit: () => void): Promise<void> {
	return new Promise((resolve, reject) => {
		// the watcher swallows calculation errors, fail instead of hanging
		const timer = setTimeout(() => {
			stop();
			reject(new Error("no new result within 5s"));
		}, 5000);
		const stop = watch(
			live.calc.result,
			() => {
				clearTimeout(timer);
				stop();
				resolve();
			},
			{ flush: "sync" }
		);
		edit();
	});
}

for (const [name, planFactory] of plans) {
	const live = await liveInstance(planFactory);
	const { index, recipeid } = findRecipeSwap(live.plan.value);
	const swapBuilding = live.plan.value.plan_data.buildings[index];
	const recipeIds = [swapBuilding.active_recipes[0].recipeid, recipeid];
	const baseAmount = live.plan.value.plan_data.buildings[0].amount;

	describe(name, () => {
		bench(
			"B1a fresh instance: create + calculate() + watcher run",
			async () => {
				const scope = effectScope();
				const calc = scope.run(() =>
					usePlanCalculation(ref(planFactory()))
				)!;
				await calc.calculate();
				await vi.waitFor(() => {
					if (!calc.result.value.done)
						throw new Error("no result yet");
				});
				scope.stop();
			}
		);

		bench("B1b calculate() on a settled instance", async () => {
			await live.calc.calculate();
		});

		bench("B2 building amount edit -> result", async () => {
			await editToResult(live, () => {
				// alternate so the plan does not drift; every edit must change
				// the plan, or no recalculation runs
				const b = live.plan.value.plan_data.buildings[0];
				b.amount =
					b.amount === baseAmount ? baseAmount + 1 : baseAmount;
			});
		});

		bench("B3 recipe swap -> result", async () => {
			await editToResult(live, () => {
				const ar = swapBuilding.active_recipes[0];
				ar.recipeid =
					ar.recipeid === recipeIds[0] ? recipeIds[1] : recipeIds[0];
			});
		});

		bench("B4 luxury toggle -> result", async () => {
			await editToResult(live, () => {
				const w = live.plan.value.plan_data.workforce[0];
				w.lux1 = !w.lux1;
			});
		});

		bench("B5 CX refresh -> result", async () => {
			await editToResult(live, () => {
				live.calc.refreshKey.value++;
			});
		});
	});
}
