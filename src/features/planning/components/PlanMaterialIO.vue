<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	// Util
	import { formatNumber } from "@/util/numbers";

	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PValue } from "@/ui";

	const props = defineProps({
		materialIOData: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		// body height; the header stays fixed above it
		maxHeight: {
			type: String,
			required: false,
			default: undefined,
		},
		showBasked: {
			type: Boolean,
			required: true,
		},
	});

	// Local State
	const localMaterialIOData: ComputedRef<IMaterialIO[]> = computed(
		() => props.materialIOData
	);
	const localShowBasked: ComputedRef<boolean> = computed(
		() => props.showBasked
	);

	const columns = computed<PDataTableColumn<IMaterialIO>[]>(() => {
		const numeric = (key: string, title: string) => ({
			key,
			title: t(`plan.components.materialio.table.${title}`),
			align: "right" as const,
			sorter: true as const,
		});
		return [
			{ key: "ticker", title: "", sorter: true },
			numeric("input", "input"),
			numeric("output", "output"),
			numeric("delta", "delta"),
			...(localShowBasked.value
				? [
						numeric("totalWeight", "total_weight"),
						numeric("totalVolume", "total_volume"),
					]
				: [numeric("price", "cost_day")]),
		];
	});
</script>

<template>
	<PDataTable
		:columns="columns"
		:data="localMaterialIOData"
		:max-height="maxHeight"
		striped>
		<!-- the ticker title is visually empty, as before, but names the sort button -->
		<template #header-ticker>
			<span class="sr-only">{{ t("terms.material_ticker") }}</span>
		</template>
		<template #cell-ticker="{ row }">
			<MaterialTile
				:key="`MATERIALIO#MATERIALTILE#${row.ticker}`"
				:ticker="row.ticker"
				:daily="row.delta"
				:disable-drawer="false" />
		</template>
		<template #cell-input="{ row }">
			<span :class="row.input === 0 ? 'text-muted' : ''">
				{{ formatNumber(row.input) }}
			</span>
		</template>
		<template #cell-output="{ row }">
			<span :class="row.output === 0 ? 'text-muted' : ''">
				{{ formatNumber(row.output) }}
			</span>
		</template>
		<template #cell-delta="{ row }">
			<PValue :value="row.delta" />
		</template>
		<!-- may wrap: at phone width the column is too narrow -->
		<template #header-price>
			<span class="whitespace-normal">
				{{ t("plan.components.materialio.table.cost_day") }}
			</span>
		</template>
		<template #cell-price="{ row }">
			<PValue :value="row.price" />
		</template>
		<template #cell-totalWeight="{ row }">
			<PValue :value="row.totalWeight" />
		</template>
		<template #cell-totalVolume="{ row }">
			<PValue :value="row.totalVolume" />
		</template>
	</PDataTable>
</template>
