<script setup lang="ts">
	import { computed, ComputedRef, PropType, Ref, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePrice } from "@/features/cx/usePrice";
	import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";

	// Util
	import {
		calculateRepairCurve,
		findOptimalRepairDay,
		repairCostSeries,
	} from "@/features/repair_analysis/repairAnalysis.util";

	// Components
	import DayRepairMaterialTable from "@/features/repair_analysis/components/DayRepairMaterialTable.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
	import PlanRepairProfitChart from "@/ui/charts/PlanRepairProfitChart.vue";
	import PlanRepairCostChart from "@/ui/charts/PlanRepairCostChart.vue";

	// Types & Interfaces
	import {
		IPlanRepairAnalysisDataProp,
		IPlanRepairAnalysisElement,
	} from "@/features/planning/components/tools/planRepairAnalysis.types";
	import { PSelectOption } from "@/ui/ui.types";
	import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PForm, PFormItem, PSelect } from "@/ui";

	const props = defineProps({
		data: {
			type: Array as PropType<IPlanRepairAnalysisDataProp[]>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetNaturalId: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	// Local State
	const localData = computed(() => props.data);
	const localCxUuid = computed(() => props.cxUuid);
	const localPlanetNaturalId = computed(() => props.planetNaturalId);

	const selectionOptions: ComputedRef<PSelectOption[]> = computed(() =>
		localData.value.map((b, i) => {
			return { label: b.name, value: i };
		})
	);

	const selectedBuilding = ref(localData.value.length > 0 ? 0 : undefined);
	const selectedDay = ref(90);
	const repairAnalysisElements = ref<IPlanRepairAnalysisElement[]>([]);
	const dailyRepairMaterials: Ref<Record<number, IMaterialIO[]>> = ref({});
	const repairPrices = ref<Record<string, number>>({});

	const { getPrice } = await usePrice(localCxUuid, localPlanetNaturalId);
	const { calculateDailyRepairMaterials, daySelectOptions } =
		await useRepairAnalysis(localCxUuid, localPlanetNaturalId);

	async function calculateRep() {
		if (selectedBuilding.value === undefined) {
			repairPrices.value = {};
			repairAnalysisElements.value = [];
			return;
		}

		const building = localData.value[selectedBuilding.value];
		const prices: Record<string, number> = {};
		for (const m of building.constructionMaterials)
			prices[m.ticker] = await getPrice(m.ticker, "BUY");

		repairPrices.value = prices;
		repairAnalysisElements.value = calculateRepairCurve(
			building.dailyRevenue,
			building.constructionMaterials,
			prices
		);
	}

	const optimalDay = computed(() =>
		findOptimalRepairDay(repairAnalysisElements.value)
	);

	const singleMat = computed(() =>
		repairCostSeries(repairAnalysisElements.value, repairPrices.value)
	);

	const selectPlanTransferMaterials = computed(() => {
		if (
			!dailyRepairMaterials.value ||
			!dailyRepairMaterials.value[selectedDay.value]
		)
			return [];

		return dailyRepairMaterials.value[selectedDay.value].map((e) => ({
			ticker: e.ticker,
			value: e.input,
		}));
	});

	// Recalculate whenever selectedBuilding or localData changes
	watch(
		[selectedBuilding, localData],
		async () => {
			calculateRep();
			dailyRepairMaterials.value = await calculateDailyRepairMaterials(
				localData.value
			);
		},
		{
			deep: true,
			immediate: true,
		}
	);
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("plan.tools.repair_analysis.title") }}
	</h2>
	<div class="grid grid-cols-1 xl:grid-cols-[400px_auto] gap-3 gap-x-6">
		<div>
			<h2 class="font-bold pb-3">
				{{ $t("plan.tools.repair_analysis.plan") }}
			</h2>

			<PForm>
				<PFormItem
					:label="t('plan.tools.repair_analysis.table.select_day')">
					<div class="w-full flex flex-row justify-between">
						<PSelect
							v-model:value="selectedDay"
							:options="daySelectOptions"
							searchable
							class="w-1/2 max-w-50" />

						<XITTransferActionButton
							:elements="selectPlanTransferMaterials" />
					</div>
				</PFormItem>
			</PForm>

			<div class="py-3">
				<DayRepairMaterialTable
					v-if="
						dailyRepairMaterials &&
						dailyRepairMaterials[selectedDay]
					"
					:materials="dailyRepairMaterials[selectedDay]" />
			</div>
		</div>
		<div>
			<h2 class="font-bold pb-3">
				{{ $t("plan.tools.repair_analysis.graph.individual_building") }}
			</h2>
			<PForm>
				<PFormItem
					:label="
						t('plan.tools.repair_analysis.graph.select_building')
					">
					<PSelect
						v-model:value="selectedBuilding"
						:options="selectionOptions"
						class="w-1/2 max-w-50" />
				</PFormItem>
			</PForm>

			<template v-if="selectionOptions.length > 0">
				<div class="flex flex-col">
					<div>
						<h2 class="font-bold py-3">Profit Curve</h2>
						<PlanRepairProfitChart
							:profit-data="
								repairAnalysisElements.map((r) => r.profit)
							"
							:optimal-point="{
								x: optimalDay.day,
								y: optimalDay.profit,
							}" />
					</div>
					<div>
						<h2 class="font-bold pb-3">
							{{
								$t(
									"plan.tools.repair_analysis.graph.repair_cost_breakdown"
								)
							}}
						</h2>
						<PlanRepairCostChart
							:series="
								[
									{
										name: 'Total Cost',
										data: repairAnalysisElements.map(
											(r) => r.dailyRepair
										),
									},
								].concat(singleMat)
							" />
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
