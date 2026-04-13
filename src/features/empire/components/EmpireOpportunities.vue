<script setup lang="ts">
	import { computed, PropType } from "vue";
	import { IEmpireMaterialIO } from "../empire.types";

	import { useProductionOpportunities } from "../useProductionOpportunities";
	import { formatNumber } from "@/util/numbers";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
	});

	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);

	const { isLoading, opportunities } = useProductionOpportunities(
		localEmpireMaterialIO
	);
</script>

<template>
	<div class="border rounded-[3px] border-white/15 p-3 h-dvh">
		<h1 class="text-lg font-bold">Production Opportunities</h1>
		<div class="text-white/60 py-3">
			Review and utilize your empire surplus. This view identifies recipes
			where your Material I/O shows a positive flow (delta), allowing you
			to convert excess materials into higher-tier products. Recipes are
			prioritized by input availability. Items with a Shortfall highlight
			exactly which material is currently bottlenecking the opportunity.
		</div>
		<XNDataTable
			v-if="!isLoading"
			:data="opportunities"
			striped
			virtual-scroll
			flex-height
			class="h-full"
			:row-key="(row) => row.recipe.recipe_name">
			<XNDataTableColumn
				key="building_recipe"
				title="Building / Recipe"
				width="200">
				<template #render-cell="{ rowData }">
					<div class="flex flex-col max-w-[200px]">
						<span class="text-lg font-bold">
							{{ rowData.recipe.building_ticker }}
						</span>
						<span class="text-xs text-white/50">
							{{ rowData.recipe.recipe_name }}
						</span>
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn
				key="flow"
				title="Production Flow (Inputs &rarr; Outputs)">
				<template #render-cell="{ rowData }">
					<div class="flex flex-row justify-between">
						<div class="flex flex-row flex-wrap gap-1.5">
							<div
								v-for="stat in rowData.inputStats"
								:key="`${rowData.recipe.recipe_id}#${stat.ticker}`"
								class="flex flex-col">
								<div
									:class="
										stat.isMissing
											? 'opacity-30 '
											: 'opacity-100'
									">
									<MaterialTile
										:key="`${rowData.recipe.recipe_id}#INPUT#${stat.ticker}#TILE`"
										:ticker="stat.ticker"
										:amount="stat.requiredAmount" />
								</div>
								<span
									v-if="!stat.isMissing"
									:class="
										stat.currentDelta >= stat.requiredAmount
											? 'text-white/50'
											: 'text-orange-400'
									"
									class="text-xs mt-1 font-mono">
									{{
										formatNumber(
											stat.currentDelta,
											2,
											true
										)
									}}x
								</span>
								<span
									v-else
									class="text-xs mt-1 font-mono text-red-500 opacity-60">
									MISSING
								</span>
							</div>
						</div>
						<div class="flex flex-row flex-wrap gap-1.5">
							<span
								v-for="output in rowData.recipe.outputs"
								:key="`${rowData.recipe.recipe_id}#OUTPUTS#${output.material_ticker}`">
								<MaterialTile
									:key="`${rowData.recipe.recipe_id}#OUTPUT#${output.material_ticker}#TILE`"
									:ticker="output.material_ticker"
									:amount="output.material_amount" />
							</span>
						</div>
					</div>
				</template>
			</XNDataTableColumn>

			<XNDataTableColumn
				key="match_ratio"
				title="Availability"
				:title-col-span="2"
				:width="100">
				<template #render-cell="{ rowData }">
					<div
						class="w-full h-1.5 bg-gray-800 rounded-full flex gap-0.5 overflow-hidden">
						<div
							class="bg-positive h-full flex-shrink-0 transition-all duration-500"
							:style="{
								width: rowData.inputMatchRatio * 100 + '%',
							}"></div>

						<div
							class="bg-negative h-full flex-shrink-0 transition-all duration-500"
							:style="{
								width:
									100 - rowData.inputMatchRatio * 100 + '%',
							}"></div>
					</div>
					<div class="text-end text-xs text-white/50 mt-1">
						{{
							formatNumber(rowData.inputMatchRatio * 100, 2, true)
						}}
						%
					</div>
				</template>
			</XNDataTableColumn>
			<XNDataTableColumn key="analysis" width="150">
				<template #render-cell="{ rowData }">
					<div class="flex flex-col text-end">
						<span v-if="rowData.sustainedRuns > 0" class="text-lg">
							{{ formatNumber(rowData.sustainedRuns, 2, true) }}
						</span>
						<span
							v-if="rowData.isFullMatch"
							class="text-xs text-white/50 text-nowrap">
							Potential Batches
						</span>
						<span
							v-else-if="
								!rowData.isFullMatch &&
								rowData.sustainedRuns > 0
							"
							class="text-xs text-orange-400 text-nowrap">
							Delta Required
						</span>
						<span v-else class="text-xs text-negative text-nowrap">
							Missing Material
						</span>
					</div>
				</template>
			</XNDataTableColumn>
		</XNDataTable>
	</div>
</template>
