<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";
	import type {
		IMaterialIO,
		IStorageRecord,
	} from "@/features/planning/usePlanCalculation.types";
	import {
		getVolumeOfAllStorages,
		getWeightOfAllStorages,
	} from "../../calculations/infrastructureCalculations";

	import {
		SHIP_SIZES,
		shipDays,
	} from "@/features/planning/engine/visitation";

	interface IShippingCalculation extends ReturnType<typeof shipDays> {
		shipVolume: number;
		shipWeight: number;
	}

	// UI
	import { PSelectMultiple, PTable, PTooltip } from "@/ui";

	const props = defineProps<{
		storage: IStorageRecord;
		materialIO: IMaterialIO[];
		disabled: boolean;
		planUuid?: string;
	}>();

	// plan preference patch-in
	const { visitationMaterialExclusions } = usePlanPreferences(() =>
		props.disabled ? undefined : props.planUuid
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
		const dailyWeightTotal: number = Math.max(
			dailyWeightImport,
			dailyWeightExport
		);
		const dailyVolumeTotal: number = Math.max(
			dailyVolumeImport,
			dailyVolumeExport
		);

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
	const exclusionOptions: ComputedRef<PSelectOption[]> = computed(() =>
		getExclusionOptions(props.materialIO)
	);
	const refMaterialExclusions: Ref<string[]> = ref(
		visitationMaterialExclusions.value ?? []
	);

	//
	const totalWeight: ComputedRef<number> = computed(() => {
		return getWeightOfAllStorages(props.storage);
	});

	const totalVolume: ComputedRef<number> = computed(() => {
		return getVolumeOfAllStorages(props.storage);
	});

	const dailyData = computed(() => {
		const filteredMaterialIO: IMaterialIO[] = props.materialIO.filter(
			(e) => !refMaterialExclusions.value.includes(e.ticker)
		);
		return calculateDailyData(filteredMaterialIO);
	});

	const visitationData = computed(() => {
		const filteredMaterialIO: IMaterialIO[] = props.materialIO.filter(
			(e) => !refMaterialExclusions.value.includes(e.ticker)
		);
		const filteredDailyData = calculateDailyData(filteredMaterialIO);

		return SHIP_SIZES.map((ship): IShippingCalculation => ({
			shipVolume: ship.volume,
			shipWeight: ship.weight,
			...shipDays(ship, filteredDailyData),
		}));
	});

	const storageAmountsForDisplay: ComputedRef<
		{ ticker: string; amount: number }[]
	> = computed(() => {
		return Object.entries(props.storage)
			.filter(([_, amount]) => amount > 0)
			.map(([ticker, amount]) => ({ ticker: ticker, amount: amount }));
	});
</script>

<template>
	<div class="@container flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ t("plan.tools.visitation_frequency.title") }}
			</h2>
			<span class="text-sm text-muted">
				{{ t("plan.tools.descriptions.visitation-frequency") }}
			</span>
		</div>

		<div
			class="grid gap-6 @[48rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
			<!-- Storage: what fills it, and when it's full -->
			<section class="flex flex-col gap-2">
				<h3 class="font-medium text-ink-strong">
					{{ t("plan.tools.visitation_frequency.storage.label") }}
				</h3>
				<i18n-t
					v-if="storageAmountsForDisplay.length > 0"
					keypath="plan.tools.visitation_frequency.storage.info"
					tag="p"
					class="text-sm text-muted text-pretty">
					<template #storages>
						<span>
							<span
								v-for="(
									item, index
								) in storageAmountsForDisplay"
								:key="item.ticker">
								<strong class="text-ink">{{
									item.amount
								}}</strong>
								{{ item.ticker }}
								<span
									v-if="
										index <
										storageAmountsForDisplay.length - 1
									">
									{{
										index ===
										storageAmountsForDisplay.length - 2
											? " and "
											: ", "
									}}
								</span>
							</span>
						</span>
					</template>
					<template #total_weight>
						{{ formatAmount(totalWeight) }}
					</template>
					<template #total_volume>
						{{ formatAmount(totalVolume) }}
					</template>
				</i18n-t>
				<i18n-t
					v-else
					keypath="plan.tools.visitation_frequency.storage.info_no_storage"
					tag="p"
					class="text-sm text-muted text-pretty">
					<template #total_weight>
						{{ formatAmount(totalWeight) }}
					</template>
					<template #total_volume>
						{{ formatAmount(totalVolume) }}
					</template>
				</i18n-t>

				<PTable striped class="tabular-nums">
					<thead>
						<tr>
							<th />
							<th class="numeric">
								{{
									t(
										"plan.tools.visitation_frequency.storage.table.weight"
									)
								}}
							</th>
							<th class="numeric">
								{{
									t(
										"plan.tools.visitation_frequency.storage.table.volume"
									)
								}}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in [
								[
									'import',
									dailyData.dailyWeightImport,
									dailyData.dailyVolumeImport,
								],
								[
									'export',
									dailyData.dailyWeightExport,
									dailyData.dailyVolumeExport,
								],
								[
									'larger_leg',
									dailyData.dailyWeight,
									dailyData.dailyVolume,
								],
							] as const"
							:key="row[0]">
							<td class="text-muted-strong">
								<PTooltip v-if="row[0] === 'larger_leg'">
									<template #trigger>
										<span class="hover:cursor-help">
											{{
												t(
													"plan.tools.visitation_frequency.storage.table.larger_leg"
												)
											}}
										</span>
									</template>
									{{
										t(
											"plan.tools.visitation_frequency.storage.table.larger_leg_tooltip"
										)
									}}
								</PTooltip>
								<span v-else>
									{{
										t(
											`plan.tools.visitation_frequency.storage.table.${row[0]}`
										)
									}}
								</span>
							</td>
							<td class="numeric">{{ formatNumber(row[1]) }}</td>
							<td class="numeric">{{ formatNumber(row[2]) }}</td>
						</tr>
						<tr>
							<td class="font-medium text-ink-strong">
								{{
									t(
										"plan.tools.visitation_frequency.storage.table.storage_filled"
									)
								}}
							</td>
							<td
								colspan="2"
								class="numeric font-medium text-ink-strong">
								{{ formatNumber(dailyData.storageFilled) }}
								{{
									t(
										"plan.tools.visitation_frequency.storage.table.filled_unit"
									)
								}}
							</td>
						</tr>
					</tbody>
				</PTable>

				<label class="flex flex-col gap-1.5 pt-1">
					<span class="text-xs text-muted">
						{{
							t(
								"plan.tools.visitation_frequency.storage.exclusion_info"
							)
						}}
					</span>
					<PSelectMultiple
						v-model:value="refMaterialExclusions"
						:aria-label="
							t(
								'plan.tools.visitation_frequency.storage.exclusion_label'
							)
						"
						:disabled="disabled"
						:options="exclusionOptions"
						searchable
						clearable
						@update:value="
							(value) => {
								// only keep string values
								const stringsOnly = value.filter(
									(v): v is string => typeof v === 'string'
								);
								visitationMaterialExclusions = stringsOnly;
								refMaterialExclusions = stringsOnly;
							}
						" />
				</label>
			</section>

			<!-- Shipping: how often a ship of each size has to fly -->
			<section class="flex flex-col gap-2">
				<h3 class="font-medium text-ink-strong">
					{{ t("plan.tools.visitation_frequency.shipping.label") }}
				</h3>
				<PTable striped class="tabular-nums">
					<thead>
						<tr>
							<th colspan="2" />
							<th colspan="2" class="text-center!">
								{{
									t(
										"plan.tools.visitation_frequency.shipping.table.export_frequency"
									)
								}}
							</th>
							<th colspan="2" class="text-center!">
								{{
									t(
										"plan.tools.visitation_frequency.shipping.table.import_frequency"
									)
								}}
							</th>
						</tr>
						<tr>
							<th class="numeric">
								{{
									t(
										"plan.tools.visitation_frequency.shipping.table.ship_weight"
									)
								}}
							</th>
							<th class="numeric">
								{{
									t(
										"plan.tools.visitation_frequency.shipping.table.ship_volume"
									)
								}}
							</th>
							<template
								v-for="side in ['export', 'import']"
								:key="side">
								<th class="numeric">
									{{
										t(
											"plan.tools.visitation_frequency.shipping.table.visitation_days"
										)
									}}
								</th>
								<th class="text-center!">
									{{
										t(
											"plan.tools.visitation_frequency.shipping.table.limit"
										)
									}}
								</th>
							</template>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(shipData, index) in visitationData"
							:key="index">
							<td class="numeric">
								{{ formatAmount(shipData.shipWeight) }}
							</td>
							<td class="numeric">
								{{ formatAmount(shipData.shipVolume) }}
							</td>
							<td class="numeric">
								{{ formatNumber(shipData.exportDays) }}
							</td>
							<td class="text-center text-muted-strong">
								{{ shipData.exportLimit }}
							</td>
							<td class="numeric">
								{{ formatNumber(shipData.importDays) }}
							</td>
							<td class="text-center text-muted-strong">
								{{ shipData.importLimit }}
							</td>
						</tr>
					</tbody>
				</PTable>
			</section>
		</div>
	</div>
</template>
