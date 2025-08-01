<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		defineAsyncComponent,
		ref,
		Ref,
		toRef,
	} from "vue";

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: "Empire | PRUNplanner",
	});

	// Composables
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { combineEmpireMaterialIO } = useMaterialIOUtil();
	const { defaultEmpireUuid } = usePreferences();

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";

	const AsyncWrapperGameDataLoader = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGameDataLoader.vue")
	);
	const AsyncEmpirePlanList = defineAsyncComponent(
		() => import("@/features/empire/components/EmpirePlanList.vue")
	);
	const AsyncEmpireMaterialIO = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireMaterialIO.vue")
	);
	const AsyncEmpireConfiguration = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireConfiguration.vue")
	);

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import {
		IEmpireCostOverview,
		IEmpirePlanListData,
		IEmpirePlanMaterialIO,
	} from "@/features/empire/empire.types";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { NForm, NFormItem, NSelect } from "naive-ui";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useQueryRepository } from "@/lib/query_cache/queryRepository";

	const props = defineProps({
		empireUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const selectedEmpireUuid: Ref<string | undefined> = ref(
		props.empireUuid ? props.empireUuid : defaultEmpireUuid
	);
	const selectedCXUuid: Ref<string | undefined> = ref(undefined);
	const refEmpireList: Ref<IPlanEmpireElement[]> = ref([]);

	const calculatedPlans: Ref<Record<string, IPlanResult>> = ref({});
	const isCalculating: Ref<boolean> = ref(false);
	const planData: Ref<IPlan[]> = ref([]);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function calculateEmpire(): Promise<void> {
		isCalculating.value = true;
		// reset calculations
		calculatedPlans.value = {};

		// calculate all plans, pass in references as the
		// empire might be updated
		planData.value.forEach((plan) => {
			calculatedPlans.value[plan.uuid!] = usePlanCalculation(
				toRef(plan),
				selectedEmpireUuid,
				refEmpireList,
				selectedCXUuid
			).result.value;
		});

		isCalculating.value = false;
	}

	/**
	 * Reloads empires forcefully by triggering store reload
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function reloadEmpires(): Promise<void> {
		try {
			// make a forced call to also update store
			refEmpireList.value = await useQuery(
				useQueryRepository().repository.GetAllEmpires
			).execute();
		} catch (err) {
			console.error("Error reloading empires", err);
		}
	}

	/**
	 * Holds computed empire data for the currently selected empire.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IPlanEmpireElement | undefined>} Empire Data
	 */
	const selectedEmpire: ComputedRef<IPlanEmpireElement | undefined> =
		computed(() => {
			return refEmpireList.value.find(
				(e) => e.uuid == selectedEmpireUuid.value
			);
		});

	/**
	 * Holds computed cost overview based on plan results.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpireCostOverview>} Empire Cost overview
	 */
	const costOverview: ComputedRef<IEmpireCostOverview> = computed(() => {
		const totalProfit: number = Object.values(calculatedPlans.value).reduce(
			(sum, element) => sum + element.profit,
			0
		);
		const totalRevenue: number = Object.values(
			calculatedPlans.value
		).reduce((sum, element) => sum + element.revenue, 0);
		const totalCost: number = Object.values(calculatedPlans.value).reduce(
			(sum, element) => sum + element.cost,
			0
		);

		return {
			totalProfit,
			totalRevenue,
			totalCost,
		};
	});

	/**
	 * Holds computed empire name.
	 * @author jplacht
	 *
	 * @type {ComputedRef<string>} Empire Cost overview
	 */
	const empireName: ComputedRef<string> = computed(() => {
		if (selectedEmpire.value) {
			return selectedEmpire.value.name;
		}
		return "Unknown";
	});

	/**
	 * Holds computed empire plan data basic data.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpirePlanListData[]>} Plan List Data
	 */
	const planListData: ComputedRef<IEmpirePlanListData[]> = computed(() => {
		return Object.entries(calculatedPlans.value).map(
			([planUuid, planResult]) => {
				const plan: IPlan = planData.value.find(
					(p) => p.uuid == planUuid
				)!;

				return {
					uuid: planUuid,
					name: plan.name,
					planet: plan.baseplanner_data.planet.planetid,
					permits: plan.baseplanner_data.planet.permits,
					cogc: plan!.baseplanner_data.planet.cogc,
					profit: planResult.profit,
				};
			}
		);
	});

	/**
	 * Holds computed material i/o per plan with additional information.
	 * @author jplacht
	 *
	 * @type {ComputedRef<IEmpirePlanMaterialIO[]>} Empire Material IO Data
	 */
	const empireMaterialIO: ComputedRef<IEmpirePlanMaterialIO[]> = computed(
		() => {
			return Object.entries(calculatedPlans.value).map(
				([planUuid, planResult]) => {
					const plan: IPlan = planData.value.find(
						(p) => p.uuid == planUuid
					)!;
					return {
						planetId: plan.baseplanner_data.planet.planetid,
						planUuid: planUuid,
						planName: plan.name ?? "Unknown Plan Name",
						materialIO: planResult.materialio,
					};
				}
			);
		}
	);
</script>

<template>
	<WrapperPlanningDataLoader
		:key="`WrapperPlanningDataLoader#${selectedEmpireUuid}`"
		empire-list
		:empire-uuid="selectedEmpireUuid"
		@data:empire:plans="(value: IPlan[]) => (planData = value)"
		@update:empire-uuid="(value: string) => (selectedEmpireUuid = value)"
		@update:cx-uuid="
			(value: string | undefined) => (selectedCXUuid = value)
		"
		@data:empire:list="
			(value: IPlanEmpireElement[]) => (refEmpireList = value)
		">
		<template #default="{ empireList, empirePlanetList }">
			<AsyncWrapperGameDataLoader
				:key="`GAMEDATAWRAPPER#${selectedEmpireUuid}`"
				load-materials
				load-exchanges
				load-recipes
				load-buildings
				:load-planet-multiple="empirePlanetList"
				@complete="calculateEmpire">
				<template v-if="isCalculating">
					<div>Calculating</div>
				</template>
				<template v-else>
					<div class="min-h-screen flex flex-col">
						<div
							class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
							<h1 class="text-2xl font-bold my-auto">
								{{ empireName }}
							</h1>
						</div>

						<div
							class="flex-grow grid grid-cols-1 lg:grid-cols-[40%_auto] divide-x divide-white/10">
							<div>
								<div
									class="px-6 pb-3 pt-4 border-b border-white/10 my-auto">
									<n-form
										label-placement="left"
										label-width="auto"
										label-align="left"
										size="small">
										<n-form-item label="Switch Empire">
											<n-select
												v-model:value="
													selectedEmpireUuid
												"
												:options="
													empireList.map((e) => {
														return {
															label: e.name,
															value: e.uuid,
														};
													})
												"
												@update-value="
													(value: string) => {
														selectedEmpireUuid =
															value;
														defaultEmpireUuid =
															value;
													}
												" />
										</n-form-item>
									</n-form>
								</div>
								<div class="p-6 border-b border-white/10">
									<div
										class="grid grid-cols-1 lg:grid-cols-3 gap-6 child:child:text-center">
										<div>
											<div class="text-white/40 text-xs">
												Profit
											</div>
											<div class="text-white text-xl">
												{{
													formatNumber(
														costOverview.totalProfit
													)
												}}
											</div>
											<div class="text-white/40 text-xs">
												{{
													formatNumber(
														(costOverview.totalProfit /
															costOverview.totalRevenue) *
															100
													)
												}}
												%
											</div>
										</div>
										<div>
											<div class="text-white/40 text-xs">
												Revenue
											</div>
											<div class="text-white text-xl">
												{{
													formatNumber(
														costOverview.totalRevenue
													)
												}}
											</div>
										</div>
										<div>
											<div class="text-white/40 text-xs">
												Cost
											</div>
											<div class="text-white text-xl">
												{{
													formatNumber(
														costOverview.totalCost
													)
												}}
											</div>
											<div class="text-white/40 text-xs">
												{{
													formatNumber(
														(costOverview.totalCost /
															costOverview.totalRevenue) *
															100
													)
												}}
												%
											</div>
										</div>
									</div>
								</div>
								<div class="p-6 border-b border-white/10">
									<Suspense>
										<AsyncEmpirePlanList
											:plan-list-data="planListData" />
										<template #fallback>
											<RenderingProgress :height="200" />
										</template>
									</Suspense>
								</div>
								<div class="p-6 border-b border-white/10">
									<Suspense v-if="selectedEmpire">
										<AsyncEmpireConfiguration
											:data="selectedEmpire"
											@reload:empires="reloadEmpires" />
										<template #fallback>
											<RenderingProgress :height="200" />
										</template>
									</Suspense>
								</div>
							</div>
							<div class="p-6">
								<Suspense>
									<AsyncEmpireMaterialIO
										:empire-material-i-o="
											combineEmpireMaterialIO(
												empireMaterialIO
											)
										" />
									<template #fallback>
										<RenderingProgress :height="400" />
									</template>
								</Suspense>
							</div>
						</div>
					</div>
				</template>
			</AsyncWrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
