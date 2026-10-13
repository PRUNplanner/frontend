<script setup lang="ts">
	import {
		type ComputedRef,
		type Ref,
		computed,
		onBeforeUnmount,
		ref,
		watch,
	} from "vue";
	import { debounce } from "lodash-es";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePrice } from "@/features/cx/usePrice";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

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
	import { PProgressBar, PButton, PButtonGroup, PDataTable } from "@/ui";
	import type { PDataTableColumn } from "@/ui/ui.types";

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

	// one analytics event per settled calculation: it runs on open and
	// again once the exchange preference is known
	const trackUse = debounce(
		() => trackEvent("tool:use", { tool_name: "upkeep_price" }),
		1000
	);
	onBeforeUnmount(trackUse.cancel);

	async function calculate() {
		isCalculating.value = true;

		const { getPrice } = usePrice(cxUuid, planetNaturalId);
		try {
			calculationResults.value = await calculateAllNeeds((ticker) =>
				getPrice(ticker, "BUY")
			);
			trackUse();
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

	const columns = computed<PDataTableColumn<IUpkeepMaterialCalculation>[]>(
		() => {
			const title = (key: string) =>
				t(`upkeep_price_calculator.calculator.details.table.${key}`);
			return [
				{ key: "ticker", title: title("material"), sorter: true },
				{ key: "buildingTicker", title: title("building"), sorter: true },
				{
					key: "pricePerNeed",
					title: title("price_need"),
					align: "right",
					sorter: true,
				},
				{
					key: "cxPrice",
					title: title("cx_price"),
					align: "right",
					sorter: true,
				},
				{
					key: "qtyPerDay",
					title: title("qty_day"),
					align: "right",
					sorter: true,
				},
			];
		}
	);
</script>

<template>
	<div v-if="isCalculating" class="w-full flex justify-center">
		<div class="text-center w-100 py-3">
			<PProgressBar :step="1" :total="2" />
			<div class="pt-3 text-xs text-muted">
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
			<PDataTable
				:columns="columns"
				:data="currentResults"
				striped
				:page-size="50">
				<template #cell-ticker="{ row }">
					<MaterialTile
						:key="`${row.ticker}-${row.buildingTicker}`"
						:ticker="row.ticker" />
				</template>
				<template #cell-buildingTicker="{ row }">
					<span class="font-bold">{{
						row.buildingTicker
					}}</span>
				</template>
				<template #cell-pricePerNeed="{ row }">
					<div
						class="text-nowrap"
						:class="row.cxPrice <= 0 ? 'text-muted' : ''">
						<template v-if="row.cxPrice > 0">
							{{ formatNumber(row.pricePerNeed, 4) }}
						</template>
						<template v-else>&mdash;</template>
					</div>
				</template>
				<template #cell-cxPrice="{ row }">
					<div
						class="text-nowrap"
						:class="row.cxPrice <= 0 ? 'text-muted' : ''">
						<template v-if="row.cxPrice > 0">
							{{ formatNumber(row.cxPrice, 2) }}
						</template>
						<template v-else>&mdash;</template>
					</div>
				</template>
				<template #cell-qtyPerDay="{ row }">
					<div class="text-nowrap">
						{{ formatNumber(row.qtyPerDay, 2) }}
					</div>
				</template>
			</PDataTable>
		</div>
	</div>
</template>
