import { ref, Ref, toRef } from "vue";

// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Composables
import { useCXData } from "@/features/cx/useCXData";
import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
import { computePlanSnapshot } from "@/features/raukk_sourcing/useRaukkSnapshot";

// Graph
import {
	buildDependencyGraph,
	buildRecomputeOrder,
} from "@/features/raukk_sourcing/raukkSourcingGraph";

// Types & Interfaces
import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
import { IPlanResult } from "@/features/planning/usePlanCalculation.types";

/** One plan of a chain run that could not be recomputed */
export interface IRaukkChainError {
	planUuid: string;
	planName: string;
	message: string;
}

/**
 * Recomputes a whole sourcing chain instead of a single plan.
 *
 * The plans of the runs subgraph — all transitive sources of the
 * started plan, the plan itself and all its transitive dependents — are
 * recomputed upstream first, see
 * {@link buildRecomputeOrder} for the ordering and scoping rules. Every
 * plan holding a snapshot is recomputed, not only the stale ones: a
 * refreshed source changes the numbers of everything below it.
 *
 * Each plan is calculated in its own context, the numbers of a plan
 * depend on its empire and CX preference: plan and planet data come
 * from the query cache, the CX is resolved from the plans first empire
 * exactly like PlanView does. After the plan calculation the shared
 * snapshot pipeline stores the frozen values, so a chain run and a
 * manual per plan computation produce identical snapshots.
 *
 * A plan that fails — missing planet data, a deleted plan, a broken
 * calculation — records an error and the run continues with the next
 * one, recomputing the rest of the chain is still an improvement.
 * `recomputeChain` never rejects.
 *
 * @author raukk
 *
 * @returns Chain recomputation progress and action
 */
export function useRaukkChainRecompute() {
	const queryStore = useQueryStore();
	const sourcingStore = useRaukkSourcingStore();
	const { findEmpireCXUuid } = useCXData();

	const running: Ref<boolean> = ref(false);
	/** Name of the plan currently being recomputed */
	const current: Ref<string | undefined> = ref(undefined);
	const done: Ref<number> = ref(0);
	const total: Ref<number> = ref(0);
	const errors: Ref<IRaukkChainError[]> = ref([]);

	/**
	 * Recomputes and stores the snapshot of a single plan in its own
	 * empire and CX context.
	 *
	 * @author raukk
	 *
	 * @param {string} planUuid Plan Uuid
	 * @param {IPlanEmpireElement[]} empireList Available Empires
	 * @returns {Promise<void>}
	 */
	async function recomputePlan(
		planUuid: string,
		empireList: IPlanEmpireElement[]
	): Promise<void> {
		const plan: IPlan = await queryStore.execute("GetPlan", { planUuid });

		// the calculation resolves planet data from the local database,
		// a plan of another view is not guaranteed to be loaded yet
		await queryStore.execute("GetPlanet", {
			planetNaturalId: plan.planet_natural_id,
		});

		const empireUuid: string | undefined = plan.empires?.[0]?.uuid;
		const cxUuid: string | undefined = findEmpireCXUuid(empireUuid);

		const { calculate } = await usePlanCalculation(
			toRef(plan),
			ref(empireUuid),
			ref(empireList),
			ref(cxUuid)
		);

		const planResult: IPlanResult = await calculate();

		await computePlanSnapshot({
			planUuid,
			planName: plan.plan_name ?? "",
			planetNaturalId: plan.planet_natural_id,
			cxUuid,
			planResult,
		});
	}

	/**
	 * Recomputes the sourcing chain the given plan is part of.
	 *
	 * @author raukk
	 *
	 * @param {string} planUuid Started Plan Uuid
	 * @returns {Promise<void>}
	 */
	async function recomputeChain(planUuid: string): Promise<void> {
		if (running.value) return;

		const order: string[] = buildRecomputeOrder(
			buildDependencyGraph(
				sourcingStore.configs,
				sourcingStore.snapshots
			),
			planUuid,
			(uuid: string) => sourcingStore.snapshots[uuid] !== undefined
		);

		running.value = true;
		current.value = undefined;
		done.value = 0;
		total.value = order.length;
		errors.value = [];

		try {
			const empireList: IPlanEmpireElement[] = await empires();

			for (const uuid of order) {
				const planName: string =
					sourcingStore.snapshots[uuid]?.planName ?? uuid;

				current.value = planName;

				try {
					await recomputePlan(uuid, empireList);
				} catch (error) {
					errors.value.push({
						planUuid: uuid,
						planName,
						message:
							error instanceof Error
								? error.message
								: "unknown error",
					});
				}

				done.value++;

				// yield back to vue and update the progress display
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		} finally {
			running.value = false;
			current.value = undefined;
		}
	}

	/**
	 * Empire list of the user, cached by the query store. Plans of other
	 * views carry their empire uuids only, the calculation needs the
	 * empire elements to apply empire wide settings.
	 *
	 * @author raukk
	 *
	 * @returns {Promise<IPlanEmpireElement[]>} Empires
	 */
	async function empires(): Promise<IPlanEmpireElement[]> {
		try {
			return await queryStore.execute("GetAllEmpires", undefined);
		} catch {
			return [];
		}
	}

	return {
		running,
		current,
		done,
		total,
		errors,
		recomputeChain,
	};
}
