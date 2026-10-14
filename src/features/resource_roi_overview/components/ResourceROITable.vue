<script setup lang="ts">
	import {
		type ComputedRef,
		type PropType,
		type Ref,
		computed,
		ref,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";
	import {
		ROI_EXCHANGES,
		jumpsTo,
		nearestExchange,
		roiRowKey,
	} from "@/features/resource_roi_overview/resourceROIChart.util";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import COGMButton from "@/features/roi_overview/components/COGMButton.vue";
	import PlanetPOPRButton from "@/features/government/components/PlanetPOPRButton.vue";
	import ResourceROITableFilters from "@/features/resource_roi_overview/components/ResourceROITableFilters.vue";
	import PInlineBar from "@/ui/charts/PInlineBar.vue";

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
		/** row key (roiRowKey) hovered in the chart, highlighted */
		active: {
			type: String as PropType<string | null>,
			default: null,
		},
	});

	const emit = defineEmits<{
		(e: "filtered", rows: IResourceROIResult[]): void;
	}>();

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

	// the chart shows what the table shows
	watch(localResult, (rows) => emit("filtered", rows), { immediate: true });

	const theme = useChartTheme();
	// ROI bar scale in days, lower is better
	const ROI_BAR_DAYS = 20;
	const maxProfit = computed(() =>
		Math.max(0, ...localResult.value.map((r) => r.dailyProfit))
	);

	const rowClass = (row: IResourceROIResult) =>
		roiRowKey(row) === props.active ? "!bg-white/10" : "";

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
		:min-width="1700"
		:row-key="roiRowKey"
		:row-class="rowClass">
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
			<div class="flex items-center justify-end gap-2">
				<PInlineBar
					class="w-12 shrink-0"
					:value="row.percentMaxDailyYield"
					:max="1" />
				{{ formatNumber(row.percentMaxDailyYield * 100) }}
			</div>
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
			<div class="flex items-center justify-end gap-2">
				<PInlineBar
					class="w-12 shrink-0"
					tone="positive"
					:value="row.dailyProfit"
					:max="maxProfit" />
				<PValue class="text-nowrap" :value="row.dailyProfit" />
			</div>
		</template>
		<template #cell-planROI="{ row }">
			<div class="flex items-center justify-end gap-2">
				<PInlineBar
					class="w-10 shrink-0"
					tone="positive"
					:value="row.planROI > 0 ? row.planROI : 0"
					:max="ROI_BAR_DAYS" />
				<span
					class="text-nowrap"
					:class="
						row.planROI > 0 ? 'text-positive' : 'text-negative'
					">
					{{ formatNumber(row.planROI) }}
				</span>
			</div>
		</template>
		<template
			v-for="code in ROI_EXCHANGES"
			:key="code"
			#[`cell-distance${code}`]="{ row }">
			<span v-if="jumpsTo(row, code) === -1">&mdash;</span>
			<!-- the nearest exchange (all of them on a tie) -->
			<span
				v-else-if="jumpsTo(row, code) === nearestExchange(row)?.jumps"
				class="font-bold"
				:style="{ color: theme.exchange(code) }">
				{{ jumpsTo(row, code) }}
			</span>
			<span v-else class="text-muted">{{ jumpsTo(row, code) }}</span>
		</template>
	</PDataTable>
</template>
