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
	import type { PDataTableColumn, PSelectOption } from "@/ui/ui.types";

	// UI
	import { PDataTable, PValue } from "@/ui";

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
		return (row1: IResourceROIResult, row2: IResourceROIResult): number => {
			const v1 = (row1 as unknown as Record<string, number>)[key];
			const v2 = (row2 as unknown as Record<string, number>)[key];
			const d1 = v1 === -1 ? Infinity : v1;
			const d2 = v2 === -1 ? Infinity : v2;
			return d1 - d2;
		};
	}

	type Column = PDataTableColumn<IResourceROIResult>;
	const columns = computed<Column[]>(() => {
		const title = (key: string) => t(`resource_roi.table.${key}`);
		const numeric = (
			key: string,
			text: string,
			sorter: Column["sorter"] = true
		): Column => ({ key, title: text, align: "right", sorter });
		const distance = (key: string, text: string) =>
			numeric(key, text, distanceSorter(key));
		return [
			{
				key: "planetName",
				title: title("planet"),
				sorter: true,
			},
			{
				key: "production",
				title: title("production"),
				children: [
					{
						key: "buildingTicker",
						title: title("building"),
						sorter: true,
					},
					numeric("dailyYield", title("daily")),
					numeric("percentMaxDailyYield", title("percent_max")),
				],
			},
			{
				key: "planet",
				title: title("planet"),
				children: [
					{ key: "popr", title: title("popr") },
					{ key: "planetCOGC", title: title("cogc") },
					{
						key: "environment",
						title: title("environment"),
					},
					{
						key: "planetInfrastructures",
						title: title("infrastructure"),
					},
				],
			},
			{
				key: "profit",
				title: title("cost_profit"),
				children: [
					{ key: "cogm", title: "COGM" },
					numeric("planCost", title("plan_cost")),
					numeric("dailyProfit", title("daily_profit")),
					numeric("planROI", title("plan_roi")),
				],
			},
			{
				key: "distances",
				title: title("distances"),
				children: [
					distance("distanceAI1", "AI1"),
					distance("distanceCI1", "CI1"),
					distance("distanceIC1", "IC1"),
					distance("distanceNC1", "NC1"),
				],
			},
		];
	});
</script>

<template>
	<ResourceROITableFilters
		v-model:filter-planet="filterPlanet"
		v-model:filter-building="filterBuilding"
		v-model:filter-positive-r-o-i="filterPostiveROI"
		:planet-options="filterOptionPlanet"
		:building-options="filterOptionBuilding"
		:searched-material="searchedMaterial" />
	<!-- below 1700 px the table scrolls instead of squeezing names -->
	<PDataTable
		:columns="columns"
		:data="localResult"
		striped
		:page-size="50"
		:min-width="1700">
		<template #cell-planetName="{ row }">
			<router-link
				:to="`/plan/${row.planetNaturalId}`"
				class="text-link-primary font-bold hover:underline">
				{{ row.planetName }}
			</router-link>
		</template>
		<template #cell-buildingTicker="{ row }">
			<span class="font-bold">{{ row.buildingTicker }}</span>
		</template>
		<template #cell-dailyYield="{ row }">
			{{ formatNumber(row.dailyYield) }}
		</template>
		<template #cell-percentMaxDailyYield="{ row }">
			{{ formatNumber(row.percentMaxDailyYield * 100) }}
		</template>
		<template #cell-popr="{ row }">
			<PlanetPOPRButton
				:planet-natural-id="row.planetNaturalId"
				button-size="sm" />
		</template>
		<template #cell-planetCOGC="{ row }">
			{{
				row.planetCOGC
					? capitalizeString(row.planetCOGC)
							.replace("Advertising ", "")
							.replace("Workforce ", "")
					: "—"
			}}
		</template>
		<template #cell-environment="{ row }">
			<div class="flex flex-row flex-wrap gap-1">
				<MaterialTile
					v-for="element in row.planetSurface"
					:key="element"
					:ticker="element" />
				<MaterialTile
					v-for="element in row.planetPressure"
					:key="element"
					:ticker="element" />
				<MaterialTile
					v-for="element in row.planetGravity"
					:key="element"
					:ticker="element" />
				<MaterialTile
					v-for="element in row.planetTemperature"
					:key="element"
					:ticker="element" />
			</div>
		</template>
		<template #cell-planetInfrastructures="{ row }">
			{{ row.planetInfrastructures.join(", ") }}
		</template>
		<template #cell-cogm="{ row }">
			<COGMButton :cogm-data="row.cogm" />
		</template>
		<template #cell-planCost="{ row }">
			<span class="text-nowrap">
				{{ formatNumber(row.planCost) }}
			</span>
		</template>
		<template #cell-dailyProfit="{ row }">
			<PValue class="text-nowrap" :value="row.dailyProfit" />
		</template>
		<template #cell-planROI="{ row }">
			<span
				class="text-nowrap"
				:class="
					row.planROI > 0
						? 'text-positive'
						: 'text-negative'
				">
				{{ formatNumber(row.planROI) }}
			</span>
		</template>
		<template #cell-distanceAI1="{ row }">
			<span v-if="row.distanceAI1 === -1">&mdash;</span>
			<span v-else>{{ row.distanceAI1 }}</span>
		</template>
		<template #cell-distanceCI1="{ row }">
			<span v-if="row.distanceCI1 === -1">&mdash;</span>
			<span v-else>{{ row.distanceCI1 }}</span>
		</template>
		<template #cell-distanceIC1="{ row }">
			<span v-if="row.distanceIC1 === -1">&mdash;</span>
			<span v-else>{{ row.distanceIC1 }}</span>
		</template>
		<template #cell-distanceNC1="{ row }">
			<span v-if="row.distanceNC1 === -1">&mdash;</span>
			<span v-else>{{ row.distanceNC1 }}</span>
		</template>
	</PDataTable>
</template>
