<script setup lang="ts">
	import { watch, PropType } from "vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetNames, loadPlanetNames } = usePlanetData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IEmpirePlanListData } from "@/features/empire/empire.types";
	import { PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";

	// UI
	import {
		XNDataTable,
		XNDataTableColumn,
		XNDataTableSummaryRow,
		XNDataTableSummaryCell,
	} from "@skit/x.naive-ui";

	const props = defineProps({
		planListData: {
			type: Array as PropType<IEmpirePlanListData[]>,
			required: true,
		},
	});

	watch(
		() => props.planListData,
		() => loadPlanetNames(props.planListData.map((p) => p.planet)),
		{ immediate: true }
	);
</script>

<template>
	<XNDataTable :data="planListData" striped>
		<XNDataTableColumn key="name" title="Plan" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-wrap">
					<router-link
						:to="`/plan/${rowData.planet}/${rowData.uuid}`"
						class="text-link-primary font-bold hover:underline">
						{{ rowData.name }}
					</router-link>
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="planet" title="Planet" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="test-wrap">
					{{ planetNames[rowData.planet] || "Loading..." }}
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="cogc" title="COGC" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap">
					{{ cogcTextMapping[rowData.cogc as PLAN_COGCPROGRAM_TYPE] }}
				</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="permits" title="Permits" sorter="default">
			<template #title>
				<div class="text-nowrap">#</div>
			</template>
			<template #render-cell="{ rowData }">
				<div class="text-center">{{ rowData.permits }}</div>
			</template>
		</XNDataTableColumn>
		<XNDataTableColumn key="profit" title="Profit" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="text-nowrap text-end">
					<span
						:class="
							rowData.profit >= 0
								? 'text-positive'
								: 'text-negative'
						">
						{{ formatNumber(rowData.profit) }}
					</span>
					<span class="pl-1 font-light text-white/50">$</span>
				</div>
			</template>
		</XNDataTableColumn>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">No Plans in Empire.</div>
				<div class="text-center">
					Assign existing plans in
					<router-link
						to="/manage"
						class="text-link-primary hover:underline">
						Management
					</router-link>
					or use
					<router-link
						to="/search"
						class="text-link-primary hover:underline">
						Planet Search
					</router-link>
					to create one.
				</div>
			</div>
		</template>
		<template #summary>
			<XNDataTableSummaryRow>
				<XNDataTableSummaryCell key="name" :col-span="5">
					<template #default>
						<strong class="text-white/80">
							Total permits planned:
							{{
								planListData.reduce(
									(sum, elem) => sum + elem.permits,
									0
								)
							}}
						</strong>
					</template>
				</XNDataTableSummaryCell>
			</XNDataTableSummaryRow>
		</template>
	</XNDataTable>
</template>
