<script setup lang="ts">
	import { PropType } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { humanizeTimeMs } from "@/util/date";
	import { formatNumber } from "@/util/numbers";

	import { IProductionBuildingRecipeCOGM } from "../../usePlanCalculation.types";

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
				<th colspan="4">Parameters</th>
			</tr>
			<tr>
				<td class="border-r">Recipe Runtime</td>
				<td>{{ humanizeTimeMs(data.runtime) }}</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % / day
				</td>
			</tr>
			<tr>
				<td class="border-r">Efficiency</td>
				<td colspan="3">{{ formatNumber(data.efficiency * 100) }} %</td>
			</tr>
			<tr>
				<th colspan="4">Cost</th>
			</tr>
			<tr>
				<td class="border-r">Degradation</td>
				<td class="font-bold">
					{{ formatNumber(data.degradationShare) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.degradation) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
			</tr>
			<template v-if="data.inputCost.length > 0">
				<tr>
					<td :rowspan="data.inputCost.length + 2" class="border-r">
						Materials
					</td>
					<td>Input Total</td>
					<td colspan="2" class="text-end font-bold">
						{{ formatNumber(data.inputTotal) }}
						<span class="pl-1 font-light text-white/50"> ȼ </span>
					</td>
				</tr>
				<tr>
					<td>Material</td>
					<td>ȼ / Unit</td>
					<td class="text-end">ȼ Total</td>
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
						<span class="pl-1 font-light text-white/50"> ȼ </span>
					</td>
					<td class="text-end">
						{{ formatNumber(input.costTotal) }}
						<span class="pl-1 font-light text-white/50"> ȼ </span>
					</td>
				</tr>
			</template>
			<tr>
				<td class="border-r">Workforce</td>
				<td class="font-bold">
					{{ formatNumber(data.workforceCost) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
				<td colspan="2" class="text-end">
					{{ formatNumber(data.runtimeShare * 100) }} % /
					{{ formatNumber(data.workforceCostTotal) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-t-2!">
				<td class="border-r">Total Cost</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalCost) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
			</tr>
			<tr class="child:border-b-2!">
				<td class="border-r">Recipe Profit</td>
				<td colspan="3" class="font-bold">
					{{ formatNumber(data.totalProfit) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
			</tr>
			<tr>
				<th colspan="4">Cost of Goods Manufactured</th>
			</tr>
			<tr>
				<td
					:rowspan="data.outputCOGM.length + 1"
					class="border-b-0! border-r">
					COGM
				</td>
				<td>Material</td>
				<td>Cost Split</td>
				<td class="text-end">Cost Total</td>
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
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
				<td class="text-end">
					{{ formatNumber(output.costTotal) }}
					<span class="pl-1 font-light text-white/50"> ȼ </span>
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
