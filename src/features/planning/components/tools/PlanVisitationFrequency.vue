<script setup lang="ts">
	import { computed, ComputedRef, PropType, ref, Ref, watch } from "vue";

	// Composables
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";
	import {
		IMaterialIO,
		IStorageRecord,
	} from "@/features/planning/usePlanCalculation.types";
	import {
		getVolumeOfAllStorages,
		getWeightOfAllStorages,
	} from "../../calculations/infrastructureCalculations";

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
	import { PSelectMultiple, PTable } from "@/ui";

	const props = defineProps({
		storage: {
			type: Object as PropType<IStorageRecord>,
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

	// plan preference patch-in
	const planPrefs = computed<ReturnType<typeof usePlanPreferences> | null>(
		() => {
			return !props.disabled && props.planUuid !== undefined
				? usePlanPreferences(props.planUuid)
				: null;
		}
	);

	function getExclusionOptions(data: IMaterialIO[]): PSelectOption[] {
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
		const dailyWeightTotal: number = Math.max(dailyWeightImport, dailyWeightExport);
		const dailyVolumeTotal: number = Math.max(dailyVolumeImport, dailyVolumeExport);

		return {
			storageFilled: Math.max(
				Math.min(
					totalWeight.value / dailyWeightTotal,
					totalVolume.value / dailyVolumeTotal
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
	const localStorage: Ref<IStorageRecord> = ref(props.storage);
	const localMaterialIO: Ref<IMaterialIO[]> = ref(props.materialIO);

	const refMaterialExclusionOption: Ref<PSelectOption[]> = ref(
		getExclusionOptions(props.materialIO)
	);
	const refMaterialExclusions: Ref<string[]> = ref(
		planPrefs.value === null ||
			planPrefs.value.visitationMaterialExclusions.value === undefined
			? []
			: planPrefs.value.visitationMaterialExclusions.value
	);

	// Prop Watcher
	watch(
		() => props.storage,
		(newStorage: IStorageRecord) => {
			localStorage.value = newStorage;
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
	const totalWeight: ComputedRef<number> = computed(() => {
		return getWeightOfAllStorages(localStorage.value);
	});

	const totalVolume: ComputedRef<number> = computed(() => {
		return getVolumeOfAllStorages(localStorage.value);
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

	const storageAmountsForDisplay: ComputedRef<
		{ ticker: string; amount: number }[]
	> = computed(() => {
		return Object.entries(localStorage.value)
			.filter(([_, amount]) => amount > 0)
			.map(([ticker, amount]) => ({ ticker: ticker, amount: amount }));
	});
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("plan.tools.visitation_frequency.title") }}
	</h2>

	<div class="grid grid-cols-1 lg:grid-cols-[40%_auto] gap-3">
		<div>
			<h3 class="font-bold text-lg pb-3">
				{{ $t("plan.tools.visitation_frequency.storage.label") }}
			</h3>

			<i18n-t
				v-if="storageAmountsForDisplay.length > 0"
				keypath="plan.tools.visitation_frequency.storage.info"
				tag="p"
				class="pb-3">
				<template #storages>
					<template
						v-for="(item, index) in storageAmountsForDisplay"
						:key="item.ticker">
						<strong>{{ item.amount }}</strong> {{ item.ticker }}
						<template
							v-if="index < storageAmountsForDisplay.length - 1">
							{{
								index === storageAmountsForDisplay.length - 2
									? " and "
									: ", "
							}}
						</template>
					</template>
				</template>
				<template #total_weight>{{
					formatAmount(totalWeight)
				}}</template>
				<template #total_volume>{{
					formatAmount(totalVolume)
				}}</template>
			</i18n-t>

			<i18n-t
				v-else
				keypath="plan.tools.visitation_frequency.storage.info_no_storage"
				tag="p"
				class="pb-3">
				<template #total_weight>{{
					formatAmount(totalWeight)
				}}</template>
				<template #total_volume>{{
					formatAmount(totalVolume)
				}}</template>
			</i18n-t>

			<PTable striped>
				<thead>
					<tr>
						<th />
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.weight"
								)
							}}
						</th>
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.volume"
								)
							}}
						</th>
					</tr>
				</thead>
				<tbody class="child:child:text-center">
					<tr>
						<td class="text-left! font-bold">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.import"
								)
							}}
						</td>
						<td>{{ formatNumber(dailyData.dailyWeightImport) }}</td>
						<td>{{ formatNumber(dailyData.dailyVolumeImport) }}</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.export"
								)
							}}
						</td>
						<td>{{ formatNumber(dailyData.dailyWeightExport) }}</td>
						<td>{{ formatNumber(dailyData.dailyVolumeExport) }}</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.sum"
								)
							}}
						</td>
						<td>{{ formatNumber(dailyData.dailyWeight) }}</td>
						<td>{{ formatNumber(dailyData.dailyVolume) }}</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.storage_filled"
								)
							}}
						</td>
						<td colspan="2" class="font-bold">
							{{ formatNumber(dailyData.storageFilled) }}
							{{
								$t(
									"plan.tools.visitation_frequency.storage.table.filled_unit"
								)
							}}
						</td>
					</tr>
				</tbody>
			</PTable>

			<p class="py-3">
				{{
					$t("plan.tools.visitation_frequency.storage.exclusion_info")
				}}
			</p>

			<PSelectMultiple
				v-model:value="refMaterialExclusions"
				:disabled="disabled"
				:options="refMaterialExclusionOption"
				multiple
				searchable
				@update:value="
					(value) => {
						// only keep string values
						const stringsOnly = value.filter(
							(v): v is string => typeof v === 'string'
						);
						if (planPrefs !== null) {
							planPrefs.visitationMaterialExclusions.value =
								stringsOnly;
						}
						refMaterialExclusions = stringsOnly;
					}
				" />
		</div>
		<div>
			<h3 class="font-bold text-lg pb-3">
				{{ $t("plan.tools.visitation_frequency.shipping.label") }}
			</h3>

			<PTable striped>
				<thead>
					<tr>
						<th>
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.ship_weight"
								)
							}}
						</th>
						<th>
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.ship_volume"
								)
							}}
						</th>
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.visitation_days"
								)
							}}
						</th>
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.limit"
								)
							}}
						</th>
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.visitation_days"
								)
							}}
						</th>
						<th class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.limit"
								)
							}}
						</th>
					</tr>
					<tr>
						<th colspan="2" />
						<th colspan="2" class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.export_frequency"
								)
							}}
						</th>
						<th colspan="2" class="text-center!">
							{{
								$t(
									"plan.tools.visitation_frequency.shipping.table.import_frequency"
								)
							}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(shipData, index) in visitationData"
						:key="index">
						<td>{{ formatAmount(shipData.shipWeight) }}</td>
						<td>{{ formatAmount(shipData.shipVolume) }}</td>
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
			</PTable>
		</div>
	</div>
</template>
