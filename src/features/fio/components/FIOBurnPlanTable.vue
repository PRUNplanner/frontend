<script setup lang="ts">
	import { PropType } from "vue";

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
	import { IFIOBurnPlanetTableElement } from "@/features/fio/useFIOBurn.types";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	defineProps({
		planTable: {
			type: Array as PropType<IFIOBurnPlanetTableElement[]>,
			required: true,
		},
	});
</script>

<template>
	<XNDataTable :data="planTable" striped>
		<XNDataTableColumn
			key="planUuid"
			:title="t('fio.burn.components.overview.table.plan')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<router-link
					:to="`/plan/${rowData.planetId}/${rowData.planUuid}`"
					class="text-link-primary font-bold hover:underline">
					{{ rowData.planName }}
				</router-link>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="planetId"
			:title="t('fio.burn.components.overview.table.planet')">
			<template #render-cell="{ rowData }">
				{{
					planetName(rowData.planetId, "Loading...")
				}}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="minDays"
			:title="t('fio.burn.components.overview.table.burn')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-center">
					<span
						:class="getBurnDisplayClass(rowData.minDays).value"
						class="py-1 px-2">
						{{ formatNumber(rowData.minDays) }}
					</span>
				</div>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
