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
	import { planetLabelParts } from "@/util/planetName";
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
	import type {
		IResourceROIExchange,
		IResourceROIResult,
	} from "@/features/resource_roi_overview/useResourceROIOverview.types";
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

	// jumps to one exchange, unreachable (-1) sorts as the farthest
	function distanceSorter(code: IResourceROIExchange) {
		return (row1: IResourceROIResult, row2: IResourceROIResult): number => {
			const d1 = jumpsTo(row1, code);
			const d2 = jumpsTo(row2, code);
			return (d1 === -1 ? Infinity : d1) - (d2 === -1 ? Infinity : d2) || 0;
		};
	}

	/*
	 * The answer first: planet, production, cost and payback, then the
	 * planet's details and the jumps to every exchange.
	 */
	type Column = PDataTableColumn<IResourceROIResult>;
	const columns = computed<Column[]>(() => {
		const title = (key: string) => t(`resource_roi.table.${key}`);
		const numeric = (key: string, text: string): Column => ({
			key,
			title: text,
			align: "right",
			sorter: true,
		});
		return [
			{
				key: "planetName",
				title: title("planet"),
				sorter: true,
				// "Mount Olympus h" on one line, the ID under it
				minWidth: 140,
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
				key: "planet",
				title: title("planet"),
				children: [
					{ key: "popr", title: title("popr") },
					{ key: "planetCOGC", title: title("cogc") },
					{
						key: "environment",
						title: title("environment"),
						// two tiles side by side
						minWidth: 110,
					},
					{
						key: "planetInfrastructures",
						title: title("infrastructure"),
					},
				],
			},
			{
				key: "distances",
				title: title("distances"),
				children: ROI_EXCHANGES.map((code) => ({
					key: `distance${code}`,
					title: code,
					align: "right" as const,
					sorter: distanceSorter(code),
				})),
			},
		];
	});

	// leaf headers may wrap at spaces: narrower columns
	const leafColumns = computed(() =>
		columns.value.flatMap((c) => c.children ?? [c])
	);
</script>

<template>
	<ResourceROITableFilters
		v-model:filter-planet="filterPlanet"
		v-model:filter-building="filterBuilding"
		v-model:filter-positive-r-o-i="filterPostiveROI"
		:planet-options="filterOptionPlanet"
		:building-options="filterOptionBuilding"
		:searched-material="searchedMaterial" />
	<!-- below 1300 px it scrolls with the planet pinned, not squeezed -->
	<PDataTable
		:columns="columns"
		:data="localResult"
		striped
		sticky-first
		dense
		:page-size="50"
		:min-width="1300"
		:row-key="roiRowKey"
		:row-class="rowClass">
		<template
			v-for="col in leafColumns"
			:key="col.key"
			#[`header-${col.key}`]>
			<span class="whitespace-normal">{{ col.title }}</span>
		</template>
		<template #cell-planetName="{ row }">
			<!-- the name wraps, the planet ID never breaks at its hyphen -->
			<router-link
				:to="`/plan/${row.planetNaturalId}`"
				class="text-link-primary font-bold hover:underline">
				{{ planetLabelParts(row.planetName)[0] }}
				<span class="whitespace-nowrap">
					{{ planetLabelParts(row.planetName)[1] }}
				</span>
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
					class="w-8 shrink-0"
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
					class="w-8 shrink-0"
					tone="positive"
					:value="row.dailyProfit"
					:max="maxProfit" />
				<PValue class="text-nowrap" :value="row.dailyProfit" />
			</div>
		</template>
		<template #cell-planROI="{ row }">
			<div class="flex items-center justify-end gap-2">
				<PInlineBar
					class="w-8 shrink-0"
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
