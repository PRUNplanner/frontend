<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		type Ref,
		ref,
		watch,
	} from "vue";
	import { debounce } from "lodash-es";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: t("hq_upgrade_calculator.view_title"),
	});

	// Composables
	import { useHQUpgradeCalculator } from "@/features/hq_upgrade_calculator/useHQUpgradeCalculator";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

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
	import type { IHQMaterial } from "@/features/hq_upgrade_calculator/useHQUpgradeCalculator.types";

	// UI
	import {
		PDataTable,
		PForm,
		PFormItem,
		PInputNumber,
		PCheckbox,
		PSelect,
	} from "@/ui";
	import type { PDataTableColumn } from "@/ui/ui.types";

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

	// calculated on the loaders' complete (game data and CX are in, which this
	// view's own onMounted runs before on a direct load) and on a CX change
	watch(refSelectedCXUuid, calculateMaterialData);

	// one analytics event per settled input, the defaults on open don't count
	const trackUse = debounce(
		() => trackEvent("tool:use", { tool_name: "hq_upgrade" }),
		1000
	);
	watch([selectedStart, selectedTo, selectedOverride], trackUse, {
		deep: true,
	});
	onBeforeUnmount(trackUse.cancel);

	const columns = computed<PDataTableColumn<IHQMaterial>[]>(() => {
		const numeric = (key: string, title: string) => ({
			key,
			title: t(`hq_upgrade_calculator.table.${title}`),
			align: "right" as const,
			sorter: true as const,
		});
		return [
			{
				key: "ticker",
				title: t("hq_upgrade_calculator.table.material"),
				sorter: true,
			},
			numeric("amount", "amount"),
			numeric("storage", "storage"),
			{
				key: "override",
				title: t("hq_upgrade_calculator.table.override_stock"),
				// the stepper input needs room once the headers may wrap
				minWidth: 150,
			},
			numeric("required", "required"),
			numeric("unitCost", "cost_unit"),
			numeric("totalCost", "cost_total"),
			...(selectedShowLocations.value
				? [
						{
							key: "storageLocations",
							title: t("hq_upgrade_calculator.table.storage_locations"),
							width: "25%",
						},
					]
				: []),
		];
	});
</script>

<template>
	<WrapperGameDataLoader load-exchanges load-materials>
		<WrapperPlanningDataLoader
			load-c-x
			@complete="calculateMaterialData"
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
								source="hq_upgrade"
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
					<PDataTable :columns="columns" :data="materialData" striped>
						<!-- headers wrap at spaces: with locations it fits at 1024 -->
						<template
							v-for="col in columns"
							:key="col.key"
							#[`header-${col.key}`]>
							<span class="whitespace-normal">{{ col.title }}</span>
						</template>
						<template #cell-ticker="{ row }">
							<MaterialTile
								:key="row.ticker"
								:ticker="row.ticker"
								:disable-drawer="false" />
						</template>
						<template #cell-amount="{ row }">
							{{ formatAmount(row.amount) }}
						</template>
						<template #cell-storage="{ row }">
							{{ formatAmount(row.storage) }}
						</template>
						<template #cell-override="{ row }">
							<PInputNumber
								:key="`OVERRIDE#${row.ticker}`"
								v-model:value="
									overrideBinding(row.ticker).value
								"
								:aria-label="
									$t(
										'hq_upgrade_calculator.table.override_label',
										{ ticker: row.ticker }
									)
								"
								:min="0"
								show-buttons
								placeholder=""
								class="max-w-37.5"
								@update:value="calculateMaterialData" />
						</template>
						<template #cell-required="{ row }">
							{{ formatAmount(row.required) }}
						</template>
						<template #cell-unitCost="{ row }">
							{{ formatNumber(row.unitCost) }}
						</template>
						<template #cell-totalCost="{ row }">
							{{ formatNumber(row.totalCost) }}
						</template>
						<template #cell-storageLocations="{ row }">
							{{
								row.storageLocations
									.map(
										(e: IFIOFindMaterialLocation) =>
											`${e.amount}x @ ${e.name} (${e.type})`
									)
									.join(", ")
							}}
						</template>
					</PDataTable>
				</div>
			</div>
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
