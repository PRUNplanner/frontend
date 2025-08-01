<script setup lang="ts">
	import { computed, ComputedRef, PropType, ref, Ref, watch } from "vue";

	// Composables
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { SelectMixedOption } from "naive-ui/es/select/src/interface";
	import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	interface IShippingCalculation {
		shipVolume: number;
		shipWeight: number;
		exportDays: number;
		importDays: number;
		exportLimit: string;
		importLimit: string;
	}

	interface IShippingVariant {
		volume: number;
		weight: number;
	}

	// UI
	import { NButton, NTable, NSelect } from "naive-ui";
	import { CloseSharp } from "@vicons/material";

	const props = defineProps({
		stoAmount: {
			type: Number,
			required: true,
		},
		materialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		disabled: {
			type: Boolean,
			required: true,
		},
		planUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const emit = defineEmits<{
		(e: "close"): void;
	}>();

	// plan preference patch-in
	const planPrefs = computed<ReturnType<typeof usePlanPreferences> | null>(
		() => {
			return !props.disabled && props.planUuid !== undefined
				? usePlanPreferences(props.planUuid)
				: null;
		}
	);

	function getExclusionOptions(data: IMaterialIO[]): SelectMixedOption[] {
		return data.map((d) => {
			return {
				label: d.ticker,
				value: d.ticker,
			};
		});
	}

	function calculateDailyData(data: IMaterialIO[]) {
		const dailyWeightImport: number = data.reduce(
			(sum, e) => sum + (e.delta < 0 ? e.totalWeight * -1 : 0),
			0
		);
		const dailyWeightExport: number = data.reduce(
			(sum, e) => sum + (e.delta > 0 ? e.totalWeight : 0),
			0
		);
		const dailyVolumeImport: number = data.reduce(
			(sum, e) => sum + (e.delta < 0 ? e.totalVolume * -1 : 0),
			0
		);
		const dailyVolumeExport: number = data.reduce(
			(sum, e) => sum + (e.delta > 0 ? e.totalVolume : 0),
			0
		);
		const dailyWeightTotal: number = dailyWeightImport + dailyWeightExport;
		const dailyVolumeTotal: number = dailyVolumeImport + dailyVolumeExport;

		return {
			storageFilled: Math.max(
				Math.min(
					totalStorage.value / dailyWeightTotal,
					totalStorage.value / dailyVolumeTotal
				),
				0
			),
			dailyWeightImport: dailyWeightImport,
			dailyWeightExport: dailyWeightExport,
			dailyVolumeImport: dailyVolumeImport,
			dailyVolumeExport: dailyVolumeExport,
			dailyWeight: dailyWeightTotal,
			dailyVolume: dailyVolumeTotal,
		};
	}

	// Local State
	const localStoAmount: Ref<number> = ref(props.stoAmount);
	const localMaterialIO: Ref<IMaterialIO[]> = ref(props.materialIO);

	const refMaterialExclusionOption: Ref<SelectMixedOption[]> = ref(
		getExclusionOptions(props.materialIO)
	);
	const refMaterialExclusions: Ref<string[]> = ref(
		planPrefs.value === null
			? []
			: planPrefs.value.visitationMaterialExclusions.value
	);

	// Prop Watcher
	watch(
		() => props.stoAmount,
		(newAmount: number) => {
			localStoAmount.value = newAmount;
		}
	);
	watch(
		() => props.materialIO,
		(newIO: IMaterialIO[]) => {
			localMaterialIO.value = newIO;
			refMaterialExclusionOption.value = getExclusionOptions(newIO);
		}
	);

	//
	const totalStorage: ComputedRef<number> = computed(() => {
		return 1500 + 5000 * localStoAmount.value;
	});

	const dailyData = computed(() => {
		const filteredMaterialIO: IMaterialIO[] = localMaterialIO.value.filter(
			(e) => !refMaterialExclusions.value.includes(e.ticker)
		);
		return calculateDailyData(filteredMaterialIO);
	});

	const visitationData = computed(() => {
		const shipVariants: IShippingVariant[] = [
			{ volume: 500, weight: 500 },
			{ volume: 1000, weight: 1000 },
			{ volume: 2000, weight: 2000 },
			{ volume: 3000, weight: 1000 },
			{ volume: 1000, weight: 3000 },
			{ volume: 5000, weight: 5000 },
		];

		const filteredMaterialIO: IMaterialIO[] = localMaterialIO.value.filter(
			(e) => !refMaterialExclusions.value.includes(e.ticker)
		);

		const shippingCalc: IShippingCalculation[] = [];

		const filteredDailyData = calculateDailyData(filteredMaterialIO);

		// calculate per shipVariant
		shipVariants.forEach((ship) => {
			const exportVolumeDays: number =
				ship.volume / filteredDailyData.dailyVolumeExport;
			const exportWeightDays: number =
				ship.weight / filteredDailyData.dailyWeightExport;

			const importVolumeDays: number =
				ship.volume / filteredDailyData.dailyVolumeImport;
			const importWeightDays: number =
				ship.weight / filteredDailyData.dailyWeightImport;

			const exportDays: number =
				exportVolumeDays < exportWeightDays
					? exportVolumeDays
					: exportWeightDays;
			const exportLimit: string =
				exportVolumeDays < exportWeightDays ? "m³" : "t";

			const importDays: number =
				importVolumeDays < importWeightDays
					? importVolumeDays
					: importWeightDays;
			const importLimit: string =
				importVolumeDays < importWeightDays ? "m³" : "t";

			shippingCalc.push({
				shipVolume: ship.volume,
				shipWeight: ship.weight,
				exportDays: exportDays,
				importDays: importDays,
				exportLimit: exportLimit,
				importLimit: importLimit,
			});
		});

		return shippingCalc;
	});
</script>

<template>
	<div class="pb-3 flex flex-row justify-between child:my-auto">
		<h2 class="text-white/80 font-bold text-lg">Visitation Frequency</h2>
		<n-button size="tiny" secondary @click="emit('close')">
			<template #icon><CloseSharp /></template>
		</n-button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-[40%_auto] gap-3">
		<div>
			<h3 class="font-bold text-lg pb-3">Storage</h3>

			<p class="pb-3">
				Your plan involves adding
				<strong>{{ localStoAmount }}</strong> STO, giving you a total
				storage capacity of
				<strong>{{ formatAmount(totalStorage) }}</strong
				>.
			</p>

			<n-table striped>
				<thead class="child:text-center">
					<tr>
						<th />
						<th>m³</th>
						<th>t</th>
					</tr>
				</thead>
				<tbody class="child:child:text-center">
					<tr>
						<td class="!text-left font-bold">Import</td>
						<td>{{ formatNumber(dailyData.dailyVolumeImport) }}</td>
						<td>{{ formatNumber(dailyData.dailyWeightImport) }}</td>
					</tr>
					<tr>
						<td class="!text-left font-bold">Export</td>
						<td>{{ formatNumber(dailyData.dailyVolumeExport) }}</td>
						<td>{{ formatNumber(dailyData.dailyWeightExport) }}</td>
					</tr>
					<tr>
						<td class="!text-left font-bold">&#8721;</td>
						<td>{{ formatNumber(dailyData.dailyVolume) }}</td>
						<td>{{ formatNumber(dailyData.dailyWeight) }}</td>
					</tr>
					<tr>
						<td class="!text-left font-bold">Storage Filled</td>
						<td colspan="2" class="font-bold">
							{{ formatNumber(dailyData.storageFilled) }} days
						</td>
					</tr>
				</tbody>
			</n-table>

			<p class="py-3">
				Exclude local materials from visitation frequency calculation
				for items handled exclusively planet-side, like local market
				sales, purchases or contracts.
			</p>

			<n-select
				v-model:value="refMaterialExclusions"
				:disabled="disabled"
				:options="refMaterialExclusionOption"
				multiple
				size="small"
				filterable
				@update-value="
					(value: string[]) => {
						if (planPrefs !== null) {
							planPrefs.visitationMaterialExclusions.value =
								value;
						}
						refMaterialExclusions = value;
					}
				" />
		</div>
		<div>
			<h3 class="font-bold text-lg pb-3">Shipping</h3>

			<n-table striped>
				<thead>
					<tr>
						<th>Ship m³</th>
						<th>Ship t</th>
						<th class="!text-center">Visitation (days)</th>
						<th class="!text-center">Limit</th>
						<th class="!text-center">Visitation (days)</th>
						<th class="!text-center">Limit</th>
					</tr>
					<tr>
						<th colspan="2" />
						<th colspan="2" class="!text-center">
							Export Frequency
						</th>
						<th colspan="2" class="!text-center">
							Import Frequency
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(shipData, index) in visitationData"
						:key="index">
						<td>{{ formatAmount(shipData.shipVolume) }}</td>
						<td>{{ formatAmount(shipData.shipWeight) }}</td>
						<td class="text-center">
							{{ formatNumber(shipData.exportDays) }}
						</td>
						<td class="text-center">{{ shipData.exportLimit }}</td>
						<td class="text-center">
							{{ formatNumber(shipData.importDays) }}
						</td>
						<td class="text-center">{{ shipData.importLimit }}</td>
					</tr>
				</tbody>
			</n-table>
		</div>
	</div>
</template>
