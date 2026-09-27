// Composables
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";

// Types & Interfaces
import { IPlan } from "@/stores/planningStore.types";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

/**
 * B6 workload: calculates plans the way EmpireView.calculateEmpire does,
 * without its result cache. Per-side adapter for the before/after bench:
 * the baseline side replaces this file with its usePlanCalculation loop.
 */
export async function empireLike(
	plans: IPlan[],
	empireUuid: string | undefined,
	empireOptions: PlanEmpireElement[],
	cxUuid: string | undefined
): Promise<void> {
	const { loadGameData, createContext } = usePlanContext();
	const gameData = await loadGameData();

	for (const plan of plans) {
		await Promise.resolve();
		calculatePlan(
			{
				plan,
				empire: getActiveEmpire(empireUuid, empireOptions),
				cxUuid,
				recipeOptions: false,
			},
			await createContext(gameData, plan.planet_natural_id, cxUuid)
		);
		await new Promise((r) => setTimeout(r, 0));
	}
}
