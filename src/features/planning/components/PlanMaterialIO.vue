<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	// raukk: sourcing annotation of a single material I/O row
	import RaukkMaterialIOInfo from "@/features/raukk_sourcing/components/RaukkMaterialIOInfo.vue";

	// Types & Interfaces
	import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		materialIOData: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
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
</script>

<template>
	<XNDataTable :data="localMaterialIOData" striped>
		<XNDataTableColumn key="ticker" title="" sorter="default">
			<template #render-cell="{ rowData }">
				<MaterialTile
					:key="`MATERIALIO#MATERIALTILE#${rowData.ticker}`"
					:ticker="rowData.ticker"
					:disable-drawer="false" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="input"
			:title="t('plan.components.materialio.table.input')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span :class="rowData.input === 0 ? 'text-white/20' : ''">
					{{ formatNumber(rowData.input) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="output"
			:title="t('plan.components.materialio.table.output')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span :class="rowData.output === 0 ? 'text-white/20' : ''">
					{{ formatNumber(rowData.output) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="delta"
			:title="t('plan.components.materialio.table.delta')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span
					:class="
						rowData.delta > 0 ? 'text-positive' : 'text-negative'
					">
					{{ formatNumber(rowData.delta) }}
				</span>
				<!-- raukk: sourcing annotation -->
				<RaukkMaterialIOInfo
					:ticker="rowData.ticker"
					:delta="rowData.delta" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="!localShowBasked"
			key="price"
			:title="t('plan.components.materialio.table.cost_day')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span
					:class="
						rowData.price > 0 ? 'text-positive' : 'text-negative'
					">
					{{ formatNumber(rowData.price) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="localShowBasked"
			key="totalWeight"
			:title="t('plan.components.materialio.table.total_weight')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span
					:class="
						rowData.totalWeight > 0
							? 'text-positive'
							: 'text-negative'
					">
					{{ formatNumber(rowData.totalWeight) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="localShowBasked"
			key="totalVolume"
			:title="t('plan.components.materialio.table.total_volume')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<span
					:class="
						rowData.totalVolume > 0
							? 'text-positive'
							: 'text-negative'
					">
					{{ formatNumber(rowData.totalVolume) }}
				</span>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
