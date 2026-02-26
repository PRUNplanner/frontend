import { computed, reactive, ref, Ref, watch, watchEffect } from "vue";

// Stores & Repository
import { useQueryRepository } from "@/lib/query_cache/queryRepository";
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Composables
import { usePlan } from "@/features/planning_data/usePlan";
import { useCXData } from "@/features/cx/useCXData";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import {
	PlanningDataLoaderEmits,
	PlanningDataLoaderProps,
	PlanningStepConfigsType,
} from "@/features/wrapper/planningDataLoader.types";
import { StepState } from "@/features/wrapper/dataLoader.types";
import {
	ICX,
	IPlan,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";
import { IPlanet } from "@/features/api/gameData.types";
import { IShared } from "@/features/api/sharingData.types";

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

	if (
		props.sharedPlanUuid &&
		(props.empireList || props.planUuid || props.planetNaturalId)
	) {
		throw new Error(
			"PlanningDataLoader: Loading shared plan must not load any other planning data."
		);
	}
	const { findEmpireCXUuid } = useCXData();
	const queryStore = useQueryStore();
	const done: Ref<boolean> = ref(false);

	const { createBlankDefinition } = usePlan();

	const stepConfigs: PlanningStepConfigsType = [
		{
			key: "sharedPlan",
			name: "Shared Plan Configuration",
			enabled: () => !!props.sharedPlanUuid,
			load: () =>
				queryStore.execute("GetSharedPlan", {
					sharedPlanUuid: props.sharedPlanUuid!,
				}),
			onSuccess: (data: IPlanShare) => emits("data:shared:plan", data),
		},
		{
			key: "empireList",
			name: "Empires Configurations",
			enabled: () => !!props.empireList,
			load: () => queryStore.execute("GetAllEmpires", undefined),
			onSuccess: (data: IPlanEmpireElement[]) => {
				if (!props.empireUuid) {
					/*
						It might be required to send the empire uuid of the first
						available empire fetched as there could be a frontend select
						needing a value or a full refresh happing, e.g. default empire
						uuid missing or not set.
					*/

					if (data.length > 0)
						emits("update:empireUuid", data[0].uuid);
				}
				emits("data:empire:list", data);
			},
		},
		{
			key: "plan",
			name: "Plan Configuration",
			enabled: () => !!props.planUuid,
			load: () =>
				queryStore.execute("GetPlan", {
					planUuid: props.planUuid!,
				}),
			onSuccess: (data: IPlan) => emits("data:plan", data),
		},
		{
			key: "planList",
			name: "All Plan Configurations",
			enabled: () => !!props.planList,
			load: () => queryStore.execute("GetAllPlans", undefined),
			onSuccess: (data: IPlan[]) => {
				const planetList: string[] = Array.from(
					new Set(data.map((e) => e.planet_natural_id)).values()
				);

				emits("data:plan:list", data);
				emits("data:plan:list:planets", planetList);
			},
		},
		{
			key: "planet",
			name: "Planet Data",
			// If sharedPlanId, wait for sharedPlan; else if planetId, no depends; else never
			dependsOn: props.sharedPlanUuid ? "sharedPlan" : undefined,
			enabled: () => !!(props.sharedPlanUuid || props.planetNaturalId),
			load: () => {
				const id = props.sharedPlanUuid
					? (
							queryStore.peekQueryState(
								useQueryRepository().repository.GetSharedPlan.key(
									{
										sharedPlanUuid: props.sharedPlanUuid!,
									}
								)
							)!.data as IPlanShare
						).plan_details.planet_natural_id
					: props.planetNaturalId!;
				return queryStore.execute("GetPlanet", {
					planetNaturalId: id,
				});
			},
			onSuccess: (data: IPlanet) => emits("data:planet", data),
		},
		{
			key: "cx",
			name: "CX Configurations",
			enabled: () => !!props.loadCX,
			load: () => queryStore.execute("GetAllCX", undefined),
			onSuccess: (d: ICX[]) => {
				emits("data:cx", d);
				if (!props.cxUuid && d.length > 0) {
					emits("update:cxUuid", d[0].uuid);
				}
			},
		},
		{
			key: "sharedList",
			name: "Shared Plan Configurations",
			enabled: () => !!props.loadShared,
			load: () => queryStore.execute("GetAllShared", undefined),
			onSuccess: (data: IShared[]) => emits("data:shared", data),
		},
		{
			key: "empirePlans",
			name: "Empire Plans",
			enabled: () => !!props.empireUuid,
			load: () =>
				queryStore.execute("GetEmpirePlans", {
					empireUuid: props.empireUuid!,
				}),
			onSuccess: (data: IPlan[]) => {
				// emit empire data
				emits("data:empire:plans", data);
				// emit potential empire cx uuid
				if (!props.cxUuid) {
					emits("update:cxUuid", findEmpireCXUuid(props.empireUuid!));
				}
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
				?.data as IPlanShare,
			empireList: steps.find((s) => s.cfg.key === "empireList")
				?.data as IPlanEmpireElement[],
			planetData: steps.find((s) => s.cfg.key === "planet")
				?.data as IPlanet,
			planData: steps.find((s) => s.cfg.key === "plan")?.data as IPlan,
			planList: steps.find((s) => s.cfg.key === "planList")
				?.data as IPlan[],
			sharedData: steps.find((s) => s.cfg.key === "sharedList")
				?.data as IShared[],
			empirePlansData: steps.find((s) => s.cfg.key === "empirePlans")
				?.data as IPlan[],
			empirePlanetList: computed(() => {
				/*
					empire planet list can either come from loading empire plans
					directly or by just loading a list of empire which would
					potentially require to fetch all planets
				*/
				const empirePlans = steps.find(
					(s) => s.cfg.key === "empirePlans"
				)?.data as undefined | IPlan[];

				const empireList = steps.find((s) => s.cfg.key === "empireList")
					?.data as undefined | IPlanEmpireElement[];

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
