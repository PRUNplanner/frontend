<script setup lang="ts">
	import type { PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IFIOSitesRepairTablePlanetElement } from "@/features/fio/useFIORepair.types";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	defineProps({
		repairData: {
			type: Array as PropType<IFIOSitesRepairTablePlanetElement[]>,
			required: true,
		},
	});
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg pb-3">
		{{ $t("fio.repair.table.title") }}
	</h2>

	<x-n-data-table :data="repairData" striped>
		<x-n-data-table-column
			key="planetName"
			:title="t('fio.repair.table.planet')"
			sorter="default" />
		<x-n-data-table-column
			key="amountProductionBuildings"
			:title="t('fio.repair.table.buildings')"
			sorter="default" />
		<x-n-data-table-column
			key="averageCondition"
			:title="t('fio.repair.table.avg_condition')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.averageCondition * 100) }} %
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column
			key="minCondition"
			:title="t('fio.repair.table.min_condition')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatNumber(rowData.minCondition * 100) }} %
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column
			key="maxLastRepairDays"
			:title="t('fio.repair.table.repair_age')"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{ formatAmount(rowData.maxLastRepairDays) }}
			</template>
		</x-n-data-table-column>
	</x-n-data-table>
</template>
