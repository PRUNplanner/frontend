<script setup lang="ts">
	import {
		type ComputedRef,
		type PropType,
		type Ref,
		computed,
		ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import COGMButton from "@/features/roi_overview/components/COGMButton.vue";
	import PlanetPOPRButton from "@/features/government/components/PlanetPOPRButton.vue";
	import ResourceROITableFilters from "@/features/resource_roi_overview/components/ResourceROITableFilters.vue";

	// Types & Interfaces
	import type { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { tablePagination } from "@/util/pagination";
	import { PValue } from "@/ui";

	const props = defineProps({
		searchedMaterial: {
			type: String,
			required: true,
		},
		resultData: {
			type: Array as PropType<IResourceROIResult[]>,
			required: true,
		},
	});

	const filterBuilding: Ref<string | null> = ref(null);
	const filterPostiveROI: Ref<boolean> = ref(false);
	const filterPlanet: Ref<string | null> = ref(null);

	const filterOptionBuilding: ComputedRef<PSelectOption[]> = computed(() =>
		Array.from(new Set(props.resultData.map((e) => e.buildingTicker)))
			.sort()
			.map((e) => ({ label: e, value: e }))
	);

	const filterOptionPlanet: ComputedRef<PSelectOption[]> = computed(() =>
		Array.from(new Set(props.resultData.map((e) => e.planetName)))
			.sort()
			.map((e) => ({ label: e, value: e }))
	);

	const localResult: ComputedRef<IResourceROIResult[]> = computed(() => {
		let filtered = props.resultData;

		if (filterBuilding.value !== null)
			filtered = filtered.filter(
				(f) => f.buildingTicker === filterBuilding.value
			);

		if (filterPlanet.value !== null)
			filtered = filtered.filter(
				(f) => f.planetName === filterPlanet.value
			);

		if (filterPostiveROI.value)
			filtered = filtered.filter((f) => f.planROI >= 0);

		return filtered;
	});

	function distanceSorter(key: string) {
		return (
			row1: Record<string, unknown>,
			row2: Record<string, unknown>
		): number => {
			const d1 = row1[key] === -1 ? Infinity : (row1[key] as number);
			const d2 = row2[key] === -1 ? Infinity : (row2[key] as number);
			return d1 - d2;
		};
	}

	const pagination = tablePagination(50);
</script>

<template>
	<ResourceROITableFilters
		v-model:filter-planet="filterPlanet"
		v-model:filter-building="filterBuilding"
		v-model:filter-positive-r-o-i="filterPostiveROI"
		:planet-options="filterOptionPlanet"
		:building-options="filterOptionBuilding"
		:searched-material="searchedMaterial" />
	<XNDataTable :data="localResult" striped :pagination="pagination">
		<XNDataTableColumn
			key="planetName"
			:title="t('resource_roi.table.planet')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<router-link
					:to="`/plan/${rowData.planetNaturalId}`"
					class="text-link-primary font-bold hover:underline">
					{{ rowData.planetName }}
				</router-link>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="production"
			:title="t('resource_roi.table.production')">
			<XNDataTableColumn
				key="buildingTicker"
				:title="t('resource_roi.table.building')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span class="font-bold">{{ rowData.buildingTicker }}</span>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="dailyYield"
				align="right"
				title-align="right"
				:title="t('resource_roi.table.daily')"
				sorter="default">
				<template #render-cell="{ rowData }">
					{{ formatNumber(rowData.dailyYield) }}
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="percentMaxDailyYield"
				align="right"
				title-align="right"
				:title="t('resource_roi.table.percent_max')"
				sorter="default">
				<template #render-cell="{ rowData }">
					{{ formatNumber(rowData.percentMaxDailyYield * 100) }}
				</template>
			</XNDataTableColumn>
		</XNDataTableColumn>
		<XNDataTableColumn key="planet" :title="t('resource_roi.table.planet')">
			<XNDataTableColumn key="popr" :title="t('resource_roi.table.popr')">
				<template #render-cell="{ rowData }">
					<PlanetPOPRButton
						:planet-natural-id="rowData.planetNaturalId"
						button-size="sm" />
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="planetCOGC"
				:title="t('resource_roi.table.cogc')">
				<template #render-cell="{ rowData }">
					{{
						rowData.planetCOGC
							? capitalizeString(rowData.planetCOGC)
									.replace("Advertising ", "")
									.replace("Workforce ", "")
							: "-"
					}}
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="environment"
				:title="t('resource_roi.table.environment')">
				<template #render-cell="{ rowData }">
					<div class="flex flex-row flex-wrap gap-1">
						<MaterialTile
							v-for="element in rowData.planetSurface"
							:key="element"
							:ticker="element" />
						<MaterialTile
							v-for="element in rowData.planetPressure"
							:key="element"
							:ticker="element" />
						<MaterialTile
							v-for="element in rowData.planetGravity"
							:key="element"
							:ticker="element" />
						<MaterialTile
							v-for="element in rowData.planetTemperature"
							:key="element"
							:ticker="element" />
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="planetInfrastructures"
				:title="t('resource_roi.table.infrastructure')">
				<template #render-cell="{ rowData }">
					{{ rowData.planetInfrastructures.join(", ") }}
				</template>
			</XNDataTableColumn>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="profit"
			:title="t('resource_roi.table.cost_profit')">
			<XNDataTableColumn key="cogm" title="COGM">
				<template #render-cell="{ rowData }">
					<COGMButton :cogm-data="rowData.cogm" />
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="planCost"
				:title="t('resource_roi.table.plan_cost')"
				align="right"
				title-align="right"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span class="text-nowrap">
						{{ formatNumber(rowData.planCost) }}
					</span>
				</template>
			</XNDataTableColumn>
			<!-- <XNDataTableColumn
				key="outputProfit"
				title="Output Profit"
				sorter="default">
				<template #title>
					<div class="text-end">Output Profit</div>
				</template>
				<template #render-cell="{ rowData }">
					<div class="text-end text-nowrap">
						<PValue :value="rowData.outputProfit" />
						<span class="pl-1 font-light text-muted">ȼ</span>
					</div>
				</template>
			</XNDataTableColumn> -->
			<XNDataTableColumn
				key="dailyProfit"
				:title="t('resource_roi.table.daily_profit')"
				align="right"
				title-align="right"
				sorter="default">
				<template #render-cell="{ rowData }">
					<PValue class="text-nowrap" :value="rowData.dailyProfit" />
				</template>
			</XNDataTableColumn>
			<!-- <XNDataTableColumn
				key="planProfitArea"
				title="Profit/Area"
				sorter="default">
				<template #title>
					<div class="text-end">Profit/Area</div>
				</template>
				<template #render-cell="{ rowData }">
					<div class="text-end text-nowrap">
						<PValue :value="rowData.planProfitArea" />
						<span class="pl-1 font-light text-muted">ȼ</span>
					</div>
				</template>
			</XNDataTableColumn> -->
			<XNDataTableColumn
				key="planROI"
				:title="t('resource_roi.table.plan_roi')"
				align="right"
				title-align="right"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="
							rowData.planROI > 0
								? 'text-positive'
								: 'text-negative'
						">
						{{ formatNumber(rowData.planROI) }}
					</span>
				</template>
			</XNDataTableColumn>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="distances"
			:title="t('resource_roi.table.distances')">
			<XNDataTableColumn
				key="distanceAI1"
				align="right"
				title-align="right"
				title="AI1"
				:sorter="distanceSorter('distanceAI1')">
				<template #render-cell="{ rowData }">
					<span v-if="rowData.distanceAI1 === -1">&mdash;</span>
					<span v-else>{{ rowData.distanceAI1 }}</span>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="distanceCI1"
				align="right"
				title-align="right"
				title="CI1"
				:sorter="distanceSorter('distanceCI1')">
				<template #render-cell="{ rowData }">
					<span v-if="rowData.distanceCI1 === -1">&mdash;</span>
					<span v-else>{{ rowData.distanceCI1 }}</span>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="distanceIC1"
				align="right"
				title-align="right"
				title="IC1"
				:sorter="distanceSorter('distanceIC1')">
				<template #render-cell="{ rowData }">
					<span v-if="rowData.distanceIC1 === -1">&mdash;</span>
					<span v-else>{{ rowData.distanceIC1 }}</span>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="distanceNC1"
				align="right"
				title-align="right"
				title="NC1"
				:sorter="distanceSorter('distanceNC1')">
				<template #render-cell="{ rowData }">
					<span v-if="rowData.distanceNC1 === -1">&mdash;</span>
					<span v-else>{{ rowData.distanceNC1 }}</span>
				</template>
			</XNDataTableColumn>
		</XNDataTableColumn>
	</XNDataTable>
</template>
