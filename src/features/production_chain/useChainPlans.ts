// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Composables
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { baseLetter } from "@/features/production_chain/engine/chainCheck";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { ICheckPlan } from "@/features/production_chain/engine/chainCheck.types";

/**
 * An empire's plans through the plan engine, for Check an empire and Own
 * production
 * @author jplacht
 */
export function useChainPlans() {
	const { loadGameData, createContext } = usePlanContext();

	/**
	 * Every plan of the empire through the plan engine, sorted by name, and
	 * their planets
	 * @author jplacht
	 *
	 * @param {string} uuid Empire
	 * @param {string | undefined} cx CX preference
	 * @param {PlanEmpireElement[]} empires The user's empires
	 * @returns {Promise<{ plans: ICheckPlan[]; planets: Planet[] }>} Plans and planets
	 */
	async function loadEmpirePlans(
		uuid: string,
		cx: string | undefined,
		empires: PlanEmpireElement[]
	): Promise<{ plans: ICheckPlan[]; planets: Planet[] }> {
		const list = await useQuery("GetEmpirePlans", {
			empireUuid: uuid,
		}).execute();
		const ids = [...new Set(list.map((p) => p.planet_natural_id))];
		const planets = ids.length
			? await useQuery("GetMultiplePlanets", {
					planetNaturalIds: ids,
				}).execute()
			: [];
		const gameData = await loadGameData();
		const sorted = [...list].sort(
			(a, b) =>
				a.plan_name.localeCompare(b.plan_name) ||
				a.uuid.localeCompare(b.uuid)
		);
		const out: ICheckPlan[] = [];
		for (const [i, plan] of sorted.entries()) {
			const context = await createContext(
				gameData,
				plan.planet_natural_id,
				cx
			);
			const calculation = calculatePlan(
				{
					plan,
					empire: getActiveEmpire(uuid, empires),
					cxUuid: cx,
					recipeOptions: false,
				},
				context
			);
			out.push({
				id: baseLetter(i),
				uuid: plan.uuid,
				name: plan.plan_name,
				planetId: plan.planet_natural_id,
				cogc: plan.plan_cogc,
				result: calculation.result,
				profit: calculation.overview.profit,
			});
		}
		return { plans: out, planets };
	}

	return { loadEmpirePlans };
}
