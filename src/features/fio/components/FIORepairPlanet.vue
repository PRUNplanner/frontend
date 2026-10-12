<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IFIOSitesRepairTablePlanetElement } from "@/features/fio/useFIORepair.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

	defineProps({
		repairData: {
			type: Array as PropType<IFIOSitesRepairTablePlanetElement[]>,
			required: true,
		},
	});

	const columns = computed<
		PDataTableColumn<IFIOSitesRepairTablePlanetElement>[]
	>(() => [
		{ key: "planetName", title: t("fio.repair.table.planet"), sorter: true },
		{
			key: "amountProductionBuildings",
			title: t("fio.repair.table.buildings"),
			sorter: true,
		},
		{
			key: "averageCondition",
			title: t("fio.repair.table.avg_condition"),
			sorter: true,
		},
		{
			key: "minCondition",
			title: t("fio.repair.table.min_condition"),
			sorter: true,
		},
		{
			key: "maxLastRepairDays",
			title: t("fio.repair.table.repair_age"),
			sorter: true,
		},
	]);
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg pb-3">
		{{ $t("fio.repair.table.title") }}
	</h2>

	<PDataTable :columns="columns" :data="repairData" striped>
		<template #cell-averageCondition="{ row }">
			{{ formatNumber(row.averageCondition * 100) }} %
		</template>
		<template #cell-minCondition="{ row }">
			{{ formatNumber(row.minCondition * 100) }} %
		</template>
		<template #cell-maxLastRepairDays="{ row }">
			{{ formatAmount(row.maxLastRepairDays) }}
		</template>
	</PDataTable>
</template>
