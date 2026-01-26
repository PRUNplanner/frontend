<script setup lang="ts">
	import { PropType, computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import {
		IAreaResult,
		IOverviewData,
		IVisitationData,
	} from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PTable } from "@/ui";

	const props = defineProps({
		visitationData: {
			type: Object as PropType<IVisitationData>,
			required: true,
		},
		overviewData: {
			type: Object as PropType<IOverviewData>,
			required: true,
		},
		areaData: {
			type: Object as PropType<IAreaResult>,
			required: true,
		},
	});

	const profitPerArea = computed(() => {
		return props.areaData.areaUsed > 0
			? props.overviewData.profit / props.areaData.areaUsed
			: 0;
	});
</script>

<template>
	<div class="flex flex-row flex-wrap gap-6 child:shrink-0">
		<div>
			<slot name="heading" text="Overview"></slot>
			<PTable striped>
				<tbody
					class="child:child:first:font-bold child:child:last:text-end">
					<!-- empty row to make the background colors match the other tables-->
					<tr />
					<tr>
						<td>Daily Cost</td>
						<td>
							{{ formatNumber(overviewData.dailyCost) }}
							<span class="font-light text-white/50"> $ </span>
						</td>
					</tr>
					<tr>
						<td>Degradation</td>
						<td>
							{{
								formatNumber(overviewData.dailyDegradationCost)
							}}
							<span class="font-light text-white/50"> $ </span>
						</td>
					</tr>
					<tr>
						<td>Plan Cost</td>
						<td>
							{{
								formatNumber(overviewData.totalConstructionCost)
							}}
							<span class="font-light text-white/50"> $ </span>
						</td>
					</tr>
					<tr>
						<td>Daily Profit</td>
						<td
							:class="
								overviewData.profit >= 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatNumber(overviewData.profit) }}
							<span class="font-light text-white/50"> $ </span>
						</td>
					</tr>
					<tr>
						<td>ROI</td>
						<td
							:class="
								overviewData.roi > 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatNumber(overviewData.roi) }}
							<span class="font-light text-white/50"> d </span>
						</td>
					</tr>
					<tr>
						<td>Profit / Area</td>
						<td
							:class="
								profitPerArea >= 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatNumber(profitPerArea) }}
							<span class="font-light text-white/50"> $ </span>
						</td>
					</tr>
				</tbody>
			</PTable>
		</div>
		<div>
			<slot name="heading" text="Storage"></slot>
			<PTable striped>
				<thead class="child:text-center">
					<tr>
						<th />
						<th class="text-center!">t</th>
						<th class="text-center!">m³</th>
					</tr>
				</thead>
				<tbody class="child:child:text-center">
					<tr>
						<td class="text-left! font-bold">Import</td>
						<td>
							{{ formatNumber(visitationData.dailyWeightImport) }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyVolumeImport) }}
						</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">Export</td>
						<td>
							{{ formatNumber(visitationData.dailyWeightExport) }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyVolumeExport) }}
						</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">&#8721;</td>
						<td>{{ formatNumber(visitationData.dailyWeight) }}</td>
						<td>{{ formatNumber(visitationData.dailyVolume) }}</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">Filled</td>
						<td colspan="2" class="font-bold">
							{{ formatNumber(visitationData.storageFilled) }}
							<span class="font-light text-white/50"> d </span>
						</td>
					</tr>
				</tbody>
			</PTable>
		</div>
	</div>
</template>
