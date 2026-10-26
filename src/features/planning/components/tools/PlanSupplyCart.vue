<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		type Ref,
		ref,
		watchEffect,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Composables
	import { useFIOStorage } from "@/features/fio/useFIOStorage";
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Types & Interfaces
	import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

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
	import { PSegmented, PDataTable, PInputNumber, PSelect, PIcon } from "@/ui";
	import type { PDataTableColumn } from "@/ui/ui.types";
	import { RouterLink } from "vue-router";
	import {
		CheckCircleOutlineSharp,
		RemoveCircleOutlineSharp,
	} from "@vicons/material";
	import type { IXITTransferMaterial } from "@/features/xit/xitAction.types";

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

	const {
		hasStorage,
		storageOptions,
		findStorageValueFromOptions,
		planetStorageId,
	} = useFIOStorage();
	const { supplyCartDays: refStockRequirement } = usePreferences();
	const refSelectedStorage: Ref<string | undefined> = ref(
		planetStorageId(props.planetNaturalId)
	);
	const refTypeFilter: Ref<TYPE_FILTER> = ref("all");
	const typeOptions = computed(() =>
		(["all", "workforce", "production"] as const).map((value) => ({
			value,
			label: t(`plan.tools.supply_cart.buttons.${value}`),
		}))
	);
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

	// first supply: nothing is produced yet, so ship the gross input,
	// including materials the plan makes itself (net delta >= 0)
	const xitInitialElements: ComputedRef<IXITTransferMaterial[]> = computed(
		() => {
			const source: IMaterialIO[] =
				refTypeFilter.value === "workforce"
					? props.workforceMaterialIO
					: refTypeFilter.value === "production"
						? props.productionMaterialIO
						: props.materialIO;

			return source
				.filter((m) => m.input > 0)
				.map((m) => ({
					ticker: m.ticker,
					value: clamp(
						Math.ceil(m.input * refStockRequirement.value) -
							findStorageValueFromOptions(
								refSelectedStorage.value,
								m.ticker
							),
						0,
						Infinity
					),
				}))
				.filter((e) => e.value > 0);
		}
	);

	const columns = computed<
		PDataTableColumn<(typeof filteredMaterialIO.value)[number]>[]
	>(() => {
		const sortable = (key: string, title: string) => ({
			key,
			title: t(`plan.tools.supply_cart.table.${title}`),
			sorter: true as const,
		});
		return [
			sortable("ticker", "ticker"),
			sortable("delta", "daily_need"),
			sortable("price", "daily_cost"),
			...(hasStorage.value ? [sortable("stock", "stock")] : []),
			sortable("stockNeed", "full_need"),
			sortable("needLeft", "final_need"),
			sortable("needWeight", "weight"),
			sortable("needVolume", "volume"),
			// yes before no; the default compare leaves booleans unsorted
			{
				...sortable("workforce", "workforce"),
				sorter: (a, b) => Number(a.workforce) - Number(b.workforce),
			},
			{
				...sortable("production", "production"),
				sorter: (a, b) => Number(a.production) - Number(b.production),
			},
		];
	});
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("plan.tools.supply_cart.title") }}
	</h2>

	<i18n-t
		keypath="plan.tools.supply_cart.info.p"
		tag="div"
		class="text-muted pb-3">
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
			<PSegmented
				v-model:value="refTypeFilter"
				:options="typeOptions"
				:label="t('plan.tools.supply_cart.filter_label')" />
		</div>
		<div class="flex flex-row flex-wrap gap-3">
			<div class="my-auto font-bold">
				{{ $t("plan.tools.supply_cart.table.stock_duration") }}
			</div>
			<PInputNumber
				v-model:value="refStockRequirement"
				:aria-label="$t('plan.tools.supply_cart.table.stock_duration')"
				show-buttons
				:min="0"
				decimals
				class="w-25!" />
			<template v-if="hasStorage">
				<div class="my-auto font-bold">
					{{ $t("plan.tools.supply_cart.table.storage") }}
				</div>
				<PSelect
					v-model:value="refSelectedStorage"
					:aria-label="$t('plan.tools.supply_cart.table.storage')"
					searchable
					:options="storageOptions"
					class="w-62.5!" />
			</template>
			<XITTransferActionButton
				source="supply_cart"
				:elements="xitTransferElements"
				transfer-name="Supply Cart" />
			<XITTransferActionButton
				source="supply_cart_initial"
				:elements="xitInitialElements"
				transfer-name="Supply Cart Initial"
				:button-text="t('plan.tools.supply_cart.buttons.xit_initial')"
				:drawer-title="
					t('plan.tools.supply_cart.table.xit_initial_name')
				"
				button-secondary />
		</div>
	</div>

	<PDataTable :columns="columns" :data="filteredMaterialIO" striped>
		<template #cell-ticker="{ row }">
			<MaterialTile
				:key="`SUPPLYCART#Material#${row.ticker}`"
				:ticker="row.ticker" />
		</template>
		<template #cell-delta="{ row }">
			{{ formatNumber(row.delta * -1) }}
		</template>
		<template #cell-price="{ row }">
			{{ formatNumber(row.price * -1) }}
		</template>
		<template #cell-stock="{ row }">
			{{ formatAmount(row.stock) }}
		</template>
		<template #cell-stockNeed="{ row }">
			{{ formatAmount(row.stockNeed) }}
		</template>
		<template #cell-needLeft="{ row }">
			{{ formatAmount(row.needLeft) }}
		</template>
		<template #cell-needWeight="{ row }">
			{{ formatNumber(row.needWeight) }}
		</template>
		<template #cell-needVolume="{ row }">
			{{ formatNumber(row.needVolume) }}
		</template>
		<template #cell-workforce="{ row }">
			<div class="text-center">
				<PIcon
					:class="row.workforce ? 'text-positive' : 'text-negative'">
					<CheckCircleOutlineSharp v-if="row.workforce" />
					<RemoveCircleOutlineSharp v-else />
				</PIcon>
			</div>
		</template>
		<template #cell-production="{ row }">
			<div class="text-center">
				<PIcon
					:class="row.production ? 'text-positive' : 'text-negative'">
					<CheckCircleOutlineSharp v-if="row.production" />
					<RemoveCircleOutlineSharp v-else />
				</PIcon>
			</div>
		</template>
		<template #summary>
			<div class="flex flex-row justify-between">
				<div
					class="grid grid-cols-2 gap-x-3 gap-y-1 child:not-even:font-bold">
					<div>
						{{ $t("plan.tools.supply_cart.table.daily_cost") }}
					</div>
					<div>
						{{ formatNumber(dailyCost) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</div>
					<div>
						{{ $t("plan.tools.supply_cart.table.total_cost") }}
					</div>
					<div>
						{{ formatNumber(totalCost) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</div>
				</div>
				<div
					class="grid grid-cols-2 gap-x-3 gap-y-1 child:text-end child:not-even:font-bold">
					<div>
						{{ $t("plan.tools.supply_cart.table.total_weight") }}
					</div>
					<div>
						{{ formatNumber(totalWeight) }}
						<span class="pl-1 font-light text-muted"> t </span>
					</div>
					<div>
						{{ $t("plan.tools.supply_cart.table.total_volume") }}
					</div>
					<div>
						{{ formatNumber(totalVolume) }}
						<span class="pl-1 font-light text-muted"> m³ </span>
					</div>
				</div>
			</div>
		</template>
	</PDataTable>
</template>
