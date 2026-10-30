import {
	getCurrentScope,
	onScopeDispose,
	type Ref,
	ref,
	shallowRef,
	type ShallowRef,
} from "vue";
import { debounce } from "lodash-es";

// Composables
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { planResultCacheKey } from "@/features/empire/empire.util";
import { type IRun, useRunProgress } from "@/util/runProgress";
import { reportError } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";

/** a finished run: what it calculated with */
export interface IEmpireCalculationRun {
	run: IRun;
	quiet: boolean;
	empireUuid: string | undefined;
	empires: PlanEmpireElement[];
	results: Record<string, IPlanCalculation>;
}

/**
 * # Empire Calculation
 *
 * Calculates every plan of an empire with its empire and CX, one plan at a
 * time with a yield to the browser in between. Results are cached per plan,
 * empire and CX; a newer run drops an older one.
 *
 * @author jplacht
 *
 * @param {Ref<Plan[]>} plans Empire plans
 * @param {Ref<string | undefined>} empireUuid Selected empire
 * @param {Ref<string | undefined>} cxUuid The empire's CX
 * @param {Ref<PlanEmpireElement[]>} empires All empires
 * @param {(done: IEmpireCalculationRun) => void} [onCalculated] Called when a
 * run finished as the latest one
 */
export function useEmpireCalculation(
	plans: Ref<Plan[]>,
	empireUuid: Ref<string | undefined>,
	cxUuid: Ref<string | undefined>,
	empires: Ref<PlanEmpireElement[]>,
	onCalculated?: (done: IEmpireCalculationRun) => void
) {
	const { loadGameData, createContext } = usePlanContext();
	const { progress, start } = useRunProgress();

	const results: ShallowRef<Record<string, IPlanCalculation>> = shallowRef(
		{}
	);
	// the plans results was calculated from
	const calculatedPlans: ShallowRef<Plan[]> = shallowRef([]);
	const isCalculating: Ref<boolean> = ref(true);

	const cache = new Map<string, IPlanCalculation>();

	/**
	 * Calculates all plans
	 * @author jplacht
	 *
	 * @async
	 * @param {boolean} [clearCache=false] Recalculate cached plans
	 * @param {boolean} [quiet=false] Keep the page instead of the progress
	 * screen, show the results when done
	 * @returns {Promise<void>}
	 */
	async function calculate(clearCache = false, quiet = false): Promise<void> {
		// a run calculates the empire, cx and plans it started with
		const runPlans = plans.value;
		const runEmpireUuid = empireUuid.value;
		const runCXUuid = cxUuid.value;
		const runEmpires = empires.value;
		const run = start(runPlans.length);

		if (!quiet) {
			isCalculating.value = true;
			results.value = {};
		}
		const calculated: Record<string, IPlanCalculation> = {};

		if (clearCache) cache.clear();

		try {
			// game data once for all plans
			const gameData = await loadGameData();
			if (!run.isCurrent()) return;

			for (const plan of runPlans) {
				// a plan is only calculated properly within its empire + cx
				const key: string = planResultCacheKey(
					plan.uuid,
					runEmpireUuid,
					runCXUuid
				);

				const cached = cache.get(key);
				if (cached) {
					calculated[plan.uuid] = cached;
					run.step();
					continue;
				}

				await Promise.resolve();
				const context = await createContext(
					gameData,
					plan.planet_natural_id,
					runCXUuid
				);
				if (!run.isCurrent()) return;

				const calculation = calculatePlan(
					{
						plan,
						empire: getActiveEmpire(runEmpireUuid, runEmpires),
						cxUuid: runCXUuid,
						// never read by the empire views
						recipeOptions: false,
					},
					context
				);
				calculated[plan.uuid] = calculation;
				cache.set(key, calculation);
				run.step();

				// yield back to vue and update DOM
				if (!(await run.yield())) return;
			}
			calculatedPlans.value = runPlans;
			results.value = calculated;
		} catch (err) {
			// e.g. game data missing, never persist a partial empire state
			if (run.isCurrent()) reportError(err);
			return;
		} finally {
			if (run.isCurrent()) isCalculating.value = false;
		}

		onCalculated?.({
			run,
			quiet,
			empireUuid: runEmpireUuid,
			empires: runEmpires,
			results: calculated,
		});
	}

	// another tab changed the empire or its plans; the list and the plans
	// steps refresh one after the other, calculate once
	const recalculateRefreshed = debounce(() => calculate(true, true), 200);
	if (getCurrentScope()) onScopeDispose(() => recalculateRefreshed.cancel());

	return {
		results,
		calculatedPlans,
		progress,
		isCalculating,
		calculate,
		recalculateRefreshed,
	};
}
