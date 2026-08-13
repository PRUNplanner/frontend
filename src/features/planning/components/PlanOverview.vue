<script setup lang="ts">
	import { PropType, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

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
			<slot
				name="heading"
				:text="t('plan.components.overview.label')"></slot>
			<PTable striped>
				<tbody
					class="child:child:first:font-bold child:child:last:text-end">
					<!-- empty row to make the background colors match the other tables-->
					<tr />
					<tr>
						<td>
							{{
								$t("plan.components.overview.table.daily_cost")
							}}
						</td>
						<td>
							{{ formatNumber(overviewData.dailyCost) }}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
					<tr>
						<td>
							{{
								$t("plan.components.overview.table.degradation")
							}}
						</td>
						<td>
							{{
								formatNumber(overviewData.dailyDegradationCost)
							}}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
					<tr>
						<td>
							{{
								$t(
									"plan.components.overview.table.production_fees"
								)
							}}
						</td>
						<td>
							{{
								formatNumber(
									overviewData.dailyProductionFeeCost
								)
							}}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
					<tr>
						<td>
							{{ $t("plan.components.overview.table.plan_cost") }}
						</td>
						<td>
							{{
								formatNumber(overviewData.totalConstructionCost)
							}}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
					<tr>
						<td>
							{{
								$t(
									"plan.components.overview.table.daily_profit"
								)
							}}
						</td>
						<td
							:class="
								overviewData.profit >= 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatNumber(overviewData.profit) }}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
					<tr>
						<td>{{ $t("plan.components.overview.table.roi") }}</td>
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
						<td>
							{{
								$t("plan.components.overview.table.profit_area")
							}}
						</td>
						<td
							:class="
								profitPerArea >= 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatNumber(profitPerArea) }}
							<span class="font-light text-white/50"> ȼ </span>
						</td>
					</tr>
				</tbody>
			</PTable>
		</div>
		<div>
			<slot
				name="heading"
				:text="t('plan.components.storage.label')"></slot>
			<PTable striped>
				<thead class="child:text-center">
					<tr>
						<th />
						<th class="text-center!">
							{{ $t("plan.components.storage.table.weight") }}
						</th>
						<th class="text-center!">
							{{ $t("plan.components.storage.table.volume") }}
						</th>
					</tr>
				</thead>
				<tbody class="child:child:text-center">
					<tr>
						<td class="text-left! font-bold">
							{{ $t("plan.components.storage.table.import") }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyWeightImport) }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyVolumeImport) }}
						</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{ $t("plan.components.storage.table.export") }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyWeightExport) }}
						</td>
						<td>
							{{ formatNumber(visitationData.dailyVolumeExport) }}
						</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{ $t("plan.components.storage.table.sum") }}
						</td>
						<td>{{ formatNumber(visitationData.dailyWeight) }}</td>
						<td>{{ formatNumber(visitationData.dailyVolume) }}</td>
					</tr>
					<tr>
						<td class="text-left! font-bold">
							{{ $t("plan.components.storage.table.filled") }}
						</td>
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
