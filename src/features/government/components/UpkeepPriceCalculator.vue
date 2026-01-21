<script setup lang="ts">
	import { ComputedRef, Ref, computed, onMounted, ref, watch } from "vue";

	// Composables
	import { useUpkeepBuildings } from "@/features/government/composables/useUpkeepBuildings";
	import { useUpkeepPriceCalculator } from "@/features/government/composables/useUpkeepPriceCalculator";
	import { useUpkeepBuildingSummary } from "@/features/government/composables/useUpkeepBuildingSummary";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import {
		IUpkeepMaterialCalculation,
		IUpkeepBuildingSummary,
		UpkeepNeedType,
	} from "@/features/government/upkeepCalculations.types";

	// UI
	import { PProgressBar, PButton, PButtonGroup, PTag, PTooltip } from "@/ui";
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

	// Composables
	const { needTypes } = useUpkeepBuildings();
	const { calculateAllBuildingSummaries } = useUpkeepBuildingSummary();

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

	const buildingSummaries: ComputedRef<IUpkeepBuildingSummary[]> = computed(
		() =>
			calculateAllBuildingSummaries(
				selectedNeedType.value,
				currentResults.value
			)
	);

	async function calculate() {
		isCalculating.value = true;

		const { calculateAllNeeds } = await useUpkeepPriceCalculator(
			cxUuid,
			planetNaturalId
		);
		calculationResults.value = await calculateAllNeeds();

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
		<!-- Need Type Selection -->
		<div class="mb-4">
			<PButtonGroup>
				<PButton
					v-for="needType in needTypes"
					:key="needType"
					:type="selectedNeedType === needType ? 'primary' : 'secondary'"
					@click="selectedNeedType = needType">
					{{ capitalizeString(needType) }}
				</PButton>
			</PButtonGroup>
		</div>

		<!-- Building Summary Section -->
		<div class="mb-6">
			<h3 class="text-sm font-semibold text-white/80 mb-3">
				Building Summary
			</h3>
			<XNDataTable
				:data="buildingSummaries"
				striped
				:pagination="false"
				size="small">
				<XNDataTableColumn key="ticker" title="Building" sorter="default">
					<template #render-cell="{ rowData }">
						<div class="flex items-center gap-2">
							<span class="font-bold">{{ rowData.ticker }}</span>
							<PTooltip v-if="!rowData.isComplete">
								<template #trigger>
									<PTag type="warning" size="sm">
										{{ rowData.materialsAvailable }}/{{
											rowData.materialsTotal
										}}
									</PTag>
								</template>
								Some materials have no market price
							</PTooltip>
							<PTag v-else type="success" size="sm">
								{{ rowData.materialsAvailable }}/{{ rowData.materialsTotal }}
							</PTag>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="totalPricePerNeed"
					title="Total $/Need"
					sorter="default">
					<template #title>
						<div class="text-end">Total $/Need</div>
					</template>
					<template #render-cell="{ rowData }">
						<div
							class="text-end text-nowrap"
							:class="!rowData.isComplete ? 'text-white/40' : ''">
							<template v-if="rowData.materialsAvailable > 0">
								{{ formatNumber(rowData.totalPricePerNeed, 4) }}
							</template>
							<template v-else>-</template>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="totalDailyCost"
					title="Daily Cost"
					sorter="default">
					<template #title>
						<div class="text-end">Daily Cost</div>
					</template>
					<template #render-cell="{ rowData }">
						<div
							class="text-end text-nowrap"
							:class="!rowData.isComplete ? 'text-white/40' : ''">
							<template v-if="rowData.materialsAvailable > 0">
								{{ formatNumber(rowData.totalDailyCost, 2) }}
								<span class="pl-1 font-light text-white/50">$</span>
							</template>
							<template v-else>-</template>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="needProvided"
					title="Need/Day"
					sorter="default">
					<template #title>
						<div class="text-end">Need/Day</div>
					</template>
					<template #render-cell="{ rowData }">
						<div class="text-end text-nowrap">
							{{ formatNumber(rowData.needProvided, 2) }}
						</div>
					</template>
				</XNDataTableColumn>
			</XNDataTable>
		</div>

		<!-- Material Details Section -->
		<div>
			<h3 class="text-sm font-semibold text-white/80 mb-3">
				Material Details
			</h3>
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
	</div>
</template>
