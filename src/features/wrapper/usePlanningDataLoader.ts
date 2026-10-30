import { computed, ref, type Ref, watch, watchEffect } from "vue";

import { useI18n } from "vue-i18n";

// Stores & Repository
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { isApiError } from "@/lib/apiError";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";
import { useCXData } from "@/features/cx/useCXData";

// Util
import { step } from "@/features/wrapper/dataLoader.util";
import { isSubset } from "@/lib/query_cache/cacheKeys";
import { remoteChange } from "@/lib/crossTab";
import { trackUser, reportError } from "@/lib/analytics/useAnalytics";
import { toWorkingCopy } from "@/features/sharing/sharedPlan.util";

// Types & Interfaces
import type {
	PlanningDataLoaderEmits,
	PlanningDataLoaderProps,
	PlanningSteps,
} from "@/features/wrapper/planningDataLoader.types";
import type { StepState } from "@/features/wrapper/dataLoader.types";
import type {
	Plan,
	PlanShare,
} from "@/features/api/schemas/planningData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { Shared } from "@/features/api/schemas/sharingData.schemas";

export function usePlanningDataLoader(
	props: PlanningDataLoaderProps,
	emits: PlanningDataLoaderEmits
) {
	/*
		Validate props for proper use of the component:
		A shared plan brings its own plan and planet, so it must not load
		another plan or planet. The viewer's empires, CX and plans may load
		with it (logged in viewers price and save their copy with them).
	*/

	const { t } = useI18n();

	if (
		props.sharedPlanUuid &&
		(props.planUuid || props.planetNaturalId)
	) {
		throw new Error(
			"PlanningDataLoader: Loading shared plan must not load any other plan data."
		);
	}
	const { findEmpireCXUuid } = useCXData();

	const knowsEmpire = (list: PlanEmpireElement[], empireUuid: string) =>
		list.some((e) => e.uuid === empireUuid);
	const queryStore = useQueryStore();
	const done: Ref<boolean> = ref(false);
	// mount to all data loaded, a performance measure for the lab runs
	const loadStart = performance.now();

	const { createBlankDefinition } = usePlan();

	// reset on change
	watch(
		() => [
			props.empireUuid,
			props.planUuid,
			props.planetNaturalId,
			props.sharedPlanUuid,
		],
		(
			[newEmpire, newPlan, newPlanet, newShared],
			[oldEmpire, oldPlan, oldPlanet, oldShared]
		) => {
			done.value = false;

			// per step reset
			if (newEmpire !== oldEmpire) {
				steps.empirePlans.triggered = false;
				steps.empirePlans.data = null;

				// an empire the loaded list doesn't know (just created):
				// reload the list, its plans wait for it
				const empireList = steps.empireList;
				if (
					newEmpire &&
					empireList.data &&
					!knowsEmpire(empireList.data, newEmpire)
				) {
					empireList.triggered = false;
					empireList.data = null;
				}
			}

			if (newPlan !== oldPlan) {
				steps.plan.triggered = false;
				steps.plan.data = null;
			}

			// another share: its plan, and the planet it brings, load again
			if (newShared && newShared !== oldShared) {
				steps.sharedPlan.triggered = false;
				steps.sharedPlan.data = null;
			}

			// another planet (or share): don't keep the old planet's data
			if (newPlanet !== oldPlanet || newShared !== oldShared) {
				steps.planet.triggered = false;
				steps.planet.data = null;
			}
		}
	);

	const steps: PlanningSteps = {
		sharedPlan: step({
			name: t("wrapper.planning_data.shared_plan"),
			enabled: () => !!props.sharedPlanUuid,
			load: () =>
				queryStore.execute("GetSharedPlan", {
					sharedPlanUuid: props.sharedPlanUuid!,
				}),
			onSuccess: (data: PlanShare) => emits("data:shared:plan", data),
		}),
		empireList: step({
			name: t("wrapper.planning_data.empires"),
			enabled: () => !!props.empireList,
			load: () => queryStore.execute("GetAllEmpires", undefined),
			refreshKey: () => ["planningdata", "empire", "list"],
			onSuccess: (data: PlanEmpireElement[]) => {
				// no selection, or a stored one that no longer exists
				const hasNoSelection =
					!props.empireUuid || !knowsEmpire(data, props.empireUuid);

				if (hasNoSelection && data.length > 0) {
					emits("update:empireUuid", data[0].uuid);
				}

				emits("data:empire:list", data);
				trackUser({ empire_count: data.length });
			},
		}),
		plan: step({
			name: t("wrapper.planning_data.plan"),
			enabled: () => !!props.planUuid,
			load: () =>
				queryStore.execute("GetPlan", {
					planUuid: props.planUuid!,
				}),
			onSuccess: (data: Plan) => emits("data:plan", data),
		}),
		planList: step({
			name: t("wrapper.planning_data.plans_all"),
			enabled: () => !!props.planList,
			load: () => queryStore.execute("GetAllPlans", undefined),
			refreshKey: () => ["planningdata", "plan", "list"],
			onSuccess: (data: Plan[]) => {
				const planetList: string[] = Array.from(
					new Set(data.map((e) => e.planet_natural_id)).values()
				);

				trackUser({ plan_count: data.length });
				emits("data:plan:list", data);
				emits("data:plan:list:planets", planetList);
			},
		}),
		planet: step({
			get name() {
				return t("wrapper.planning_data.planet_data", {
					name: props.planetNaturalId ?? "",
				});
			},
			// a shared plan's planet waits for the shared plan
			ready: () => !props.sharedPlanUuid || steps.sharedPlan.data != null,
			enabled: () => !!(props.sharedPlanUuid || props.planetNaturalId),
			load: () => {
				// from the step, not the query cache: a logout while the
				// shared plan loads (expired session) empties the cache
				const id = props.sharedPlanUuid
					? steps.sharedPlan.data!.plan_details.planet_natural_id
					: props.planetNaturalId!;
				return queryStore.execute("GetPlanet", {
					planetNaturalId: id,
				});
			},
			onSuccess: (data: Planet) => emits("data:planet", data),
		}),
		cx: step({
			name: t("wrapper.planning_data.cx"),
			enabled: () => !!props.loadCX,
			load: () => queryStore.execute("GetAllCX", undefined),
			refreshKey: () => ["planningdata", "cx"],
			onSuccess: (d: CX[], refreshed?: boolean) => {
				emits("data:cx", d);
				trackUser({ cx_count: d.length });
				// a refresh keeps the CX the page shows
				if (!props.cxUuid && d.length > 0 && !refreshed) {
					emits("update:cxUuid", d[0].uuid);
				}
			},
		}),
		sharedList: step({
			name: t("wrapper.planning_data.shared_list"),
			enabled: () => !!props.loadShared,
			load: () => queryStore.execute("GetAllShared", undefined),
			refreshKey: () => ["planningdata", "shared", "list"],
			onSuccess: (data: Shared[]) => emits("data:shared", data),
		}),
		empirePlans: step({
			name: t("wrapper.planning_data.empire_plans"),
			// with the empire list, only load plans of an empire in it: a
			// deleted empire's uuid (e.g. the stored default) would fail
			enabled: () => {
				if (!props.empireUuid) return false;
				if (!props.empireList) return true;
				const list = steps.empireList.data;
				return !!list && knowsEmpire(list, props.empireUuid);
			},
			load: () =>
				queryStore.execute("GetEmpirePlans", {
					empireUuid: props.empireUuid!,
				}),
			refreshKey: () => [
				"planningdata",
				"empire",
				"plans",
				props.empireUuid!,
			],
			onSuccess: (data: Plan[]) => {
				// emit empire data
				// emit potential empire cx uuid
				if (!props.cxUuid) {
					emits("update:cxUuid", findEmpireCXUuid(props.empireUuid!));
				}
				emits("data:empire:plans", data);
			},
		}),
	};
	const all: StepState<unknown>[] = Object.values(steps);

	// Orchestrator
	watchEffect(() => {
		all.forEach((s) => {
			if (!s.triggered && s.cfg.enabled() && (s.cfg.ready?.() ?? true)) {
				s.triggered = true;
				s.loading = true;
				s.error = null;
				s.cfg
					.load()
					.then((d) => {
						s.data = d;
						s.cfg.onSuccess(d);
					})
					.catch((e) => {
						s.error = e instanceof Error ? e : new Error(String(e));
					})
					.finally(() => {
						s.loading = false;
					});
			}
		});
	});

	/*
	 * Another tab changed data a loaded step shows: load it again, keeping
	 * the old data (and the page) until the new one is there
	 */
	watch(remoteChange, (change) => {
		if (!change) return;
		all.forEach((s) => {
			const key = s.cfg.refreshKey?.();
			if (
				key === undefined ||
				s.data == null ||
				!s.cfg.enabled() ||
				!change.keys.some((prefix) => isSubset(prefix, key))
			)
				return;

			s.cfg
				.load()
				.then((d) => {
					s.data = d;
					s.cfg.onSuccess(d, true);
					emits("refreshed");
				})
				// the old data stays, the next change or visit retries
				.catch(reportError);
		});
	});

	const loadingSteps = computed(() =>
		all
			.filter((s) => s.cfg.enabled())
			.map((s) => ({
				name: s.cfg.name,
				loading: s.loading,
				error: s.error,
			}))
	);

	const hasError = computed(() =>
		loadingSteps.value.some((l) => l.error != null)
	);

	// a share link that was revoked, deleted or mistyped
	const sharedPlanMissing = computed(() => {
		const error = steps.sharedPlan.error;
		return isApiError(error) && error.status === 404;
	});

	const allLoaded = computed(() =>
		all
			.filter((s) => s.cfg.enabled())
			.every((s) => !s.loading && s.error == null && s.data != null)
	);

	watch(
		allLoaded,
		(ok) => {
			if (ok) {
				if (!done.value)
					performance.measure("loader:planning", { start: loadStart });
				emits("complete");
				done.value = true;
			}
		},
		{ immediate: true }
	);

	const results = computed(() => {
		const data = {
			sharedPlan: steps.sharedPlan.data,
			empireList: steps.empireList.data,
			planetData: steps.planet.data,
			planData: steps.plan.data,
			planList: steps.planList.data,
			sharedData: steps.sharedList.data,
			empirePlansData: steps.empirePlans.data,
			empirePlanetList: computed((): string[] => {
				/*
					empire planet list can either come from loading empire plans
					directly or by just loading a list of empire which would
					potentially require to fetch all planets
				*/
				const empirePlans = steps.empirePlans.data;
				const empireList = steps.empireList.data;

				if (empirePlans) {
					return [
						...new Set(empirePlans.map((p) => p.planet_natural_id)),
					];
				}
				if (empireList) {
					return [
						...new Set(
							empireList
								.map((e) =>
									e.plans.map((p) => p.planet_natural_id)
								)
								.flat()
						),
					];
				}

				return [];
			}),
		};

		/*
			The plan definition (i.e. the actual plan setup) depends on the
			requested parameters with the following variants:

			1) shared plan uuid provided, a working copy of the shared plan
			2) plan uuid provided, plan data to use
			3) only planet natural id provided, new plan definition created
		*/
		const planDefinition = props.sharedPlanUuid
			? data.sharedPlan && toWorkingCopy(data.sharedPlan.plan_details)
			: props.planUuid
				? data.planData
				: data.planetData
					? createBlankDefinition(
							data.planetData.planet_natural_id,
							data.planetData.active_cogc_program_type
						)
					: undefined;

		// a shared plan is edited as the viewer's working copy
		const shared: boolean = !!props.sharedPlanUuid;

		return { ...data, planDefinition, shared, disabled: false };
	});

	return {
		done,
		allLoaded,
		hasError,
		sharedPlanMissing,
		loadingSteps,
		results: results,
	};
}
