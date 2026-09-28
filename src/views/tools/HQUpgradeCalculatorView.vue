<script setup lang="ts">
	import { computed, onMounted, type Ref, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("hq_upgrade_calculator.view_title")} | PRUNplanner`,
	});

	// Composables
	import { useHQUpgradeCalculator } from "@/features/hq_upgrade_calculator/useHQUpgradeCalculator";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber, formatAmount } from "@/util/numbers";

	// Types & Interfaces
	import type { IFIOFindMaterialLocation } from "@/features/fio/useFIOStorage.types";

	// UI
	import { PForm, PFormItem, PInputNumber, PCheckbox, PSelect } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const selectedStart: Ref<number> = ref(1);
	const selectedTo: Ref<number> = ref(3);
	const selectedOverride: Ref<Record<string, number | null>> = ref({});
	const selectedShowLocations: Ref<boolean> = ref(true);
	const refSelectedCXUuid: Ref<string | undefined> = ref(undefined);

	function overrideBinding(ticker: string) {
		return computed({
			get: () => selectedOverride.value[ticker] ?? null,
			set: (val) => (selectedOverride.value[ticker] = val),
		});
	}

	const {
		levelOptions,
		levelOptionsTo,
		materialData,
		totalCost,
		totalWeightVolume,
		calculateMaterialData,
	} = useHQUpgradeCalculator(
		selectedStart,
		selectedTo,
		selectedOverride,
		refSelectedCXUuid
	);

	onMounted(async () => calculateMaterialData());
</script>

<template>
	<WrapperGameDataLoader load-exchanges load-materials>
		<WrapperPlanningDataLoader
			load-c-x
			@update:cx-uuid="(d) => (refSelectedCXUuid = d)">
			<div class="min-h-screen flex flex-col">
				<div
					class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
					<h1 class="text-2xl font-bold my-auto">
						{{ $t("hq_upgrade_calculator.title") }}
					</h1>
					<HelpDrawer file-name="tools_hq_upgrade_calculator" />
				</div>
				<div
					class="border-b border-white/10 grid grid-cols-1 xl:grid-cols-2 divide-x divide-white/10">
					<div
						class="px-6 py-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
						<div>
							<PForm>
								<PFormItem
									:label="
										t(
											'hq_upgrade_calculator.form.from_level'
										)
									">
									<PSelect
										v-model:value="selectedStart"
										:options="levelOptions"
										searchable
										class="w-37.5"
										@update:value="calculateMaterialData" />
								</PFormItem>
								<PFormItem
									:label="
										t('hq_upgrade_calculator.form.to_level')
									">
									<PSelect
										v-model:value="selectedTo"
										:options="levelOptionsTo"
										searchable
										class="w-37.5"
										@update:value="calculateMaterialData" />
								</PFormItem>
							</PForm>
						</div>
						<div>
							<PForm>
								<PFormItem
									:label="
										t(
											'hq_upgrade_calculator.form.cx_preference'
										)
									">
									<CXPreferenceSelector
										:cx-uuid="refSelectedCXUuid"
										class="w-full"
										@update:cxuuid="
											(value) =>
												(refSelectedCXUuid = value)
										" />
								</PFormItem>
								<PFormItem
									:label="
										t(
											'hq_upgrade_calculator.form.show_locations'
										)
									">
									<PCheckbox
										v-model:checked="
											selectedShowLocations
										" />
								</PFormItem>
							</PForm>
						</div>
					</div>
					<div
						class="px-6 py-3 grid grid-cols-1 xl:grid-cols-2 gap-x-3">
						<div
							class="grid grid-cols-[min-content_1fr] gap-x-3 child:not-even:font-bold child:not-even:text-nowrap child:not-even:pr-3">
							<div>
								{{ t("hq_upgrade_calculator.cost.total_cost") }}
							</div>
							<div>
								{{ formatNumber(totalCost) }}
								<span class="pl-1 font-light text-muted">
									ȼ
								</span>
							</div>
							<div>
								{{
									t("hq_upgrade_calculator.cost.total_weight")
								}}
							</div>
							<div>
								{{
									formatNumber(totalWeightVolume.totalWeight)
								}}
								<span class="pl-1 font-light text-muted">
									t
								</span>
							</div>
							<div>
								{{
									t("hq_upgrade_calculator.cost.total_volume")
								}}
							</div>
							<div>
								{{
									formatNumber(totalWeightVolume.totalVolume)
								}}
								<span class="pl-1 font-light text-muted">
									m³
								</span>
							</div>
						</div>
						<div class="text-end">
							<XITTransferActionButton
								:elements="
									materialData
										.map((e) => ({
											ticker: e.ticker,
											value: e.required,
										}))
										.filter((f) => f.value > 0)
								" />
						</div>
					</div>
				</div>

				<div class="px-6 py-3">
					<XNDataTable :data="materialData" striped>
						<XNDataTableColumn
							key="ticker"
							:title="t('hq_upgrade_calculator.table.material')"
							sorter="default">
							<template #render-cell="{ rowData }">
								<MaterialTile
									:key="rowData.ticker"
									:ticker="rowData.ticker"
									:disable-drawer="false" />
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="amount"
							align="right"
							title-align="right"
							:title="t('hq_upgrade_calculator.table.amount')"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatAmount(rowData.amount) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="storage"
							align="right"
							title-align="right"
							:title="t('hq_upgrade_calculator.table.storage')"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatAmount(rowData.storage) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="override"
							:title="
								t('hq_upgrade_calculator.table.override_stock')
							">
							<template #render-cell="{ rowData }">
								<PInputNumber
									:key="`OVERRIDE#${rowData.ticker}`"
									v-model:value="
										overrideBinding(rowData.ticker).value
									"
									:aria-label="
										$t(
											'hq_upgrade_calculator.table.override_label',
											{ ticker: rowData.ticker }
										)
									"
									:min="0"
									clearable
									show-buttons
									placeholder=""
									class="max-w-37.5"
									@update:value="calculateMaterialData" />
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="required"
							align="right"
							title-align="right"
							:title="t('hq_upgrade_calculator.table.required')"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatAmount(rowData.required) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="unitCost"
							align="right"
							title-align="right"
							:title="t('hq_upgrade_calculator.table.cost_unit')"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatNumber(rowData.unitCost) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="totalCost"
							align="right"
							title-align="right"
							:title="t('hq_upgrade_calculator.table.cost_total')"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatNumber(rowData.totalCost) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							v-if="selectedShowLocations"
							key="storageLocations"
							:title="
								t(
									'hq_upgrade_calculator.table.storage_locations'
								)
							"
							:width="'25%'">
							<template #render-cell="{ rowData }">
								{{
									rowData.storageLocations
										.map(
											(e: IFIOFindMaterialLocation) =>
												`${e.amount}x @ ${e.name} (${e.type})`
										)
										.join(", ")
								}}
							</template>
						</XNDataTableColumn>
					</XNDataTable>
				</div>
			</div>
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
