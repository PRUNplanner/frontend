<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		defineAsyncComponent,
		Ref,
		ref,
		toRef,
	} from "vue";

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: "Burn | PRUNplanner",
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	const planningStore = usePlanningStore();

	// Composables
	import { useFIOBurn } from "@/features/fio/useFIOBurn";
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { defaultEmpireUuid, burnDaysRed, burnDaysYellow } = usePreferences();

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import ComputingProgress from "@/layout/components/ComputingProgress.vue";

	const AsyncWrapperGameDataLoader = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGameDataLoader.vue")
	);
	const AsyncFIOBurnPlanTable = defineAsyncComponent(
		() => import("@/features/fio/components/FIOBurnPlanTable.vue")
	);
	const AsyncFIOBurnTable = defineAsyncComponent(
		() => import("@/features/fio/components/FIOBurnTable.vue")
	);

	// Util
	import { relativeFromDate } from "@/util/date";

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import {
		IFIOBurnPlanetTableElement,
		IFIOBurnTableElement,
	} from "@/features/fio/useFIOBurn.types";

	// UI
	import { PSelect, PForm, PFormItem, PInputNumber } from "@/ui";

	const isCalculating: Ref<boolean> = ref(false);
	const selectedEmpireUuid: Ref<string | undefined> = ref(defaultEmpireUuid);
	const selectedCXUuid: Ref<string | undefined> = ref(undefined);
	const planData: Ref<IPlan[]> = ref([]);
	const empireList: Ref<IPlanEmpireElement[]> = ref([]);
	const calculatedPlans: Ref<Record<string, IPlanResult>> = ref({});

	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */

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
					empireList,
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
	}

	const burnTable: ComputedRef<IFIOBurnTableElement[]> = computed(() => {
		return useFIOBurn(planData, calculatedPlans).burnTable.value;
	});

	const planTable: ComputedRef<IFIOBurnPlanetTableElement[]> = computed(
		() => {
			return useFIOBurn(planData, calculatedPlans).planTable.value;
		}
	);
</script>

<template>
	<WrapperPlanningDataLoader
		:key="`WrapperPlanningDataLoader#${selectedEmpireUuid}`"
		empire-list
		:empire-uuid="selectedEmpireUuid"
		@update:cx-uuid="
			(value: string | undefined) => (selectedCXUuid = value)
		"
		@data:empire:list="
			(value: IPlanEmpireElement[]) => (empireList = value)
		"
		@data:empire:plans="(value: IPlan[]) => (planData = value)">
		<template #default="{ empirePlanetList }">
			<AsyncWrapperGameDataLoader
				:key="`GAMEDATAWRAPPER#${selectedEmpireUuid}`"
				load-materials
				load-exchanges
				load-recipes
				load-buildings
				:load-planet-multiple="empirePlanetList"
				@complete="calculateEmpire">
				<ComputingProgress
					v-if="isCalculating"
					:step="progressCurrent"
					:total="progressTotal"
					message="One does not simply calculate automate burn supply." />
				<div v-else class="min-h-screen flex flex-col">
					<div
						class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
						<h1 class="text-2xl font-bold my-auto">FIO Burn</h1>
						<div class="flex flex-row gap-x-3">
							<div class="my-auto">
								FIO Data Update:
								{{
									relativeFromDate(
										planningStore.fio_sites_timestamp ?? 0
									)
								}}
							</div>
							<HelpDrawer file-name="fio_burn" />
						</div>
					</div>

					<div
						class="flex-grow grid grid-cols-1 xl:grid-cols-[40%_auto] gap-3 divide-x divide-white/10 child:px-6 child:py-3">
						<div>
							<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
								<div>
									<h2
										class="text-white/80 font-bold text-lg pb-3">
										Empire
									</h2>

									<PSelect
										v-model:value="selectedEmpireUuid"
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
										selectedEmpireUuid = value;
										defaultEmpireUuid = value;
									}
								" />
								</div>
								<div>
									<h2
										class="text-white/80 font-bold text-lg pb-3">
										Burn Thresholds
									</h2>

									<PForm>
										<PFormItem label="Red">
											<PInputNumber
												v-model:value="burnDaysRed"
												show-buttons
												:min="1"
												class="w-full max-w-[400px]" />
										</PFormItem>
										<PFormItem label="Yellow">
											<PInputNumber
												v-model:value="burnDaysYellow"
												show-buttons
												:min="1"
												class="w-full max-w-[400px]" />
										</PFormItem>
									</PForm>
								</div>
							</div>

							<h2 class="text-white/80 font-bold text-lg pb-3">
								Plan Burn Overview
							</h2>

							<AsyncFIOBurnPlanTable :plan-table="planTable" />
						</div>
						<div class="md:!pl-3">
							<AsyncFIOBurnTable :burn-table="burnTable" />
						</div>
					</div>
				</div>
			</AsyncWrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
