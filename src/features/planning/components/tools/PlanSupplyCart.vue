<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		PropType,
		Ref,
		ref,
		watchEffect,
	} from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Composables
	import { useFIOStorage } from "@/features/fio/useFIOStorage";
	import { useUserStore } from "@/stores/userStore";

	// Types & Interfaces
	import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	interface ISupplyCartElement extends IMaterialIO {
		workforce: boolean;
		production: boolean;
		stockNeed: number;
		stock: number;
		needLeft: number;
		needVolume: number;
		needWeight: number;
	}

	type TYPE_FILTER = "all" | "workforce" | "production";

	// Util
	import { formatNumber, formatAmount, clamp } from "@/util/numbers";

	// UI
	import { PButton, PButtonGroup, PInputNumber, PSelect, PIcon } from "@/ui";
	import { RouterLink } from "vue-router";
	import {
		XNDataTable,
		XNDataTableColumn,
		XNDataTableSummaryRow,
		XNDataTableSummaryCell,
	} from "@skit/x.naive-ui";
	import {
		CheckCircleOutlineSharp,
		RemoveCircleOutlineSharp,
	} from "@vicons/material";
	import { IXITTransferMaterial } from "@/features/xit/xitAction.types";

	const props = defineProps({
		planetNaturalId: {
			type: String,
			required: true,
		},
		materialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		workforceMaterialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		productionMaterialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
	});

	const { hasStorage, storageOptions, findStorageValueFromOptions } =
		useFIOStorage();
	const userStore = useUserStore();

	const refStockRequirement: Ref<number> = ref(20);
	const refSelectedStorage: Ref<string | undefined> = ref(
		hasStorage.value
			? storageOptions.value.filter(
					(e) => e.value === `PLANET#${props.planetNaturalId}`
			  )
				? `PLANET#${props.planetNaturalId}`
				: undefined
			: undefined
	);
	const refTypeFilter: Ref<TYPE_FILTER> = ref("all");
	const localMaterialIO: Ref<ISupplyCartElement[]> = ref([]);

	watchEffect(() => {
		createLocalMaterialIO();
	});

	function createLocalMaterialIO(): void {
		localMaterialIO.value = [];

		props.materialIO.forEach((m) => {
			if (m.delta < 0) {
				const stockNeed: number = Math.ceil(
					Math.abs(m.delta) * refStockRequirement.value
				);
				const stock: number = findStorageValueFromOptions(
					refSelectedStorage.value,
					m.ticker
				);
				const needLeft: number = clamp(stockNeed - stock, 0, Infinity);

				localMaterialIO.value.push({
					...m,
					workforce: !!props.workforceMaterialIO.find(
						(e) => e.ticker === m.ticker
					),
					production: !!props.productionMaterialIO.find(
						(e) => e.ticker === m.ticker
					),
					stockNeed,
					stock,
					needLeft,
					needVolume: needLeft * m.individualVolume,
					needWeight: needLeft * m.individualWeight,
				});
			}
		});
	}

	const filteredMaterialIO = computed(() => {
		if (refTypeFilter.value === "workforce")
			return localMaterialIO.value.filter((e) => e.workforce);
		else if (refTypeFilter.value === "production")
			return localMaterialIO.value.filter((e) => e.production);
		else return localMaterialIO.value;
	});

	const dailyCost: ComputedRef<number> = computed(() => {
		return (
			filteredMaterialIO.value.reduce(
				(sum, current) => (sum = sum + current.price),
				0
			) * -1
		);
	});

	const totalCost: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) =>
				(sum =
					sum +
					(Math.abs(current.price) / Math.abs(current.delta)) *
						current.needLeft),
			0
		);
	});

	const totalVolume: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) => (sum = sum + current.needVolume),
			0
		);
	});
	const totalWeight: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) => (sum = sum + current.needWeight),
			0
		);
	});

	const xitTransferElements: ComputedRef<IXITTransferMaterial[]> = computed(
		() =>
			filteredMaterialIO.value.map((e) => ({
				ticker: e.ticker,
				value: e.needLeft,
			}))
	);
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">Supply Cart</h2>
	<div class="text-white/50 pb-3">
		The Supply Cart provides updates on your plans needs combined with
		existing inventory sourced from FIO. You have the flexibility to opt for
		alternative storage locations to replenish your base. Tailor your
		selection based on whether you wish to restock workforce and production
		supplies or focus on a specific category, and specify the duration for
		which the supplied stock should sustain.
		<template v-if="userStore.hasFIO">
			Use the
			<RouterLink
				to="/fio/burn"
				class="text-link-primary font-bold hover:underline">
				<span>FIO Burn</span>
			</RouterLink>
			tool for more advanced supply cart options.
		</template>
	</div>

	<div
		class="border border-b-0 rounded-[3px] border-white/20 p-3 flex flex-row justify-between">
		<div>
			<PButtonGroup>
				<PButton
					:type="refTypeFilter === 'all' ? 'primary' : 'secondary'"
					@click="refTypeFilter = 'all'">
					All
				</PButton>
				<PButton
					:type="
						refTypeFilter === 'workforce' ? 'primary' : 'secondary'
					"
					@click="refTypeFilter = 'workforce'">
					Workforce
				</PButton>
				<PButton
					:type="
						refTypeFilter === 'production' ? 'primary' : 'secondary'
					"
					@click="refTypeFilter = 'production'">
					Production
				</PButton>
			</PButtonGroup>
		</div>
		<div class="flex flex-row flex-wrap gap-3">
			<div class="my-auto font-bold">Stock Duration (days)</div>
			<PInputNumber
				v-model:value="refStockRequirement"
				show-buttons
				:min="0"
				class="w-25!" />
			<template v-if="hasStorage">
				<div class="my-auto font-bold">Storage</div>
				<PSelect
					v-model:value="refSelectedStorage"
					searchable
					:options="storageOptions"
					class="w-62.5!" />
			</template>
			<XITTransferActionButton
				:elements="xitTransferElements"
				transfer-name="Supply Cart" />
		</div>
	</div>

	<XNDataTable :data="filteredMaterialIO" striped>
		<XNDataTableColumn key="ticker" title="Ticker" sorter="default">
			<template #render-cell="{ rowData }">
				<MaterialTile
					:key="`SUPPLYCART#Material#${rowData.ticker}`"
					:ticker="rowData.ticker" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="delta" title="Daily Need" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.delta * -1) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="price" title="Daily Cost" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.price * -1) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="hasStorage"
			key="stock"
			title="Stock"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.stock) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="stockNeed" title="Full Need" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.stockNeed) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="needLeft" title="Final Need" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.needLeft) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="needWeight" title="t" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.needWeight) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="needVolume" title="m³" sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.needVolume) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="workforce" title="Workforce" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-center">
					<PIcon
						:class="
							rowData.workforce
								? 'text-positive'
								: 'text-negative'
						">
						<CheckCircleOutlineSharp v-if="rowData.workforce" />
						<RemoveCircleOutlineSharp v-else />
					</PIcon>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="producton" title="Production" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-center">
					<PIcon
						:class="
							rowData.production
								? 'text-positive'
								: 'text-negative'
						">
						<CheckCircleOutlineSharp v-if="rowData.production" />
						<RemoveCircleOutlineSharp v-else />
					</PIcon>
				</div>
			</template>
		</XNDataTableColumn>
		<template #summary>
			<XNDataTableSummaryRow>
				<XNDataTableSummaryCell
					key="ticker"
					:col-span="hasStorage ? 10 : 9">
					<template #default>
						<div class="flex flex-row justify-between">
							<div
								class="grid grid-cols-2 gap-x-3 gap-y-1 child:not-even:font-bold">
								<div>Daily Cost</div>
								<div>
									{{ formatNumber(dailyCost) }}
									<span class="pl-1 font-light text-white/50">
										$
									</span>
								</div>
								<div>Total Cost</div>
								<div>
									{{ formatNumber(totalCost) }}
									<span class="pl-1 font-light text-white/50">
										$
									</span>
								</div>
							</div>
							<div
								class="grid grid-cols-2 gap-x-3 gap-y-1 child:text-end child:not-even:font-bold">
								<div>Total Weight</div>
								<div>
									{{ formatNumber(totalWeight) }}
									<span class="pl-1 font-light text-white/50">
										t
									</span>
								</div>
								<div>Total Volume</div>
								<div>
									{{ formatNumber(totalVolume) }}
									<span class="pl-1 font-light text-white/50">
										m³
									</span>
								</div>
							</div>
						</div>
					</template>
				</XNDataTableSummaryCell>
			</XNDataTableSummaryRow>
		</template>
	</XNDataTable>
</template>
