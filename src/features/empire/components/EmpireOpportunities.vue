<script setup lang="ts">
	import { computed, PropType } from "vue";

	// Composables
	import { useProductionOpportunities } from "@/features/empire/useProductionOpportunities";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

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
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const localEmpireMaterialIO = computed(() => props.empireMaterialIO);
	const localCxUuid = computed(() => props.cxUuid);

	const { isLoading, opportunities, opportunityStats } =
		useProductionOpportunities(localEmpireMaterialIO, localCxUuid);
</script>

<template>
	<div
		class="border rounded-[3px] border-white/15 p-3 flex flex-col flex-1 min-h-0">
		<h1 class="text-lg font-bold">Production Opportunities</h1>
		<div class="text-white/60 py-3 flex flex-col gap-1.5">
			<p>
				Find recipe opportunities to convert excess materials into other
				products. This view identifies production opportunities where
				your Material I/O shows a positive delta, prioritized by input
				availability
			</p>
			<p>
				<span class="text-prunplanner">Please Note:</span> Do not rely
				on the available opportunity alone. Cross-reference trade
				volumes and exchange overviews (via hover on the material) to
				assess market liquidity and potential ROI. Use indicators to
				identify which specific material is bottlenecking your scaling
				potential or if selling your available delta is more profitable
				than moving to another production.
			</p>
		</div>
		<div
			class="grid grid-cols-1 xl:grid-cols-3 gap-3 pb-3 child:gap-1 child:bg-black">
			<div
				class="flex flex-col p-3 rounded border border-white/10 child:text-xs">
				<span class="uppercase text-white/80"> Opportunities </span>
				<div
					class="flex flex-row justify-between items-center font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.fullMatch }}
					</span>
					<span>
						{{
							formatNumber(
								(opportunityStats.fullMatch /
									opportunityStats.total) *
									100,
								2,
								false
							)
						}}
						%
					</span>
				</div>
				<div
					class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
					<div
						class="bg-prunplanner h-full"
						:style="{
							width: `${
								(opportunityStats.fullMatch /
									opportunityStats.total) *
								100
							}%`,
						}"></div>
				</div>
			</div>
			<div
				class="flex flex-col p-3 rounded border border-white/10 child:text-xs">
				<span class="uppercase text-white/80"> Delta Required </span>
				<div
					class="flex flex-row justify-between items-center font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.deltaRequired }}
					</span>
					<span>
						{{
							formatNumber(
								(opportunityStats.deltaRequired /
									opportunityStats.total) *
									100,
								2,
								false
							)
						}}
						%
					</span>
				</div>
				<div
					class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
					<div
						class="bg-orange-400 h-full"
						:style="{
							width: `${
								(opportunityStats.deltaRequired /
									opportunityStats.total) *
								100
							}%`,
						}"></div>
				</div>
			</div>
			<div
				class="flex flex-col p-3 rounded border border-white/10 child:text-xs">
				<span class="uppercase text-white/80"> Material Missing </span>
				<div
					class="flex flex-row justify-between items-center font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.missingMaterial }}
					</span>
					<span>
						{{
							formatNumber(
								(opportunityStats.missingMaterial /
									opportunityStats.total) *
									100,
								2,
								false
							)
						}}
						%
					</span>
				</div>
				<div
					class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
					<div
						class="bg-negative h-full"
						:style="{
							width: `${
								(opportunityStats.missingMaterial /
									opportunityStats.total) *
								100
							}%`,
						}"></div>
				</div>
			</div>
		</div>
		<div class="flex-1">
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
					title="Building"
					width="75">
					<template #render-cell="{ rowData }">
						<span class="text-lg font-bold text-nowrap">
							{{ rowData.recipe.building_ticker }}
						</span>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="flow_inputs"
					title="Production (Inputs &rarr; Outputs)"
					:title-col-span="2">
					<template #render-cell="{ rowData }">
						<div
							class="flex flex-row flex-wrap gap-1.5 text-nowrap">
							<div
								v-for="stat in rowData.inputStats"
								:key="`${rowData.recipe.recipe_id}#${stat.ticker}`"
								class="flex-col">
								<div
									class=""
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
								<div
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
								</div>
								<div
									v-else
									class="text-xs mt-1 font-mono text-red-500 opacity-60">
									MISSING
								</div>
							</div>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn key="flow_outputs">
					<template #render-cell="{ rowData }">
						<div
							class="flex flex-row flex-wrap gap-1.5 text-nowrap justify-end">
							<div
								v-for="output in rowData.recipe.outputs"
								:key="`${rowData.recipe.recipe_id}#OUTPUTS#${output.material_ticker}`">
								<MaterialTile
									:key="`${rowData.recipe.recipe_id}#OUTPUT#${output.material_ticker}#TILE`"
									:ticker="output.material_ticker"
									:amount="output.material_amount" />
							</div>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="Analysis"
					title="Analysis"
					title-align="right">
					<template #render-cell="{ rowData }">
						<div class="flex flex-col text-end">
							<span
								v-if="rowData.sustainedRuns > 0"
								class="text-lg">
								{{
									formatNumber(rowData.sustainedRuns, 2, true)
								}}
							</span>
							<span
								v-if="rowData.isFullMatch"
								class="text-xs text-prunplanner">
								Potential Batches
							</span>
							<span
								v-else-if="
									!rowData.isFullMatch &&
									rowData.sustainedRuns > 0
								"
								class="text-xs text-orange-400">
								Delta Required
							</span>
							<span v-else class="text-xs text-negative">
								Missing Material
							</span>
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="inputSellCost"
					title="Sell Inputs"
					title-align="right"
					align="right">
					<template #render-cell="{ rowData }">
						<div
							v-if="
								rowData.isFullMatch && rowData.sustainedRuns > 0
							"
							class="text-nowrap">
							<span
								:class="
									rowData.inputSellCost >=
									rowData.outputSellCost
										? 'text-positive'
										: 'text-negative'
								">
								{{ formatNumber(rowData.inputSellCost, 2) }}
								<span class="font-light text-white/50">
									ȼ
								</span>
							</span>
						</div>
						<div v-else>&mdash;</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="outputSellCost"
					title="Sell Outputs"
					title-align="right"
					align="right">
					<template #render-cell="{ rowData }">
						<div
							v-if="
								rowData.isFullMatch && rowData.sustainedRuns > 0
							"
							class="text-nowrap">
							<span
								:class="
									rowData.inputSellCost >=
									rowData.outputSellCost
										? 'text-negative'
										: 'text-positive'
								">
								{{ formatNumber(rowData.outputSellCost, 2) }}
								<span class="font-light text-white/50">
									ȼ
								</span>
							</span>
						</div>
						<div v-else>&mdash;</div>
					</template>
				</XNDataTableColumn>
			</XNDataTable>
		</div>
	</div>
</template>
