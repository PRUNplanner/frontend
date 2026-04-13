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
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { combineEmpireMaterialIO, empireMaterialIOState } =
		await useMaterialIOUtil();
	const { defaultEmpireUuid } = usePreferences();

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";
	import ComputingProgress from "@/layout/components/ComputingProgress.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import EmpireMaterialIOFiltered from "@/features/empire/components/EmpireMaterialIOFiltered.vue";

	const AsyncEmpireCostOverview = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireCostOverview.vue")
	);
	const AsyncEmpirePlanList = defineAsyncComponent(
		() => import("@/features/empire/components/EmpirePlanList.vue")
	);

	const AsyncEmpireConfiguration = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireConfiguration.vue")
	);

	const AsyncWrapperGenericError = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGenericError.vue")
	);

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import {
		IEmpireCostOverview,
		IEmpireMaterialIO,
		IEmpirePlanListData,
		IEmpirePlanMaterialIO,
	} from "@/features/empire/empire.types";

	// UI
	import PForm from "@/ui/components/PForm.vue";
	import PFormItem from "@/ui/components/PFormItem.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import PButton from "@/ui/components/PButton.vue";
	import PButtonGroup from "@/ui/components/PButtonGroup.vue";
	import PSpin from "@/ui/components/PSpin.vue";

	const props = defineProps({
		empireUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const internalEmpireUuid = ref(props.empireUuid || defaultEmpireUuid.value);

	const selectedEmpireUuid = computed({
		get: () => props.empireUuid || internalEmpireUuid.value,
		set: (val) => {
			if (val) {
				internalEmpireUuid.value = val;
				defaultEmpireUuid.value = val;
			}
		},
	});

	const selectedCXUuid: Ref<string | undefined> = ref(undefined);
	const refEmpireList: Ref<IPlanEmpireElement[]> = ref([]);

	const calculatedPlans: Ref<Record<string, IPlanResult>> = ref({});
	const planData: Ref<IPlan[]> = ref([]);

	const isCalculating: Ref<boolean> = ref(true);
	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */

	const cacheCalculatedPlans = new Map<string, IPlanResult>();

	async function calculateEmpire(clearCache = false): Promise<void> {
		isCalculating.value = true;

		calculatedPlans.value = {};
		progressTotal.value = planData.value.length;
		progressCurrent.value = 0;

		if (clearCache) cacheCalculatedPlans.clear();

		for (const plan of planData.value) {
			// note, calculation depends on empire + cx, so a plan is only
			// calculated properly within this context

			const cacheKey: string = `${plan.uuid}#${selectedCXUuid.value}#${selectedCXUuid.value}`;

			if (cacheCalculatedPlans.has(cacheKey)) {
				calculatedPlans.value[plan.uuid!] =
					cacheCalculatedPlans.get(cacheKey)!;
				progressCurrent.value++;
			} else {
				await Promise.resolve();

				const { calculate } = await usePlanCalculation(
					toRef(plan),
					selectedEmpireUuid,
					refEmpireList,
					selectedCXUuid
				);

				const result = await calculate();
				calculatedPlans.value[plan.uuid!] = result;
				progressCurrent.value++;

				// cache
				cacheCalculatedPlans.set(cacheKey, result);
				// yield back to vue and update DOM
				await new Promise((r) => setTimeout(r, 0));
			}
		}

		isCalculating.value = false;

		empireMaterialIOState(
			selectedEmpire.value,
			combinedEmpireMaterialIO.value
		).then((data) => {
			if (data && selectedEmpire.value)
				useQuery("PatchEmpireState", {
					empireUuid: selectedEmpire.value.uuid,
					empireState: data,
				}).execute();
		});
	}

	/**
	 * Reloads empires forcefully by triggering store reload
	 * @author jplacht
	 *
	 * @async
	 */
	async function reloadEmpires() {
		// make a forced call to also update store
		refEmpireList.value = await useQuery("GetAllEmpires").execute();
		// trigger recalculation, changed config required new calculation
		await calculateEmpire(true);
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
		const totalAreaUsed: number = Object.values(
			calculatedPlans.value
		).reduce((sum, element) => sum + element.area.areaUsed, 0);

		return {
			totalProfit,
			totalRevenue,
			totalCost,
			totalAreaUsed,
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
			return selectedEmpire.value.empire_name;
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
					name: plan.plan_name,
					planet: plan.planet_natural_id,
					permits: plan.plan_permits_used,
					cogc: plan.plan_cogc,
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
						planetId: plan.planet_natural_id,
						planUuid: planUuid,
						planName: plan.plan_name ?? "Unknown Plan Name",
						planCOGC: plan.plan_cogc,
						materialIO: planResult.materialio,
					};
				}
			);
		}
	);

	const combinedEmpireMaterialIO: ComputedRef<IEmpireMaterialIO[]> = computed(
		() => combineEmpireMaterialIO(empireMaterialIO.value)
	);

	/**
	 * Holds computed empire options
	 *
	 * @author jplacht
	 */
	const empireOptions = computed(() =>
		refEmpireList.value.map((e) => {
			return {
				label: e.empire_name,
				value: e.uuid,
			};
		})
	);

	const mainContent = ref<"materialio" | "analysis" | "opportunities">(
		"materialio"
	);
</script>

<template>
	<WrapperPlanningDataLoader
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
		<template #default="{ empirePlanetList }">
			<WrapperGameDataLoader
				load-materials
				load-buildings
				load-recipes
				load-exchanges
				:load-planet-multiple="empirePlanetList"
				@complete="calculateEmpire">
				<AsyncWrapperGenericError
					v-if="refEmpireList.length === 0"
					message-title="No Empires"
					message-text="You don't have any empires. Head to Management to create your first." />

				<ComputingProgress
					v-else-if="isCalculating"
					:step="progressCurrent"
					:total="progressTotal"
					message="One does not simply calculate empire plans." />

				<div v-else>
					<div class="flex-1 flex flex-col">
						<div
							class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
							<div class="flex flex-row gap-3">
								<h1 class="text-2xl font-bold my-auto">
									{{ empireName }}
								</h1>
								<PSpin v-if="isCalculating" />
							</div>
							<div class="gap-3 flex flex-row flex-wrap">
								<PButtonGroup>
									<PButton
										:type="
											mainContent === 'materialio'
												? 'primary'
												: 'secondary'
										"
										@click="
											() => (mainContent = 'materialio')
										">
										Material I/O
									</PButton>
									<PButton
										:type="
											mainContent === 'analysis'
												? 'primary'
												: 'secondary'
										"
										@click="
											() => (mainContent = 'analysis')
										">
										Analysis
									</PButton>
									<PButton
										:type="
											mainContent === 'opportunities'
												? 'primary'
												: 'secondary'
										"
										@click="
											() =>
												(mainContent = 'opportunities')
										">
										Production Opportunities
									</PButton>
								</PButtonGroup>
								<HelpDrawer file-name="empire" />
							</div>
						</div>

						<div
							class="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-6 m-3 sm:m-6">
							<div
								class="flex flex-col gap-6 justify-items-start">
								<div>
									<PForm>
										<PFormItem label="Switch Empire">
											<PSelect
												v-model:value="
													selectedEmpireUuid
												"
												class="w-full"
												:options="empireOptions" />
										</PFormItem>
									</PForm>
								</div>
								<div>
									<AsyncEmpireCostOverview
										:cost-overview="costOverview" />
								</div>
								<div class="flex flex-col gap-6">
									<div class="overflow-x-auto">
										<Suspense>
											<AsyncEmpirePlanList
												:plan-list-data="
													planListData
												" />
											<template #fallback>
												<RenderingProgress
													:height="200" />
											</template>
										</Suspense>
									</div>
									<div>
										<Suspense v-if="selectedEmpire">
											<AsyncEmpireConfiguration
												:data="selectedEmpire"
												@reload:empires="
													reloadEmpires
												" />
											<template #fallback>
												<RenderingProgress
													:height="200" />
											</template>
										</Suspense>
									</div>
								</div>
							</div>
							<div class="h-dvh min-h-0 overflow-auto">
								<EmpireMaterialIOFiltered
									:content="mainContent"
									:empire-material-i-o="
										combinedEmpireMaterialIO
									"
									:plan-list-data="planListData" />
							</div>
						</div>
					</div>
				</div>
			</WrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
