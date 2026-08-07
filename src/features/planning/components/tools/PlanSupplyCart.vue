<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		PropType,
		Ref,
		ref,
		watchEffect,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
	// raukk: per-unit-of-output cost strip
	import RaukkPerUnitStrip from "@/features/raukk_sourcing/components/RaukkPerUnitStrip.vue";

	// Composables
	import { useFIOStorage } from "@/features/fio/useFIOStorage";

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
				(sum, current) => sum + current.price,
				0
			) * -1
		);
	});

	const totalCost: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) =>
				sum +
				(Math.abs(current.price) / Math.abs(current.delta)) *
					current.needLeft,
			0
		);
	});

	const totalVolume: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) => sum + current.needVolume,
			0
		);
	});
	const totalWeight: ComputedRef<number> = computed(() => {
		return filteredMaterialIO.value.reduce(
			(sum, current) => sum + current.needWeight,
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
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("plan.tools.supply_cart.title") }}
	</h2>

	<i18n-t
		keypath="plan.tools.supply_cart.info.p"
		tag="div"
		class="text-white/50 pb-3">
		<template #link>
			<router-link
				to="/fio/burn"
				class="text-link-primary font-bold hover:underline">
				{{ $t("plan.tools.supply_cart.info.link") }}
			</router-link>
		</template>
	</i18n-t>

	<div
		class="border border-b-0 rounded-[3px] border-white/20 p-3 flex flex-row justify-between">
		<div>
			<PButtonGroup>
				<PButton
					:type="refTypeFilter === 'all' ? 'primary' : 'secondary'"
					@click="refTypeFilter = 'all'">
					{{ $t("plan.tools.supply_cart.buttons.all") }}
				</PButton>
				<PButton
					:type="
						refTypeFilter === 'workforce' ? 'primary' : 'secondary'
					"
					@click="refTypeFilter = 'workforce'">
					{{ $t("plan.tools.supply_cart.buttons.workforce") }}
				</PButton>
				<PButton
					:type="
						refTypeFilter === 'production' ? 'primary' : 'secondary'
					"
					@click="refTypeFilter = 'production'">
					{{ $t("plan.tools.supply_cart.buttons.production") }}
				</PButton>
			</PButtonGroup>
		</div>
		<div class="flex flex-row flex-wrap gap-3">
			<div class="my-auto font-bold">
				{{ $t("plan.tools.supply_cart.table.stock_duration") }}
			</div>
			<PInputNumber
				v-model:value="refStockRequirement"
				show-buttons
				:min="0"
				class="w-25!" />
			<template v-if="hasStorage">
				<div class="my-auto font-bold">
					{{ $t("plan.tools.supply_cart.table.storage") }}
				</div>
				<PSelect
					v-model:value="refSelectedStorage"
					searchable
					:options="storageOptions"
					class="w-62.5!" />
			</template>
			<XITTransferActionButton
				:elements="xitTransferElements"
				:transfer-name="t('plan.tools.supply_cart.table.xit_name')" />
		</div>
	</div>

	<XNDataTable :data="filteredMaterialIO" striped>
		<XNDataTableColumn
			key="ticker"
			:title="t('plan.tools.supply_cart.table.ticker')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<MaterialTile
					:key="`SUPPLYCART#Material#${rowData.ticker}`"
					:ticker="rowData.ticker" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="delta"
			:title="t('plan.tools.supply_cart.table.daily_need')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.delta * -1) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="price"
			:title="t('plan.tools.supply_cart.table.daily_cost')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.price * -1) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="hasStorage"
			key="stock"
			:title="t('plan.tools.supply_cart.table.stock')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.stock) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="stockNeed"
			:title="t('plan.tools.supply_cart.table.full_need')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.stockNeed) }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="needLeft"
			:title="t('plan.tools.supply_cart.table.final_need')"
			sorter="default">
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
		<XNDataTableColumn
			key="workforce"
			:title="t('plan.tools.supply_cart.table.workforce')"
			sorter="default">
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
		<XNDataTableColumn
			key="producton"
			:title="t('plan.tools.supply_cart.table.production')"
			sorter="default">
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
								<div>
									{{
										$t(
											"plan.tools.supply_cart.table.daily_cost"
										)
									}}
								</div>
								<div>
									{{ formatNumber(dailyCost) }}
									<span class="pl-1 font-light text-white/50">
										ȼ
									</span>
								</div>
								<div>
									{{
										$t(
											"plan.tools.supply_cart.table.total_cost"
										)
									}}
								</div>
								<div>
									{{ formatNumber(totalCost) }}
									<span class="pl-1 font-light text-white/50">
										ȼ
									</span>
								</div>
							</div>
							<div
								class="grid grid-cols-2 gap-x-3 gap-y-1 child:text-end child:not-even:font-bold">
								<div>
									{{
										$t(
											"plan.tools.supply_cart.table.total_weight"
										)
									}}
								</div>
								<div>
									{{ formatNumber(totalWeight) }}
									<span class="pl-1 font-light text-white/50">
										t
									</span>
								</div>
								<div>
									{{
										$t(
											"plan.tools.supply_cart.table.total_volume"
										)
									}}
								</div>
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
	<!-- raukk: combined consumption cost per unit of output -->
	<RaukkPerUnitStrip bucket="total" />
</template>
