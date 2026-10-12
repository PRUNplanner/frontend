<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { usePreferences } from "@/features/preferences/usePreferences";

	const { getBurnDisplayClass } = usePreferences();
	const { planetName } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IFIOBurnPlanetTableElement } from "@/features/fio/useFIOBurn.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

	defineProps({
		planTable: {
			type: Array as PropType<IFIOBurnPlanetTableElement[]>,
			required: true,
		},
	});

	const columns = computed<PDataTableColumn<IFIOBurnPlanetTableElement>[]>(
		() => [
			{
				key: "planUuid",
				title: t("fio.burn.components.overview.table.plan"),
				// by the name shown, not the id
				sorter: (a, b) => a.planName.localeCompare(b.planName),
			},
			{
				key: "planetId",
				title: t("fio.burn.components.overview.table.planet"),
			},
			{
				key: "minDays",
				title: t("fio.burn.components.overview.table.burn"),
				sorter: true,
			},
		]
	);
</script>

<template>
	<PDataTable :columns="columns" :data="planTable" striped>
		<template #cell-planUuid="{ row }">
			<router-link
				:to="`/plan/${row.planetId}/${row.planUuid}`"
				class="text-link-primary font-bold hover:underline">
				{{ row.planName }}
			</router-link>
		</template>
		<template #cell-planetId="{ row }">
			{{ planetName(row.planetId, "Loading...") }}
		</template>
		<template #cell-minDays="{ row }">
			<div class="text-center">
				<span
					:class="getBurnDisplayClass(row.minDays).value"
					class="py-1 px-2">
					{{ formatNumber(row.minDays) }}
				</span>
			</div>
		</template>
	</PDataTable>
</template>
