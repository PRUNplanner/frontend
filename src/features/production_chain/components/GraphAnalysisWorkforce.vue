<script setup lang="ts">
	import type { PropType } from "vue";

	// Util
	import { formatAmount } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";

	// Types & Interfaces
	import type { IGraphFlowWorkforceAnalysis } from "@/features/production_chain/productionGraph.types";
	import { WORKFORCECOLORS } from "@/features/production_chain/components/ChainNode.types";

	// UI
	import { PTable } from "@/ui";

	defineProps({
		workforceAnalysis: {
			type: Array as PropType<IGraphFlowWorkforceAnalysis>,
			required: true,
		},
	});
</script>

<template>
	<h3 class="font-bold py-3">
		{{ $t("production_chains.analysis_workforce.title") }}
	</h3>
	<PTable striped>
		<thead>
			<tr>
				<th>
					{{
						$t(
							"production_chains.analysis_workforce.table.workforce"
						)
					}}
				</th>
				<th class="text-end!">
					{{
						$t(
							"production_chains.analysis_workforce.table.required"
						)
					}}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="workforce in workforceAnalysis"
				:key="workforce.workforce">
				<td>
					<span
						class="py-1 px-2"
						:style="`background-color: ${
							WORKFORCECOLORS[workforce.workforce]
						};`">
						{{ capitalizeString(workforce.workforce) }}
					</span>
				</td>
				<td class="text-end">
					{{ formatAmount(workforce.value) }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
