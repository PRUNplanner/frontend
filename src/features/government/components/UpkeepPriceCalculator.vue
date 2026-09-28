<script setup lang="ts">
	import { type ComputedRef, type Ref, computed, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePrice } from "@/features/cx/usePrice";

	// Calculations
	import {
		UPKEEP_NEED_TYPES,
		calculateAllNeeds,
	} from "@/features/government/upkeepCalculations";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type {
		IUpkeepMaterialCalculation,
		UpkeepNeedType,
	} from "@/features/government/upkeepCalculations.types";

	// UI
	import { PProgressBar, PButton, PButtonGroup } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { tablePagination } from "@/util/pagination";

	const props = defineProps({
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const cxUuid: ComputedRef<string | undefined> = computed(
		() => props.cxUuid
	);
	const planetNaturalId: Ref<string | undefined> = ref(undefined);

	const needTypes = UPKEEP_NEED_TYPES;

	// State
	const isCalculating: Ref<boolean> = ref(true);
	const selectedNeedType: Ref<UpkeepNeedType> = ref("safety");
	const calculationResults: Ref<
		Record<UpkeepNeedType, IUpkeepMaterialCalculation[]>
	> = ref({
		safety: [],
		health: [],
		comfort: [],
		culture: [],
		education: [],
	});

	// Computed
	const currentResults: ComputedRef<IUpkeepMaterialCalculation[]> = computed(
		() => calculationResults.value[selectedNeedType.value]
	);

	async function calculate() {
		isCalculating.value = true;

		const { getPrice } = usePrice(cxUuid, planetNaturalId);
		try {
			calculationResults.value = await calculateAllNeeds((ticker) =>
				getPrice(ticker, "BUY")
			);
		} catch (err) {
			console.error(err);
		} finally {
			isCalculating.value = false;
		}
	}

	watch(
		() => props.cxUuid,
		async () => {
			await calculate();
		},
		{ immediate: true }
	);

	const pagination = tablePagination(50);
</script>

<template>
	<div v-if="isCalculating" class="w-full flex justify-center">
		<div class="text-center w-100 py-3">
			<PProgressBar :step="1" :total="2" />
			<div class="pt-3 text-xs text-white/60">
				{{ $t("upkeep_price_calculator.calculator.calculating") }}
			</div>
		</div>
	</div>
	<div v-else>
		<!-- Need Type Selection -->
		<div class="mb-4">
			<PButtonGroup>
				<PButton
					v-for="needType in needTypes"
					:key="needType"
					:type="
						selectedNeedType === needType ? 'primary' : 'secondary'
					"
					@click="selectedNeedType = needType">
					{{
						$t(
							`upkeep_price_calculator.calculator.needs.${needType}`
						)
					}}
				</PButton>
			</PButtonGroup>
		</div>

		<!-- Material Details Section -->
		<div>
			<h3 class="text-sm font-semibold text-white/80 mb-3">
				{{ $t("upkeep_price_calculator.calculator.details.title") }}
			</h3>
			<XNDataTable
				:data="currentResults"
				striped
				:pagination="pagination">
				<XNDataTableColumn
					key="ticker"
					:title="
						t(
							'upkeep_price_calculator.calculator.details.table.material'
						)
					"
					sorter="default">
					<template #render-cell="{ rowData }">
						<MaterialTile
							:key="`${rowData.ticker}-${rowData.buildingTicker}`"
							:ticker="rowData.ticker" />
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="buildingTicker"
					:title="
						t(
							'upkeep_price_calculator.calculator.details.table.building'
						)
					"
					sorter="default">
					<template #render-cell="{ rowData }">
						<span class="font-bold">{{
							rowData.buildingTicker
						}}</span>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="pricePerNeed"
					:title="
						t(
							'upkeep_price_calculator.calculator.details.table.price_need'
						)
					"
					title-align="right"
					sorter="default">
					<template #render-cell="{ rowData }">
						<div
							class="text-end text-nowrap"
							:class="rowData.cxPrice <= 0 ? 'text-muted' : ''">
							<template v-if="rowData.cxPrice > 0">
								{{ formatNumber(rowData.pricePerNeed, 4) }}
							</template>
							<template v-else>-</template>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="cxPrice"
					:title="
						t(
							'upkeep_price_calculator.calculator.details.table.cx_price'
						)
					"
					title-align="right"
					sorter="default">
					<template #render-cell="{ rowData }">
						<div
							class="text-end text-nowrap"
							:class="rowData.cxPrice <= 0 ? 'text-muted' : ''">
							<template v-if="rowData.cxPrice > 0">
								{{ formatNumber(rowData.cxPrice, 2) }}
								<span class="pl-1 font-light text-muted">
									ȼ
								</span>
							</template>
							<template v-else>-</template>
						</div>
					</template>
				</XNDataTableColumn>

				<XNDataTableColumn
					key="qtyPerDay"
					:title="
						t(
							'upkeep_price_calculator.calculator.details.table.qty_day'
						)
					"
					title-align="right"
					sorter="default">
					<template #render-cell="{ rowData }">
						<div class="text-end text-nowrap">
							{{ formatNumber(rowData.qtyPerDay, 2) }}
						</div>
					</template>
				</XNDataTableColumn>
			</XNDataTable>
		</div>
	</div>
</template>
