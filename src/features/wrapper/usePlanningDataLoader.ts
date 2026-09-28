import { computed, reactive, ref, type Ref, watch, watchEffect } from "vue";

import { useI18n } from "vue-i18n";

// Stores & Repository
import { queryRepository } from "@/lib/query_cache/queryRepository";
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";
import { useCXData } from "@/features/cx/useCXData";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import type {
	PlanningDataLoaderEmits,
	PlanningDataLoaderProps,
	PlanningStepConfigsType,
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
		It can either load a shared plan uuid and the related planet by passing
		the sharedPlan uuid or other elements like empires, a plan or planet.
		Loading both is not permitted as it doesn't make sense.
	*/

	const { t } = useI18n();

	if (
		props.sharedPlanUuid &&
		(props.empireList || props.planUuid || props.planetNaturalId)
	) {
		throw new Error(
			"PlanningDataLoader: Loading shared plan must not load any other planning data."
		);
	}
	const { findEmpireCXUuid } = useCXData();

	const knowsEmpire = (list: PlanEmpireElement[], empireUuid: string) =>
		list.some((e) => e.uuid === empireUuid);
	const queryStore = useQueryStore();
	const done: Ref<boolean> = ref(false);

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
			[newEmpire, newPlan, _newPlanet, _newShared],
			[oldEmpire, oldPlan, _oldPlanet, _oldShared]
		) => {
			done.value = false;

			// per step reset
			if (newEmpire !== oldEmpire) {
				const stepEmpirePlans = steps.find(
					(s) => s.cfg.key === "empirePlans"
				);
				if (stepEmpirePlans) {
					stepEmpirePlans.triggered = false;
					stepEmpirePlans.data = null;
					done.value = false;
				}

				// an empire the loaded list doesn't know (just created):
				// reload the list, its plans wait for it
				const stepEmpireList = steps.find(
					(s) => s.cfg.key === "empireList"
				);
				if (
					newEmpire &&
					stepEmpireList?.data &&
					!knowsEmpire(stepEmpireList.data, newEmpire as string)
				) {
					stepEmpireList.triggered = false;
					stepEmpireList.data = null;
				}
			}

			if (newPlan !== oldPlan) {
				const stepPlan = steps.find((s) => s.cfg.key === "plan");
				if (stepPlan) {
					stepPlan.triggered = false;
					stepPlan.data = null;
					done.value = false;
				}
			}
		}
	);

	const stepConfigs: PlanningStepConfigsType = [
		{
			key: "sharedPlan",
			name: t("wrapper.planning_data.shared_plan"),
			enabled: () => !!props.sharedPlanUuid,
			load: () =>
				queryStore.execute("GetSharedPlan", {
					sharedPlanUuid: props.sharedPlanUuid!,
				}),
			onSuccess: (data: PlanShare) => emits("data:shared:plan", data),
		},
		{
			key: "empireList",
			name: t("wrapper.planning_data.empires"),
			enabled: () => !!props.empireList,
			load: () => queryStore.execute("GetAllEmpires", undefined),
			onSuccess: (data: PlanEmpireElement[]) => {
				// no selection, or a stored one that no longer exists
				const hasNoSelection =
					!props.empireUuid || !knowsEmpire(data, props.empireUuid);

				if (hasNoSelection && data.length > 0) {
					emits("update:empireUuid", data[0].uuid);
				}

				emits("data:empire:list", data);
			},
		},
		{
			key: "plan",
			name: t("wrapper.planning_data.plan"),
			enabled: () => !!props.planUuid,
			load: () =>
				queryStore.execute("GetPlan", {
					planUuid: props.planUuid!,
				}),
			onSuccess: (data: Plan) => emits("data:plan", data),
		},
		{
			key: "planList",
			name: t("wrapper.planning_data.plans_all"),
			enabled: () => !!props.planList,
			load: () => queryStore.execute("GetAllPlans", undefined),
			onSuccess: (data: Plan[]) => {
				const planetList: string[] = Array.from(
					new Set(data.map((e) => e.planet_natural_id)).values()
				);

				emits("data:plan:list", data);
				emits("data:plan:list:planets", planetList);
			},
		},
		{
			key: "planet",
			get name() {
				return t("wrapper.planning_data.planet_data", {
					name: props.planetNaturalId ?? "",
				});
			},
			// If sharedPlanId, wait for sharedPlan; else if planetId, no depends; else never
			dependsOn: props.sharedPlanUuid ? "sharedPlan" : undefined,
			enabled: () => !!(props.sharedPlanUuid || props.planetNaturalId),
			load: () => {
				const id = props.sharedPlanUuid
					? (
							queryStore.peekQueryState(
								queryRepository.GetSharedPlan.key({
									sharedPlanUuid: props.sharedPlanUuid!,
								})
							)!.data as PlanShare
						).plan_details.planet_natural_id
					: props.planetNaturalId!;
				return queryStore.execute("GetPlanet", {
					planetNaturalId: id,
				});
			},
			onSuccess: (data: Planet) => emits("data:planet", data),
		},
		{
			key: "cx",
			name: t("wrapper.planning_data.cx"),
			enabled: () => !!props.loadCX,
			load: () => queryStore.execute("GetAllCX", undefined),
			onSuccess: (d: CX[]) => {
				emits("data:cx", d);
				if (!props.cxUuid && d.length > 0) {
					emits("update:cxUuid", d[0].uuid);
				}
			},
		},
		{
			key: "sharedList",
			name: t("wrapper.planning_data.shared_list"),
			enabled: () => !!props.loadShared,
			load: () => queryStore.execute("GetAllShared", undefined),
			onSuccess: (data: Shared[]) => emits("data:shared", data),
		},
		{
			key: "empirePlans",
			name: t("wrapper.planning_data.empire_plans"),
			// with the empire list, only load plans of an empire in it: a
			// deleted empire's uuid (e.g. the stored default) would fail
			enabled: () => {
				if (!props.empireUuid) return false;
				if (!props.empireList) return true;
				const list = steps.find((s) => s.cfg.key === "empireList")
					?.data as PlanEmpireElement[] | null;
				return !!list && knowsEmpire(list, props.empireUuid);
			},
			load: () =>
				queryStore.execute("GetEmpirePlans", {
					empireUuid: props.empireUuid!,
				}),
			onSuccess: (data: Plan[]) => {
				// emit empire data
				// emit potential empire cx uuid
				if (!props.cxUuid) {
					emits("update:cxUuid", findEmpireCXUuid(props.empireUuid!));
				}
				emits("data:empire:plans", data);
			},
		},
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const steps = reactive<StepState<any>[]>(
		stepConfigs.map((cfg) => ({
			cfg,
			data: null,
			loading: false,
			error: null,
			triggered: false,
		}))
	);

	// Orchestrator
	watchEffect(() => {
		steps.forEach((s) => {
			if (!s.triggered && s.cfg.enabled()) {
				const dep = s.cfg.dependsOn
					? steps.find((p) => p.cfg.key === s.cfg.dependsOn)
					: null;
				if (!dep || dep.data != null) {
					s.triggered = true;
					s.loading = true;
					s.error = null;
					s.cfg
						.load()
						.then((d) => {
							const shallowData = inertClone(d);
							s.data = shallowData;
							s.cfg.onSuccess(shallowData);
						})
						.catch((e) => {
							s.error =
								e instanceof Error ? e : new Error(String(e));
						})
						.finally(() => {
							s.loading = false;
						});
				}
			}
		});
	});

	const loadingSteps = computed(() =>
		steps
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

	const allLoaded = computed(() =>
		steps
			.filter((s) => s.cfg.enabled())
			.every((s) => !s.loading && s.error == null && s.data != null)
	);

	watch(
		allLoaded,
		(ok) => {
			if (ok) {
				emits("complete");
				done.value = true;
			}
		},
		{ immediate: true }
	);

	const results = computed(() => {
		const data = {
			sharedPlan: steps.find((s) => s.cfg.key === "sharedPlan")
				?.data as PlanShare,
			empireList: steps.find((s) => s.cfg.key === "empireList")
				?.data as PlanEmpireElement[],
			planetData: steps.find((s) => s.cfg.key === "planet")
				?.data as Planet,
			planData: steps.find((s) => s.cfg.key === "plan")?.data as Plan,
			planList: steps.find((s) => s.cfg.key === "planList")
				?.data as Plan[],
			sharedData: steps.find((s) => s.cfg.key === "sharedList")
				?.data as Shared[],
			empirePlansData: steps.find((s) => s.cfg.key === "empirePlans")
				?.data as Plan[],
			empirePlanetList: computed(() => {
				/*
					empire planet list can either come from loading empire plans
					directly or by just loading a list of empire which would
					potentially require to fetch all planets
				*/
				const empirePlans = steps.find(
					(s) => s.cfg.key === "empirePlans"
				)?.data as undefined | Plan[];

				const empireList = steps.find((s) => s.cfg.key === "empireList")
					?.data as undefined | PlanEmpireElement[];

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

				return [] as string[];
			}),
		};

		/*
			The plan definition (i.e. the actual plan setup) depends on the
			requested parameters with the following variants:

			1) shared plan uuid provided, shared plan to use
			2) plan uuid provided, plan data to use
			3) only planet natural id provided, new plan definition created
		*/
		const planDefinition = props.sharedPlanUuid
			? data.sharedPlan.plan_details
			: props.planUuid
				? data.planData
				: data.planetData
					? createBlankDefinition(
							data.planetData.planet_natural_id,
							data.planetData.active_cogc_program_type
						)
					: undefined;

		// if there is a shared plan uuid, the plan editing is disabled
		const disabled: boolean = props.sharedPlanUuid ? true : false;

		return { ...data, planDefinition, disabled };
	});

	return {
		done,
		allLoaded,
		hasError,
		loadingSteps,
		results: results,
	};
}
