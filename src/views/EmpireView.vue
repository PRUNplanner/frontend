<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		onUnmounted,
		ref,
		type Ref,
		shallowRef,
		type ShallowRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("empire.view_title")} | PRUNplanner`,
	});

	import { debounce } from "lodash-es";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import {
		getActiveEmpire,
		usePlanContext,
	} from "@/features/planning/usePlanContext";
	import { calculatePlan } from "@/features/planning/engine/calculatePlan";
	import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { planResultCacheKey } from "@/features/empire/empire.util";
	import { calculateEmpireShippingDemand } from "@/features/empire/util/empireShippingDemand.util";
	import { profitBreakdown } from "@/features/planning/util/profitBreakdown.util";
	import { empireSplitParts } from "@/features/empire/empireAnalysis.util";
	const {
		calculateEmpireCostOverview,
		combineEmpireMaterialIO,
		empireMaterialIOState,
	} = useMaterialIOUtil();
	const { defaultEmpireUuid } = usePreferences();

	// Components
	import RenderingProgress from "@/layout/components/RenderingProgress.vue";
	import ComputingProgress from "@/layout/components/ComputingProgress.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import EmpireMaterialIOFiltered from "@/features/empire/components/EmpireMaterialIOFiltered.vue";
	import EmailNudgeBanner from "@/features/account/components/EmailNudgeBanner.vue";

	const AsyncEmpireCostOverview = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireCostOverview.vue")
	);
	const AsyncEmpirePlanList = defineAsyncComponent(
		() => import("@/features/empire/components/EmpirePlanList.vue")
	);

	const AsyncEmpireConfiguration = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireConfiguration.vue")
	);

	const AsyncEmpireOnboarding = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireOnboarding.vue")
	);
	const AsyncEmpireEmpty = defineAsyncComponent(
		() => import("@/features/empire/components/EmpireEmpty.vue")
	);

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { IPlanCalculation } from "@/features/planning/engine/engine.types";
	import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import type {
		IEmpireCostOverview,
		IEmpireMaterialIO,
		IEmpirePlanListData,
		IEmpirePlanMaterialIO,
		IEmpireShippingDemand,
		IEmpireSplitParts,
	} from "@/features/empire/empire.types";

	// UI
	import PForm from "@/ui/components/PForm.vue";
	import PFormItem from "@/ui/components/PFormItem.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import PButton from "@/ui/components/PButton.vue";
	import PButtonGroup from "@/ui/components/PButtonGroup.vue";
	import { useToast } from "@/ui";
	const toast = useToast();
	import { useRouter } from "vue-router";
	const router = useRouter();

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
	const refEmpireList: Ref<PlanEmpireElement[]> = ref([]);

	const calculatedPlans: ShallowRef<Record<string, IPlanCalculation>> =
		shallowRef({});
	// the plans calculatedPlans was calculated from
	const calculatedPlanData: ShallowRef<Plan[]> = shallowRef([]);
	const planData: Ref<Plan[]> = ref([]);

	const isCalculating: Ref<boolean> = ref(true);
	const progressCurrent = ref(0);
	const progressTotal = ref(0);

	const cacheCalculatedPlans = new Map<string, IPlanCalculation>();
	const { loadGameData, createContext } = usePlanContext();

	// only the latest run writes its results, an older one stops at its
	// next yield (e.g. the empire changed while calculating)
	let run = 0;
	onUnmounted(() => run++);

	/**
	 * Calculates all given plans
	 * @author jplacht
	 *
	 * @async
	 * @param {boolean} [clearCache=false] Recalculate cached plans
	 * @param {boolean} [quiet=false] Keep the page (and an open form's
	 * edits) instead of the progress screen, show the results when done
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
		const empires = refEmpireList.value;

		if (!quiet) {
			isCalculating.value = true;
			calculatedPlans.value = {};
		}
		const results: Record<string, IPlanCalculation> = {};
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

					const calculation = calculatePlan(
						{
							plan,
							empire: getActiveEmpire(empireUuid, empires),
							cxUuid,
							// never read by this view
							recipeOptions: false,
						},
						context
					);
					results[plan.uuid] = calculation;
					progressCurrent.value++;

					// cache
					cacheCalculatedPlans.set(cacheKey, calculation);
					// yield back to vue and update DOM
					await new Promise((r) => setTimeout(r, 0));
					if (current !== run) return;
				}
			}
			calculatedPlanData.value = plans;
			calculatedPlans.value = results;
		} catch (err) {
			// e.g. game data missing, never persist a partial empire state
			if (current === run) console.error(err);
			return;
		} finally {
			if (current === run) isCalculating.value = false;
		}

		const empire = empires.find((e) => e.uuid === empireUuid);
		empireMaterialIOState(empire, combinedEmpireMaterialIO.value).then(
			(data) => {
				if (data && empire && current === run)
					useQuery("PatchEmpireState", {
						empireUuid: empire.uuid,
						empireState: data,
					})
						.execute()
						.catch(console.error);
			}
		);
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

	// another tab changed the empire or its plans; the list and the plans
	// steps refresh one after the other, calculate once
	const recalculateRefreshed = debounce(
		() => calculateEmpire(true, true),
		200
	);
	onUnmounted(() => recalculateRefreshed.cancel());

	/**
	 * Selects the empire the loader picked: the first one, when none is
	 * selected or the selected one is gone. Gone from a list that had it
	 * means deleted in another tab.
	 *
	 * @param {string} empireUuid Empire Uuid
	 */
	function selectLoadedEmpire(empireUuid: string): void {
		if (
			refEmpireList.value.some((e) => e.uuid === selectedEmpireUuid.value)
		) {
			trackEvent("app:remote_change", {
				object_type: "empire",
				has_unsaved_edits: false,
				is_deleted: true,
			});
			toast(t("save_conflict.notice.deleted_elsewhere"), {
				type: "error",
				duration: 15_000,
			});
			// the route's empire wins over the selection, leave it
			if (props.empireUuid) router.replace(`/empire/${empireUuid}`);
		}
		selectedEmpireUuid.value = empireUuid;
	}

	/**
	 * Selects a newly created empire, the loader then reloads the empire
	 * list and loads its plans
	 * @author jplacht
	 *
	 * @param {string} empireUuid Created Empire Uuid
	 */
	function selectCreatedEmpire(empireUuid: string): void {
		selectedEmpireUuid.value = empireUuid;
	}

	/**
	 * Holds computed empire data for the currently selected empire.
	 * @author jplacht
	 *
	 * @type {ComputedRef<PlanEmpireElement | undefined>} Empire Data
	 */
	const selectedEmpire: ComputedRef<PlanEmpireElement | undefined> = computed(
		() => {
			return refEmpireList.value.find(
				(e) => e.uuid == selectedEmpireUuid.value
			);
		}
	);

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
			([planUuid, { result, overview }]) => {
				const plan: Plan = calculatedPlanData.value.find(
					(p) => p.uuid == planUuid
				)!;
				const split = profitBreakdown(
					result.materialio,
					result.workforceMaterialIO,
					result.production.buildings,
					overview
				);

				return {
					uuid: planUuid,
					name: plan.plan_name,
					planet: plan.planet_natural_id,
					permits: plan.plan_permits_used,
					cogc: plan.plan_cogc,
					profit: result.profit,
					revenue: split.output,
					inputs: split.inputs,
					workforce: split.workforce,
					degradation: split.degradation,
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
				([planUuid, { result }]) => {
					const plan: Plan = calculatedPlanData.value.find(
						(p) => p.uuid == planUuid
					)!;
					return {
						planetId: plan.planet_natural_id,
						planUuid: planUuid,
						planName: plan.plan_name ?? "Unknown Plan Name",
						planCOGC: plan.plan_cogc,
						materialIO: result.materialio,
					};
				}
			);
		}
	);

	const combinedEmpireMaterialIO: ComputedRef<IEmpireMaterialIO[]> = computed(
		() => combineEmpireMaterialIO(empireMaterialIO.value)
	);

	const planResults: ComputedRef<IPlanResult[]> = computed(() =>
		Object.values(calculatedPlans.value).map((c) => c.result)
	);

	const shippingDemand: ComputedRef<IEmpireShippingDemand> = computed(() =>
		calculateEmpireShippingDemand(planResults.value)
	);

	const costOverview: ComputedRef<IEmpireCostOverview> = computed(() =>
		calculateEmpireCostOverview(
			combinedEmpireMaterialIO.value,
			planResults.value.reduce(
				(sum, element) => sum + element.area.areaUsed,
				0
			),
			planResults.value.reduce(
				(sum, planResult) =>
					sum +
					planResult.cost -
					planResult.materialio.reduce(
						(materialCost, material) =>
							materialCost +
							(material.delta < 0 ? -material.price : 0),
						0
					),
				0
			)
		)
	);

	const empireSplit: ComputedRef<IEmpireSplitParts> = computed(() =>
		empireSplitParts(costOverview.value, planListData.value)
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
	watch(mainContent, (view) => trackEvent("empire:view_change", { view }));
</script>

<template>
	<WrapperPlanningDataLoader
		empire-list
		:empire-uuid="selectedEmpireUuid"
		@data:empire:plans="(value: Plan[]) => (planData = value)"
		@update:empire-uuid="selectLoadedEmpire"
		@update:cx-uuid="
			(value: string | undefined) => (selectedCXUuid = value)
		"
		@data:empire:list="
			(value: PlanEmpireElement[]) => (refEmpireList = value)
		"
		@refreshed="recalculateRefreshed">
		<template #default="{ empirePlanetList }">
			<WrapperGameDataLoader
				load-materials
				load-buildings
				load-recipes
				load-exchanges
				:load-planet-multiple="empirePlanetList"
				@complete="calculateEmpire">
				<AsyncEmpireEmpty
					v-if="refEmpireList.length === 0"
					@created="selectCreatedEmpire" />

				<!-- before the calculation: stays mounted while a save recalculates -->
				<div v-else-if="selectedEmpire && planData.length === 0">
					<PForm
						v-if="empireOptions.length > 1"
						class="max-w-2xl px-3 sm:px-6 pt-3 sm:pt-6">
						<PFormItem :label="t('empire.switch_empire')">
							<PSelect
								v-model:value="selectedEmpireUuid"
								class="w-full"
								:options="empireOptions" />
						</PFormItem>
					</PForm>
					<AsyncEmpireOnboarding
						:empire="selectedEmpire"
						@reload:empires="reloadEmpires" />
				</div>

				<ComputingProgress
					v-else-if="isCalculating"
					:step="progressCurrent"
					:total="progressTotal"
					message="One does not simply calculate empire plans." />

				<div v-else>
					<div
						class="px-3 sm:px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
						<div class="flex flex-row gap-3">
							<h1 class="text-2xl font-bold my-auto">
								{{ empireName }}
							</h1>
						</div>
						<div class="gap-3 flex flex-row flex-wrap">
							<PButtonGroup>
								<PButton
									:pressed="mainContent === 'materialio'"
									@click="() => (mainContent = 'materialio')">
									{{ $t("empire.views.material_io") }}
								</PButton>
								<PButton
									:pressed="mainContent === 'analysis'"
									@click="() => (mainContent = 'analysis')">
									{{ $t("empire.views.analysis") }}
								</PButton>
								<PButton
									:pressed="mainContent === 'opportunities'"
									@click="
										() => (mainContent = 'opportunities')
									">
									{{
										$t(
											"empire.views.production_opportunities"
										)
									}}
								</PButton>
							</PButtonGroup>
							<HelpDrawer file-name="empire" />
						</div>
					</div>

					<EmailNudgeBanner :known-plans="planData.length" />

					<div
						class="grid grid-cols-1 xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)] gap-6 m-3 sm:m-6 items-start">
						<div
							class="min-h-screen w-full max-w-[600px] min-w-0 flex flex-col gap-6 justify-items-start">
							<div>
								<PForm>
									<PFormItem
										:label="t('empire.switch_empire')">
										<PSelect
											v-model:value="selectedEmpireUuid"
											class="w-full"
											:options="empireOptions" />
									</PFormItem>
								</PForm>
							</div>
							<div>
								<AsyncEmpireCostOverview
									:cost-overview="costOverview"
									:shipping-demand="shippingDemand"
									:split="empireSplit" />
							</div>
							<div class="flex flex-col gap-6">
								<div class="overflow-x-auto">
									<Suspense>
										<AsyncEmpirePlanList
											:plan-list-data="planListData" />
										<template #fallback>
											<RenderingProgress :height="200" />
										</template>
									</Suspense>
								</div>
								<div>
									<Suspense v-if="selectedEmpire">
										<AsyncEmpireConfiguration
											:data="selectedEmpire"
											:plan-list-data="planListData"
											@reload:empires="reloadEmpires" />
										<template #fallback>
											<RenderingProgress :height="200" />
										</template>
									</Suspense>
								</div>
							</div>
						</div>
						<div
							class="xl:sticky xl:top-1 h-[calc(100vh-theme(spacing.12))] flex flex-col">
							<div class="flex flex-col flex-1 overflow-auto">
								<EmpireMaterialIOFiltered
									v-model:content="mainContent"
									:empire-material-i-o="
										combinedEmpireMaterialIO
									"
									:cx-uuid="selectedCXUuid"
									:plan-list-data="planListData" />
							</div>
						</div>
					</div>
				</div>
			</WrapperGameDataLoader>
		</template>
	</WrapperPlanningDataLoader>
</template>
