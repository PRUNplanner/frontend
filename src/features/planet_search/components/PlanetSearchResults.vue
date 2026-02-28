<script setup lang="ts">
	import { computed, ComputedRef, PropType } from "vue";

	// Composables
	import { usePlanetSearchResults } from "@/features/planet_search/usePlanetSearchResults";
	import { usePathfinder } from "@/features/pathfinding/usePathfinder";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanetPOPRButton from "@/features/government/components/PlanetPOPRButton.vue";

	// Types & Interfaces
	import { IPlanet } from "@/features/api/gameData.types";
	import { IPlanetSearchResult } from "../usePlanetSearchResults.types";

	// UI
	import { PButton, PTooltip } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { PlusSharp } from "@vicons/material";

	const props = defineProps({
		results: {
			type: Array as PropType<IPlanet[]>,
			required: true,
		},
		searchMaterials: {
			type: Array as PropType<string[]>,
			required: true,
		},
		searchMaterialRichness: {
			type: Object as PropType<Record<string, number>>,
			required: false,
			default: () => ({}),
		},
		searchSystem: {
			type: String,
			required: false,
			default: undefined,
		},
		searchSystemDistance: {
			type: Number,
			required: false,
			default: undefined,
		},
	});

	const { getSystemName } = usePathfinder();

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

	// Table Data - computed to always reflect current props
	const tableSearchMaterials: ComputedRef<string[]> = computed(
		() => props.searchMaterials
	);

	const tableResults: ComputedRef<IPlanetSearchResult[]> = computed(() => {
		if (props.results.length === 0) return [];
		return usePlanetSearchResults(
			props.results,
			props.searchMaterials,
			props.searchMaterialRichness,
			props.searchSystem,
			props.searchSystemDistance
		).results.value;
	});

	const tableCheckDistances: ComputedRef<string | null> = computed(() =>
		props.searchSystem ? getSystemName(props.searchSystem) : null
	);
</script>

<template>
	<XNDataTable :data="tableResults" striped :pagination="{ pageSize: 50 }">
		<XNDataTableColumn key="Plan" title="Plan" width="50">
			<template #render-cell="{ rowData }">
				<router-link :to="`/plan/${rowData.planetId}`">
					<PButton size="sm">
						<template #icon>
							<PlusSharp />
						</template>
					</PButton>
				</router-link>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="planetName" title="Planet" sorter="default">
			<template #render-cell="{ rowData }">
				<span
					v-if="rowData.planetName === rowData.planetId"
					class="font-bold!">
					{{ rowData.planetId }}
				</span>
				<span v-else class="font-bold!">
					{{ rowData.planetName }} ({{ rowData.planetId }})
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="fertility" title="Fertility" sorter="default">
			<template #render-cell="{ rowData }">
				<span v-if="rowData.fertility === 0">&mdash;</span>
				<span v-else>
					{{ formatNumber(rowData.fertility * 100) }} %
				</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-for="sm in tableSearchMaterials"
			:key="`Search#${sm}`"
			:title="sm"
			:sorter="{
				compare: (row1, row2) =>
					// @ts-expect-error naive-ui row typing
					row1.searchResources[sm].dailyExtraction -
					// @ts-expect-error naive-ui row typing
					row2.searchResources[sm].dailyExtraction,
				multiple: 1,
			}">
			<template #render-cell="{ rowData }">
				<div class="child:text-nowrap">
					<MaterialTile
						:key="rowData.searchResources[sm].ticker"
						:ticker="rowData.searchResources[sm].ticker"
						:amount="rowData.searchResources[sm].dailyExtraction"
						:max="rowData.searchResources[sm].maxExtraction" />
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="additionalResources" title="Resources">
			<template #render-cell="{ rowData }">
				<div class="flex flex-row flex-wrap gap-1 child:text-nowrap">
					<MaterialTile
						v-for="am in rowData.additionalResources"
						:key="am.ticker"
						:ticker="am.ticker"
						:amount="am.dailyExtraction"
						:max="am.maxExtraction" />
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="popr" title="POPR">
			<template #render-cell="{ rowData }">
				<PlanetPOPRButton
					:planet-natural-id="rowData.planetId"
					button-size="sm" />
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="cogcProgram"
			title="COGC Program"
			sorter="default">
			<template #render-cell="{ rowData }">
				{{
					capitalizeString(rowData.cogcProgram)
						.replace("Advertising ", "")
						.replace("Workforce ", "")
				}}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="environment" title="Environment">
			<template #render-cell="{ rowData }">
				<div class="flex flex-row flex-wrap gap-1">
					<PTooltip v-if="rowData.environmentSurface.length !== 0">
						<template #trigger>
							<div>
								<MaterialTile
									:key="rowData.environmentSurface[0]"
									:ticker="rowData.environmentSurface[0]" />
							</div>
						</template>
						Surface
					</PTooltip>
					<PTooltip v-if="rowData.environmentGravity.length !== 0">
						<template #trigger>
							<div>
								<MaterialTile
									:key="rowData.environmentGravity[0]"
									:ticker="rowData.environmentGravity[0]" />
							</div>
						</template>
						Gravity
					</PTooltip>
					<PTooltip
						v-if="rowData.environmentTemperature.length !== 0">
						<template #trigger>
							<div>
								<MaterialTile
									:key="rowData.environmentTemperature[0]"
									:ticker="
										rowData.environmentTemperature[0]
									" />
							</div>
						</template>
						Temperature
					</PTooltip>
					<PTooltip v-if="rowData.environmentPressure.length !== 0">
						<template #trigger>
							<div>
								<MaterialTile
									:key="rowData.environmentPressure[0]"
									:ticker="rowData.environmentPressure[0]" />
							</div>
						</template>
						Pressure
					</PTooltip>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="infrastructures" title="Infrastructure">
			<template #render-cell="{ rowData }">
				{{ rowData.infrastructures.join(", ") }}
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			v-if="tableCheckDistances !== null"
			key="checkDistance"
			:title="`Distance ${tableCheckDistances}`"
			sorter="default" />
		<XNDataTableColumn
			key="distanceAI1"
			title="AI1"
			:sorter="distanceSorter('distanceAI1')">
			<template #render-cell="{ rowData }">
				<PTooltip v-if="rowData.distanceAI1 == -1">
					<template #trigger> ∞ </template>
					Colony Ship Required
				</PTooltip>
				<span v-else>{{ rowData.distanceAI1 }}</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="distanceCI1"
			title="CI1"
			:sorter="distanceSorter('distanceCI1')">
			<template #render-cell="{ rowData }">
				<PTooltip v-if="rowData.distanceCI1 == -1">
					<template #trigger> ∞ </template>
					Colony Ship Required
				</PTooltip>
				<span v-else>{{ rowData.distanceCI1 }}</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="distanceIC1"
			title="IC1"
			:sorter="distanceSorter('distanceIC1')">
			<template #render-cell="{ rowData }">
				<PTooltip v-if="rowData.distanceIC1 == -1">
					<template #trigger> ∞ </template>
					Colony Ship Required
				</PTooltip>
				<span v-else>{{ rowData.distanceIC1 }}</span>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn
			key="distanceNC1"
			title="NC1"
			:sorter="distanceSorter('distanceNC1')">
			<template #render-cell="{ rowData }">
				<PTooltip v-if="rowData.distanceNC1 == -1">
					<template #trigger> ∞ </template>
					Colony Ship Required
				</PTooltip>
				<span v-else>{{ rowData.distanceNC1 }}</span>
			</template>
		</XNDataTableColumn>
	</XNDataTable>
</template>
