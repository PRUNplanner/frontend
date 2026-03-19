<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

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
		<XNDataTableColumn key="input" title="In" sorter="default">
			<template #render-cell="{ rowData }">
				<span :class="rowData.input === 0 ? 'text-white/20' : ''">
					{{ formatNumber(rowData.input) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="output" title="Out" sorter="default">
			<template #render-cell="{ rowData }">
				<span :class="rowData.output === 0 ? 'text-white/20' : ''">
					{{ formatNumber(rowData.output) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="delta" title="Δ" sorter="default">
			<template #render-cell="{ rowData }">
				<span
					:class="
						rowData.delta > 0 ? 'text-positive' : 'text-negative'
					">
					{{ formatNumber(rowData.delta) }}
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="!localShowBasked"
			key="price"
			title="ȼ / day"
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
			title="Δ t"
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
			title="Δ m³"
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
