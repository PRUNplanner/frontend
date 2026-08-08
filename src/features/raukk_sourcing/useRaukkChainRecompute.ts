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
	IRaukkRecomputePlanning,
} from "@/features/raukk_sourcing/raukkSourcingGraph";

// Pricing
import { maxRelativeOutputDelta } from "@/features/raukk_sourcing/raukkSourcingPricing";

// Types & Interfaces
import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import { IRaukkOutputCost } from "@/features/raukk_sourcing/raukkSourcing.types";

/** One plan of a chain run that could not be recomputed */
export interface IRaukkChainError {
	planUuid: string;
	planName: string;
	message: string;
}

/** Total pass cap of a cyclic chain run, first pass included */
const RAUKK_CHAIN_MAX_PASSES: number = 5;

/** Relative cost change below which a supply loop counts as settled */
const RAUKK_CHAIN_EPSILON: number = 1e-6;

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
	 * Snapshot output costs of the given plans, the comparison base of
	 * the loop settling passes.
	 *
	 * @author raukk
	 *
	 * @param {string[]} order Plan Uuids
	 * @returns {Record<string, Record<string, IRaukkOutputCost>>} Outputs
	 * by plan uuid
	 */
	function captureOutputs(
		order: string[]
	): Record<string, Record<string, IRaukkOutputCost>> {
		const captured: Record<
			string,
			Record<string, IRaukkOutputCost>
		> = {};

		order.forEach((uuid) => {
			captured[uuid] = sourcingStore.snapshots[uuid]?.outputs ?? {};
		});

		return captured;
	}

	/**
	 * Recomputes the sourcing chain the given plan is part of.
	 *
	 * A chain whose scope contains a supply loop is recomputed in
	 * multiple passes: every pass consumes the frozen values of the
	 * previous one, the loops numbers shrink towards their fixed point
	 * each time. Passes stop once the largest relative output cost
	 * change drops below {@link RAUKK_CHAIN_EPSILON} or
	 * {@link RAUKK_CHAIN_MAX_PASSES} is reached. Acyclic chains keep
	 * their single upstream first pass.
	 *
	 * @author raukk
	 *
	 * @param {string} planUuid Started Plan Uuid
	 * @returns {Promise<void>}
	 */
	async function recomputeChain(planUuid: string): Promise<void> {
		if (running.value) return;

		const planning: IRaukkRecomputePlanning = buildRecomputeOrder(
			buildDependencyGraph(
				sourcingStore.configs,
				sourcingStore.snapshots
			),
			planUuid,
			(uuid: string) => sourcingStore.snapshots[uuid] !== undefined
		);
		const order: string[] = planning.order;

		running.value = true;
		current.value = undefined;
		done.value = 0;
		total.value = order.length;
		errors.value = [];

		/**
		 * One recompute pass over the whole ordered scope.
		 */
		async function runPass(empireList: IPlanEmpireElement[]): Promise<void> {
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
		}

		try {
			const empireList: IPlanEmpireElement[] = await empires();

			await runPass(empireList);

			// loop settling passes, see the function doc
			for (
				let pass = 2;
				planning.cyclic && pass <= RAUKK_CHAIN_MAX_PASSES;
				pass++
			) {
				const before: Record<
					string,
					Record<string, IRaukkOutputCost>
				> = captureOutputs(order);

				total.value += order.length;
				await runPass(empireList);

				const settled: boolean = order.every(
					(uuid) =>
						maxRelativeOutputDelta(
							before[uuid],
							sourcingStore.snapshots[uuid]?.outputs ?? {}
						) < RAUKK_CHAIN_EPSILON
				);

				if (settled) break;
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
