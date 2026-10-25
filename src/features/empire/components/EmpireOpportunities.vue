<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useProductionOpportunities } from "@/features/empire/useProductionOpportunities";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IEmpireMaterialIO } from "@/features/empire/empire.types";

	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

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

	const columns = computed<
		PDataTableColumn<(typeof opportunities.value)[number]>[]
	>(() => [
		{
			key: "building_recipe",
			title: t("empire.opportunities.table.building"),
			width: 75,
		},
		{
			key: "flow_inputs",
			title: t("empire.opportunities.table.flow_inputs"),
			titleColSpan: 2,
		},
		{ key: "flow_outputs" },
		{
			key: "Analysis",
			title: t("empire.opportunities.table.analysis"),
			titleAlign: "right",
		},
		{
			key: "inputSellCost",
			title: t("empire.opportunities.table.sell_inputs"),
			align: "right",
		},
		{
			key: "outputSellCost",
			title: t("empire.opportunities.table.sell_outputs"),
			align: "right",
		},
	]);
	// stable, an inline function re-renders the whole table
	const rowKey = (row: (typeof opportunities.value)[number]) =>
		row.recipe.recipe_name;
</script>

<template>
	<div
		class="@container border rounded-[3px] border-white/15 p-3 flex flex-col flex-1">
		<h1 class="text-lg font-bold">
			{{ $t("empire.opportunities.headline") }}
		</h1>
		<div class="text-muted py-3 flex flex-col gap-1.5">
			<p>
				{{ $t("empire.opportunities.intro") }}
			</p>
			<p>
				<span class="text-prunplanner">
					{{ $t("empire.opportunities.please_note") }}
				</span>
				{{ $t("empire.opportunities.note") }}
			</p>
		</div>
		<div
			class="grid grid-cols-1 @sm:grid-cols-3 gap-3 pb-3 child:gap-1 child:bg-black">
			<div
				class="flex flex-col p-3 rounded border border-white/10 child:text-xs">
				<span class="uppercase text-white/80">
					{{ $t("empire.opportunities.tiles.opportunities") }}
				</span>
				<div
					class="flex flex-row flex-wrap justify-between items-center gap-x-2 font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.fullMatch }}
					</span>
					<span class="whitespace-nowrap">
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
				<span class="uppercase text-white/80">
					{{ $t("empire.opportunities.tiles.delta_required") }}
				</span>
				<div
					class="flex flex-row flex-wrap justify-between items-center gap-x-2 font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.deltaRequired }}
					</span>
					<span class="whitespace-nowrap">
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
						class="bg-warning h-full"
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
				<span class="uppercase text-white/80">
					{{ $t("empire.opportunities.tiles.material_missing") }}
				</span>
				<div
					class="flex flex-row flex-wrap justify-between items-center gap-x-2 font-mono">
					<span class="text-2xl text-white">
						{{ opportunityStats.missingMaterial }}
					</span>
					<span class="whitespace-nowrap">
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
		<!-- a screen-high box: the intro scrolls away, then the table's
			own rows scroll under its header -->
		<div class="h-[calc(100dvh-8rem)] shrink-0">
			<!-- long titles wrap in their narrow columns -->
			<PDataTable
				v-if="!isLoading"
				:columns="columns"
				:data="opportunities"
				striped
				fill
				virtual
				:min-width="540"
				:row-key="rowKey"
				class="[&_.p-data-table-title-text]:whitespace-normal!">
				<template #cell-building_recipe="{ row }">
					<span class="text-lg font-bold text-nowrap">
						{{ row.recipe.building_ticker }}
					</span>
				</template>
				<template #cell-flow_inputs="{ row }">
					<div
						class="flex flex-row flex-wrap gap-1.5 text-nowrap">
						<div
							v-for="stat in row.inputStats"
							:key="`${row.recipe.recipe_id}#${stat.ticker}`"
							class="flex-col">
							<div
								class=""
								:class="
									stat.isMissing
										? 'opacity-30 '
										: 'opacity-100'
								">
								<MaterialTile
									:key="`${row.recipe.recipe_id}#INPUT#${stat.ticker}#TILE`"
									:ticker="stat.ticker"
									:amount="stat.requiredAmount" />
							</div>
							<div
								v-if="!stat.isMissing"
								:class="
									stat.currentDelta >= stat.requiredAmount
										? 'text-muted'
										: 'text-warning'
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
								class="text-xs mt-1 font-mono uppercase text-negative opacity-60">
								{{ t("empire.opportunities.table.missing") }}
							</div>
						</div>
					</div>
				</template>
				<template #cell-flow_outputs="{ row }">
					<div
						class="flex flex-row flex-wrap gap-1.5 text-nowrap justify-end">
						<div
							v-for="output in row.recipe.outputs"
							:key="`${row.recipe.recipe_id}#OUTPUTS#${output.material_ticker}`">
							<MaterialTile
								:key="`${row.recipe.recipe_id}#OUTPUT#${output.material_ticker}#TILE`"
								:ticker="output.material_ticker"
								:amount="output.material_amount" />
						</div>
					</div>
				</template>
				<template #cell-Analysis="{ row }">
					<div class="flex flex-col text-end">
						<span
							v-if="row.sustainedRuns > 0"
							class="text-lg">
							{{
								formatNumber(row.sustainedRuns, 2, true)
							}}
						</span>
						<span
							v-if="row.isFullMatch"
							class="text-xs text-prunplanner">
							{{
								$t(
									"empire.opportunities.table.potential_batches"
								)
							}}
						</span>
						<span
							v-else-if="
								!row.isFullMatch &&
								row.sustainedRuns > 0
							"
							class="text-xs text-warning">
							{{
								$t(
									"empire.opportunities.table.delta_required"
								)
							}}
						</span>
						<span v-else class="text-xs text-negative">
							{{
								$t(
									"empire.opportunities.table.missing_material"
								)
							}}
						</span>
					</div>
				</template>
				<template #cell-inputSellCost="{ row }">
					<div
						v-if="
							row.isFullMatch && row.sustainedRuns > 0
						"
						class="text-nowrap">
						<span
							:class="
								row.inputSellCost >=
								row.outputSellCost
									? 'text-positive'
									: 'text-negative'
							">
							{{ formatNumber(row.inputSellCost, 2) }}
							<span class="font-light text-muted"> ȼ </span>
						</span>
					</div>
					<div v-else>&mdash;</div>
				</template>
				<template #cell-outputSellCost="{ row }">
					<div
						v-if="
							row.isFullMatch && row.sustainedRuns > 0
						"
						class="text-nowrap">
						<span
							:class="
								row.inputSellCost >=
								row.outputSellCost
									? 'text-negative'
									: 'text-positive'
							">
							{{ formatNumber(row.outputSellCost, 2) }}
							<span class="font-light text-muted"> ȼ </span>
						</span>
					</div>
					<div v-else>&mdash;</div>
				</template>
			</PDataTable>
		</div>
	</div>
</template>
