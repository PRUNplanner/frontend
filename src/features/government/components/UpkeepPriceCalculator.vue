<script setup lang="ts">
	import { ComputedRef, Ref, computed, onMounted, ref, watch } from "vue";

	// Composables
	import { usePrice } from "@/features/cx/usePrice";

	// Calculations
	import {
		calculateMaterialsForNeed,
		UPKEEP_NEED_TYPES,
	} from "@/features/government/upkeepCalculations";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import {
		IUpkeepMaterialCalculation,
		UpkeepNeedType,
	} from "@/features/government/upkeepCalculations.types";

	// UI
	import { PProgressBar, PButton, PButtonGroup } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const cxUuid: ComputedRef<string | undefined> = computed(() => props.cxUuid);
	const planetNaturalId: Ref<string | undefined> = ref(undefined);

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

	const currentResults: ComputedRef<IUpkeepMaterialCalculation[]> = computed(
		() => calculationResults.value[selectedNeedType.value]
	);

	async function calculate() {
		isCalculating.value = true;

		const { getPrice } = await usePrice(cxUuid, planetNaturalId);

		for (const needType of UPKEEP_NEED_TYPES) {
			calculationResults.value[needType] = await calculateMaterialsForNeed(
				needType,
				(ticker: string) => getPrice(ticker, "BUY")
			);
		}

		isCalculating.value = false;
	}

	watch(
		() => props.cxUuid,
		async () => {
			await calculate();
		}
	);

	onMounted(async () => {
		await calculate();
	});
</script>

<template>
	<div v-if="isCalculating" class="w-full flex justify-center">
		<div class="text-center w-100 py-3">
			<PProgressBar :step="1" :total="2" />
			<div class="pt-3 text-xs text-white/60">
				Calculating Upkeep Material Prices
			</div>
		</div>
	</div>
	<div v-else>
		<div class="mb-4">
			<PButtonGroup>
				<PButton
					v-for="needType in UPKEEP_NEED_TYPES"
					:key="needType"
					:type="selectedNeedType === needType ? 'primary' : 'secondary'"
					@click="selectedNeedType = needType">
					{{ capitalizeString(needType) }}
				</PButton>
			</PButtonGroup>
		</div>

		<XNDataTable
			:data="currentResults"
			striped
			:pagination="{ pageSize: 50 }">
			<XNDataTableColumn key="ticker" title="Material" sorter="default">
				<template #render-cell="{ rowData }">
					<MaterialTile
						:key="`${rowData.ticker}-${rowData.buildingTicker}`"
						:ticker="rowData.ticker"
						:amount="null" />
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="buildingTicker"
				title="Building"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span class="font-bold">{{ rowData.buildingTicker }}</span>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="pricePerNeed"
				title="$/Need"
				sorter="default">
				<template #title>
					<div class="text-end">$/Need</div>
				</template>
				<template #render-cell="{ rowData }">
					<div
						class="text-end text-nowrap"
						:class="rowData.cxPrice <= 0 ? 'text-white/40' : ''">
						<template v-if="rowData.cxPrice > 0">
							{{ formatNumber(rowData.pricePerNeed, 4) }}
						</template>
						<template v-else>-</template>
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn key="cxPrice" title="CX Price" sorter="default">
				<template #title>
					<div class="text-end">CX Price</div>
				</template>
				<template #render-cell="{ rowData }">
					<div
						class="text-end text-nowrap"
						:class="rowData.cxPrice <= 0 ? 'text-white/40' : ''">
						<template v-if="rowData.cxPrice > 0">
							{{ formatNumber(rowData.cxPrice, 2) }}
							<span class="pl-1 font-light text-white/50">$</span>
						</template>
						<template v-else>-</template>
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="relativePrice"
				title="Relative Price"
				sorter="default">
				<template #title>
					<div class="text-end">Relative Price</div>
				</template>
				<template #render-cell="{ rowData }">
					<div
						class="text-end text-nowrap"
						:class="rowData.cxPrice <= 0 ? 'text-white/40' : ''">
						<template v-if="rowData.cxPrice > 0">
							{{ formatNumber(rowData.relativePrice, 2) }}
							<span class="pl-1 font-light text-white/50">$</span>
						</template>
						<template v-else>-</template>
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="qtyPerDay"
				title="Qty/Day"
				sorter="default">
				<template #title>
					<div class="text-end">Qty/Day</div>
				</template>
				<template #render-cell="{ rowData }">
					<div class="text-end text-nowrap">
						{{ formatNumber(rowData.qtyPerDay, 2) }}
					</div>
				</template>
			</XNDataTableColumn>
		</XNDataTable>
	</div>
</template>
