<script setup lang="ts">
	import { PropType, computed, watch } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IEmpireMaterialIO } from "@/features/empire/empire.types";

	// UI
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
	});

	// Local State
	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);

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
	<div class="h-dvh flex-1">
		<x-n-data-table :data="localEmpireMaterialIO" striped>
			<x-n-data-table-column key="ticker" title="Ticker" sorter="default">
				<template #render-cell="{ rowData }">
					<MaterialTile
						:key="rowData.ticker"
						:ticker="rowData.ticker" />
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column key="delta" title="Delta" sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="
							rowData.delta >= 0
								? 'text-positive'
								: 'text-negative'
						">
						{{ formatNumber(rowData.delta) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="output"
				title="Production"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="rowData.output <= 0 ? 'text-white/50' : ''">
						{{ formatNumber(rowData.output) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="input"
				title="Consumption"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span :class="rowData.input <= 0 ? 'text-white/50' : ''">
						{{ formatNumber(rowData.input) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="deltaPrice"
				title="ȼ Delta"
				sorter="default">
				<template #render-cell="{ rowData }">
					<span
						class="text-nowrap"
						:class="
							rowData.deltaPrice >= 0
								? 'text-positive'
								: 'text-negative'
						">
						{{ formatNumber(rowData.deltaPrice) }}
					</span>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="outputPlanets"
				title="Production Planets">
				<template #render-cell="{ rowData }">
					<div
						v-for="p in rowData.outputPlanets"
						:key="`${rowData.ticker}#output#${p.planUuid}`">
						<router-link
							:to="`/plan/${p.planetId}/${p.planUuid}`"
							class="hover:underline">
							{{ planetNames[p.planetId] || "Loading" }}:
							<strong>
								{{ formatNumber(p.output) }}
							</strong>
						</router-link>
					</div>
				</template>
			</x-n-data-table-column>
			<x-n-data-table-column
				key="inputPlanets"
				title="Consumption Planets">
				<template #render-cell="{ rowData }">
					<div
						v-for="p in rowData.inputPlanets"
						:key="`${rowData.ticker}#input#${p.planUuid}`">
						<router-link
							:to="`/plan/${p.planetId}/${p.planUuid}`"
							class="hover:underline">
							{{ planetNames[p.planetId] || "Loading" }}:
							<strong>
								{{ formatNumber(p.input) }}
							</strong>
						</router-link>
					</div>
				</template>
			</x-n-data-table-column>
		</x-n-data-table>
	</div>
</template>
