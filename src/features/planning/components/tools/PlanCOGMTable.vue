<script setup lang="ts">
	import type { PropType } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { humanizeTimeMs } from "@/util/date";
	import { formatNumber } from "@/util/numbers";

	import type { IProductionBuildingRecipeCOGM } from "../../usePlanCalculation.types";

	// UI
	import { PTable } from "@/ui";

	defineProps({
		data: {
			type: Object as PropType<IProductionBuildingRecipeCOGM>,
			required: true,
		},
	});
</script>

<template>
	<PTable>
		<tbody>
			<tr>
				<th colspan="4">
					{{ $t("plan.tools.cogm.table.parameters") }}
				</th>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.recipe_runtime") }}
				</td>
				<td>{{ humanizeTimeMs(data.runtime) }}</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }}
					{{ $t("plan.tools.cogm.table.percent_day") }}
				</td>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.efficiency") }}
				</td>
				<td colspan="3">{{ formatNumber(data.efficiency * 100) }} %</td>
			</tr>
			<tr>
				<th colspan="4">{{ $t("plan.tools.cogm.table.cost") }}</th>
			</tr>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.degradation") }}
				</td>
				<td class="font-bold">
					{{ formatNumber(data.degradationShare) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.degradation) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<template v-if="data.inputCost.length > 0">
				<tr>
					<td :rowspan="data.inputCost.length + 2" class="border-r">
						{{ $t("plan.tools.cogm.table.materials") }}
					</td>
					<td>{{ $t("plan.tools.cogm.table.input_total") }}</td>
					<td colspan="2" class="text-end font-bold">
						{{ formatNumber(data.inputTotal) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
				</tr>
				<tr>
					<td>{{ $t("plan.tools.cogm.table.material") }}</td>
					<td>{{ $t("plan.tools.cogm.table.cost_unit") }}</td>
					<td class="text-end">
						{{ $t("plan.tools.cogm.table.cost_total_unit") }}
					</td>
				</tr>
				<tr
					v-for="input in data.inputCost"
					:key="`INPUT#${input.ticker}`">
					<td>
						<MaterialTile
							:key="input.ticker"
							:ticker="input.ticker"
							:amount="input.amount" />
					</td>
					<td>
						{{ formatNumber(input.costUnit) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
					<td class="text-end">
						{{ formatNumber(input.costTotal) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</td>
				</tr>
			</template>
			<tr>
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.workforce") }}
				</td>
				<td class="font-bold">
					{{ formatNumber(data.workforceCost) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.workforceCostTotal) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-t-2!">
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.total_cost") }}
				</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalCost) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-b-2!">
				<td class="border-r">
					{{ $t("plan.tools.cogm.table.recipe_profit") }}
				</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalProfit) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
			<tr>
				<th colspan="4">{{ $t("plan.tools.cogm.title") }}</th>
			</tr>
			<tr>
				<td
					:rowspan="data.outputCOGM.length + 1"
					class="border-b-0! border-r">
					{{ $t("plan.tools.cogm.cogm") }}
				</td>
				<td>{{ $t("plan.tools.cogm.table.material") }}</td>
				<td>{{ $t("plan.tools.cogm.table.cost_split") }}</td>
				<td class="text-end">
					{{ $t("plan.tools.cogm.table.cost_total") }}
				</td>
			</tr>
			<tr
				v-for="output in data.outputCOGM"
				:key="`OUTPUT#${output.ticker}`">
				<td>
					<MaterialTile
						:key="output.ticker"
						:ticker="output.ticker"
						:amount="output.amount" />
				</td>
				<td>
					{{ formatNumber(output.costSplit) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
				<td class="text-end">
					{{ formatNumber(output.costTotal) }}
					<span class="pl-1 font-light text-muted"> ȼ </span>
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
