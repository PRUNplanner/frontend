<script setup lang="ts">
	import { computed, ComputedRef, PropType, Ref, ref, watch } from "vue";

	// Composables
	import { usePrice } from "@/features/cx/usePrice";
	import { useRepairAnalysis } from "@/features/repair_analysis/useRepairAnalysis";

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
	import {
		IMaterialIO,
		IMaterialIOMinimal,
	} from "@/features/planning/usePlanCalculation.types";

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

	const DAY_MIN: number = 0;
	const DAY_MAX: number = 180;

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
	const singleMat = ref<{ name: string; data: (number | undefined)[] }[]>([]);

	const { getPrice } = await usePrice(localCxUuid, localPlanetNaturalId);
	const { calculateDailyRepairMaterials, daySelectOptions } =
		await useRepairAnalysis(localCxUuid, localPlanetNaturalId);

	async function calculateRep() {
		const r: IPlanRepairAnalysisElement[] = [];

		if (selectedBuilding.value === undefined) {
			repairAnalysisElements.value = r;
			return;
		}

		const materials: IMaterialIOMinimal[] =
			localData.value[selectedBuilding.value].constructionMaterials;

		let previous = 0;

		for (let i = DAY_MIN; i <= DAY_MAX; i++) {
			const efficiency =
				0.33 + 0.67 / (1 + Math.exp((1789 / 25000) * (i - 100.87)));
			const dailyRevenue =
				efficiency *
				localData.value[selectedBuilding.value].dailyRevenue;
			previous += dailyRevenue;
			const dailyRevenue_norm = previous / (i + 1);

			const mat = materials.map((m) => ({
				ticker: m.ticker,
				amount:
					m.input -
					Math.floor((m.input * (180 - Math.min(180, i))) / 180),
			}));

			// Calculate repair cost asynchronously
			const rep = await mat.reduce(async (sumPromise, element) => {
				const sum = await sumPromise;
				const price = await getPrice(element.ticker, "BUY");
				return sum + element.amount * price;
			}, Promise.resolve(0));

			const repSum = rep / (i + 1);
			const profit = i === 0 ? 0 : dailyRevenue_norm - repSum;

			r.push({
				day: i,
				efficiency,
				dailyRevenue,
				dailyRevenue_integral: previous,
				dailyRevenue_norm,
				materials: mat,
				repair: repSum,
				dailyRepair: rep,
				profit,
			});
		}

		// Adjust first day's profit if there are at least two entries
		if (r.length >= 2) {
			r[0].profit = r[1].profit;
		}

		repairAnalysisElements.value = r;
	}

	const maxValue: ComputedRef<number> = computed(() => {
		return Math.max(...repairAnalysisElements.value.map((o) => o.profit));
	});

	const maxDay: ComputedRef<number> = computed(() => {
		return repairAnalysisElements.value.findIndex(
			(e) => e.profit === maxValue.value
		);
	});

	async function calculateSingleMat() {
		if (!repairAnalysisElements.value.length) {
			singleMat.value = [];
			return;
		}

		const mats = repairAnalysisElements.value[0].materials.map(
			(m) => m.ticker
		);

		const results = await Promise.all(
			mats.map(async (mat) => ({
				name: mat,
				data: await Promise.all(
					repairAnalysisElements.value.map(async (r) => {
						const material = r.materials.find(
							(e) => e.ticker === mat
						);
						if (!material) return undefined;
						const price = await getPrice(material.ticker, "BUY");
						return material.amount * price;
					})
				),
			}))
		);

		singleMat.value = results;
	}

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

	// calculate single material if repair materials change
	watch(repairAnalysisElements, calculateSingleMat, {
		deep: true,
		immediate: true,
	});
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">Repair Analysis</h2>
	<div class="grid grid-cols-1 xl:grid-cols-[400px_auto] gap-3 gap-x-6">
		<div>
			<h2 class="font-bold pb-3">Plan</h2>

			<PForm>
				<PFormItem label="Select Day">
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
			<h2 class="font-bold pb-3">Individual Building</h2>
			<PForm>
				<PFormItem label="Select Building">
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
							:optimal-point="{ x: maxDay, y: maxValue }" />
					</div>
					<div>
						<h2 class="font-bold pb-3">Repair Cost Breakdown</h2>
						<PlanRepairCostChart
							:series="
								[
									{
										name: 'Total Cost',
										data: repairAnalysisElements.map(
											(r) => r.dailyRepair
										),
									},
								].concat(
									singleMat as {
										name: string;
										data: number[];
									}[]
								)
							" />
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
