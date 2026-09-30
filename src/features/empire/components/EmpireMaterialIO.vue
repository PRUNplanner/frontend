<script setup lang="ts">
	import { type PropType, computed, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import EmpireMaterialIOSummaryCell from "@/features/empire/components/EmpireMaterialIOSummaryCell.vue";
	import EmpireMaterialIODetail from "@/features/empire/components/EmpireMaterialIODetail.vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";
	import { summarizeSide } from "@/features/empire/util/empireMaterialIO.util";

	// UI
	import { PValue } from "@/ui";
	import { ChevronRightSharp } from "@vicons/material";

	// Types & Interfaces
	import type {
		IEmpireMaterialIO,
		IEmpireMaterialIOSide,
	} from "@/features/empire/empire.types";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
	});

	const expandAll = defineModel<boolean>("expandAll", { default: false });

	// Local State
	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);
	const expandedKeys = ref<string[]>([]);
	const detailView = ref<"sides" | "net">("sides");

	/** per ticker: both sides summarized against the row's larger side */
	const summaries = computed(
		() =>
			new Map<
				string,
				{ output: IEmpireMaterialIOSide; input: IEmpireMaterialIOSide }
			>(
				props.empireMaterialIO.map((r) => {
					const scale = Math.max(r.output, r.input);
					return [
						r.ticker,
						{
							output: summarizeSide(r.outputPlanets, "output", scale),
							input: summarizeSide(r.inputPlanets, "input", scale),
						},
					];
				})
			)
	);

	/*
	 * Expand all opens every visible row, Summary calls collapseAll (also
	 * when Summary is already selected). Collapsing one row after Expand
	 * all switches back to Summary but keeps the others open.
	 */
	const openAll = () =>
		(expandedKeys.value = props.empireMaterialIO.map((r) => r.ticker));

	function collapseAll(): void {
		expandedKeys.value = [];
	}

	defineExpose({ collapseAll });

	watch(expandAll, (all) => {
		if (all) openAll();
	});

	watch(
		() => props.empireMaterialIO,
		() => {
			if (expandAll.value) openAll();
		},
		{ immediate: true }
	);

	function updateExpanded(keys: (string | number)[]): void {
		if (expandAll.value && keys.length < expandedKeys.value.length)
			expandAll.value = false;
		if (keys.length > expandedKeys.value.length)
			trackEvent("empire:material_io_expand");
		expandedKeys.value = keys.map(String);
	}

	watch(
		() => props.empireMaterialIO,
		async () =>
			await loadPlanetNames(
				Array.from(
					new Set(
						props.empireMaterialIO
							.map((e) => [
								...e.inputPlanets.map((p) => p.planetId).flat(),
								...e.outputPlanets
									.map((p) => p.planetId)
									.flat(),
							])
							.flat()
					)
				)
			),
		{ immediate: true }
	);
</script>

<template>
	<div class="flex-1 min-h-0">
		<x-n-data-table
			:data="localEmpireMaterialIO"
			:row-key="(row: IEmpireMaterialIO) => row.ticker"
			:expanded-row-keys="expandedKeys"
			striped
			flex-height
			sticky-expanded-rows
			:scroll-x="960"
			class="empire-material-io h-full"
			@update:expanded-row-keys="updateExpanded">
			<template #render-expand-icon="{ expanded, rowData }">
				<button
					type="button"
					class="inline-flex items-center justify-center size-6 rounded-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400"
					:aria-expanded="expanded"
					:aria-label="
						t('empire.material_io.expand_row', {
							ticker: rowData.ticker,
						})
					">
					<ChevronRightSharp
						class="size-4 transition-transform"
						:class="expanded ? 'rotate-90' : ''" />
				</button>
			</template>
			<x-n-data-table-column key="expand" type="expand" :width="48">
				<template #render-expand="{ rowData }">
					<EmpireMaterialIODetail
						v-model:view="detailView"
						:row="rowData"
						:planet-names="planetNames" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="ticker"
				:title="t('terms.material_ticker')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<MaterialTile
						:key="rowData.ticker"
						:ticker="rowData.ticker"
						:daily="rowData.delta" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="delta"
				align="right"
				title-align="right"
				:title="t('terms.delta')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<PValue class="text-nowrap" :value="rowData.delta" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="output"
				align="right"
				title-align="right"
				:title="t('terms.production')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="rowData.output <= 0 ? 'text-muted' : ''">
						{{ formatNumber(rowData.output) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="input"
				align="right"
				title-align="right"
				:title="t('terms.consumption')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="rowData.input <= 0 ? 'text-muted' : ''">
						{{ formatNumber(rowData.input) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="deltaPrice"
				align="right"
				title-align="right"
				:title="t('terms.delta_price')"
				sorter="default">
				<template #render-cell="{ rowData }">
					<PValue class="text-nowrap" :value="rowData.deltaPrice" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="outputPlanets"
				:min-width="200"
				:title="t('empire.material_io.produced_by')">
				<template #render-cell="{ rowData }">
					<EmpireMaterialIOSummaryCell
						:side="summaries.get(rowData.ticker)!.output"
						:planet-names="planetNames" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="inputPlanets"
				:min-width="200"
				:title="t('empire.material_io.consumed_by')">
				<template #render-cell="{ rowData }">
					<EmpireMaterialIOSummaryCell
						:side="summaries.get(rowData.ticker)!.input"
						:planet-names="planetNames" />
				</template>
			</x-n-data-table-column>
		</x-n-data-table>
	</div>
</template>

<style>
	/* the row toggle is the button inside, not naive's clickable div */
	.empire-material-io .n-data-table-expand-trigger {
		cursor: default;
		width: auto;
		height: auto;
		vertical-align: middle;
	}
</style>
