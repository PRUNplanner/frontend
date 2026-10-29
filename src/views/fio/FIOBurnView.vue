<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		onUnmounted,
		type Ref,
		ref,
	} from "vue";
	import { debounce } from "lodash-es";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useHead } from "@unhead/vue";

	useHead({
		title: t("fio.burn.view_title"),
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";
	const planningStore = usePlanningStore();
	const userStore = useUserStore();

	// Composables
	import { useFIOBurn } from "@/features/fio/useFIOBurn";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import {
		getActiveEmpire,
		usePlanContext,
	} from "@/features/planning/usePlanContext";
	import { calculatePlan } from "@/features/planning/engine/calculatePlan";
	import { planResultCacheKey } from "@/features/empire/empire.util";
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
	import { yieldToBrowser } from "@/util/yieldToBrowser";

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PSelect, PForm, PFormItem, PInputNumber, PNotice } from "@/ui";
	import { buttonConfig } from "@/ui/styles";

	// a link that looks like the primary button
	const primaryLinkClass = [
		buttonConfig.base,
		buttonConfig.sizes.md.base,
		buttonConfig.colors.primary.base,
		buttonConfig.colors.primary.hover,
		"w-fit",
	].join(" ");

	const isCalculating: Ref<boolean> = ref(false);

	const internalEmpireUuid = ref(defaultEmpireUuid.value);

	const selectedEmpireUuid = computed({
		get: () => internalEmpireUuid.value,
		set: (val) => {
			if (val) {
				internalEmpireUuid.value = val;
				defaultEmpireUuid.value = val;
			}
		},
	});

	const selectedCXUuid: Ref<string | undefined> = ref(undefined);
	const planData: Ref<Plan[]> = ref([]);
	const empireList: Ref<PlanEmpireElement[]> = ref([]);
	const calculatedPlans: Ref<Record<string, IPlanResult>> = ref({});

	const selectedEmpireName = computed(
		() =>
			empireList.value.find((e) => e.uuid == selectedEmpireUuid.value)
				?.empire_name
	);

	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	const cacheCalculatedPlans = new Map<string, IPlanResult>();
	const { loadGameData, createContext } = usePlanContext();

	// only the latest run writes its results
	let run = 0;
	onUnmounted(() => run++);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @param {boolean} [clearCache=false] Recalculate cached plans
	 * @param {boolean} [quiet=false] Keep the page instead of the progress
	 * screen, show the results when done
	 * @returns {Promise<void>}
	 */
	async function calculateEmpire(
		clearCache = false,
		quiet = false
	): Promise<void> {
		const current = ++run;
		// a run calculates the empire, cx and plans it started with
		const plans = planData.value;
		const empireUuid = selectedEmpireUuid.value;
		const cxUuid = selectedCXUuid.value;
		const empires = empireList.value;

		if (!quiet) {
			isCalculating.value = true;
			calculatedPlans.value = {};
		}
		const results: Record<string, IPlanResult> = {};
		progressTotal.value = plans.length;
		progressCurrent.value = 0;

		if (clearCache) cacheCalculatedPlans.clear();

		try {
			// game data once for all plans
			const gameData = await loadGameData();
			if (current !== run) return;

			for (const plan of plans) {
				// note, calculation depends on empire + cx, so a plan is only
				// calculated properly within this context

				const cacheKey: string = planResultCacheKey(
					plan.uuid,
					empireUuid,
					cxUuid
				);

				if (cacheCalculatedPlans.has(cacheKey)) {
					results[plan.uuid] = cacheCalculatedPlans.get(cacheKey)!;
					progressCurrent.value++;
				} else {
					await Promise.resolve();
					const context = await createContext(
						gameData,
						plan.planet_natural_id,
						cxUuid
					);
					if (current !== run) return;

					const { result } = calculatePlan(
						{
							plan,
							empire: getActiveEmpire(empireUuid, empires),
							cxUuid,
							// never read by this view
							recipeOptions: false,
						},
						context
					);
					results[plan.uuid] = result;
					progressCurrent.value++;

					// cache
					cacheCalculatedPlans.set(cacheKey, result);
					// yield back to vue and update DOM
					await yieldToBrowser();
					if (current !== run) return;
				}
			}
			calculatedPlans.value = results;

			if (plans.length > 0 && !quiet)
				trackEvent("tool:use", { tool_name: "fio_burn" });
		} catch (err) {
			if (current === run) console.error(err);
		} finally {
			if (current === run) isCalculating.value = false;
		}
	}

	// another tab changed the empire or its plans; the list and the plans
	// steps refresh one after the other, calculate once
	const recalculateRefreshed = debounce(
		() => calculateEmpire(true, true),
		200
	);
	onUnmounted(() => recalculateRefreshed.cancel());

	const { burnTable, planTable } = useFIOBurn(planData, calculatedPlans);
</script>

<template>
	<WrapperPlanningDataLoader
		empire-list
		:empire-uuid="selectedEmpireUuid"
		@update:cx-uuid="
			(value: string | undefined) => (selectedCXUuid = value)
		"
		@data:empire:list="(value: PlanEmpireElement[]) => (empireList = value)"
		@data:empire:plans="(value: Plan[]) => (planData = value)"
		@refreshed="recalculateRefreshed">
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
						class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
						<h1 class="text-2xl font-normal my-auto">
							<template v-if="selectedEmpireName">
								{{ $t("fio.burn.title") }}
								<span class="font-bold">
									{{ selectedEmpireName }}
								</span>
							</template>
							<template v-else>
								{{ $t("fio.burn.view_title") }}
							</template>
						</h1>
						<div class="flex flex-row gap-x-3">
							<div v-if="userStore.hasFIO" class="my-auto">
								{{
									$t("fio.burn.fio_last_update", {
										last_updated: relativeFromDate(
											planningStore.fio_storage_timestamp ??
												undefined,
											true
										),
									})
								}}
							</div>
							<HelpDrawer file-name="fio_burn" />
						</div>
					</div>

					<section
						v-if="!empireList.length"
						class="max-w-2xl m-3 sm:m-6 p-4 sm:p-6 border border-white/10 rounded flex flex-col gap-3"
						data-testid="fio-burn-no-empire">
						<h2 class="text-2xl font-bold">
							{{ $t("fio.burn.states.no_empire_title") }}
						</h2>
						<p class="text-white/80">
							{{ $t("fio.burn.states.no_empire") }}
						</p>
						<router-link to="/manage" :class="primaryLinkClass">
							{{ $t("fio.burn.states.create_empire") }}
						</router-link>
					</section>
					<div v-else-if="!userStore.hasFIO" class="px-6 py-4">
						<PNotice class="max-w-190" data-testid="fio-burn-no-fio">
							<b class="block font-medium text-ink-strong">
								{{ $t("fio.burn.states.no_fio_title") }}
							</b>
							<i18n-t keypath="fio.burn.states.no_fio" tag="span">
								<template #link>
									<router-link
										to="/profile#fio"
										class="text-link hover:underline">
										{{ $t("fio.burn.states.profile") }}
									</router-link>
								</template>
							</i18n-t>
						</PNotice>
					</div>
					<div
						v-else
						class="grow grid grid-cols-1 content-start xl:content-stretch xl:grid-cols-[40%_minmax(0,1fr)] gap-3 divide-x divide-white/10 child:min-w-0 child:px-6 child:py-3">
						<div>
							<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
								<div>
									<h2
										class="text-white/80 font-bold text-lg pb-3">
										{{ $t("fio.burn.form.empire") }}
									</h2>

									<PSelect
										v-model:value="selectedEmpireUuid"
										:aria-label="$t('fio.burn.form.empire')"
										:options="
											empireList.map((e) => {
												return {
													label: e.empire_name,
													value: e.uuid,
												};
											})
										" />
								</div>
								<div>
									<h2
										class="text-white/80 font-bold text-lg pb-3">
										{{
											$t("fio.burn.form.burn_thresholds")
										}}
									</h2>

									<PForm>
										<PFormItem
											:label="t('fio.burn.form.red')">
											<PInputNumber
												v-model:value="burnDaysRed"
												show-buttons
												:min="1"
												class="w-full max-w-100" />
										</PFormItem>
										<PFormItem
											:label="t('fio.burn.form.yellow')">
											<PInputNumber
												v-model:value="burnDaysYellow"
												show-buttons
												:min="1"
												class="w-full max-w-100" />
										</PFormItem>
									</PForm>
								</div>
							</div>

							<h2 class="text-white/80 font-bold text-lg pb-3">
								{{ $t("fio.burn.components.overview.title") }}
							</h2>

							<AsyncFIOBurnPlanTable :plan-table="planTable" />
						</div>
						<div class="md:pl-3!">
							<AsyncFIOBurnTable :burn-table="burnTable" />
						</div>
					</div>
				</div>
			</AsyncWrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
