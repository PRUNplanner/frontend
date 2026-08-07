<script setup lang="ts">
	import { PropType } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTable } from "@/ui";

	// Types & Interfaces
	import { IRaukkOutputRow } from "@/features/raukk_sourcing/raukkSourcingUi.types";

	defineProps({
		rows: {
			type: Array as PropType<IRaukkOutputRow[]>,
			required: true,
		},
	});
</script>

<template>
	<PTable striped>
		<thead>
			<tr>
				<th>{{ $t("raukk_sourcing.outputs.ticker") }}</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.units_per_day") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.true_cost") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.workforce") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.repair") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.inputs") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.shipping") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.market_price") }}
				</th>
				<th class="text-right!">
					{{ $t("raukk_sourcing.outputs.margin") }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in rows" :key="`RAUKKOUTPUT#${row.ticker}`">
				<td>
					<MaterialTile
						:key="`RAUKKSOURCINGOUT#Material#${row.ticker}`"
						:ticker="row.ticker" />
				</td>
				<td class="text-right">{{ formatNumber(row.unitsPerDay) }}</td>
				<td class="text-right font-bold">
					{{ formatNumber(row.costPerUnit) }}
				</td>
				<td class="text-right text-white/60">
					{{ formatNumber(row.breakdown.workforce) }}
				</td>
				<td class="text-right text-white/60">
					{{ formatNumber(row.breakdown.repair) }}
				</td>
				<td class="text-right text-white/60">
					{{ formatNumber(row.breakdown.inputs) }}
				</td>
				<td class="text-right text-white/60">
					{{ formatNumber(row.breakdown.shipping) }}
				</td>
				<td class="text-right">{{ formatNumber(row.marketPrice) }}</td>
				<td
					class="text-right font-bold"
					:class="
						row.marginPerUnit >= 0 ? 'text-positive' : 'text-negative'
					">
					{{ formatNumber(row.marginPerUnit) }}
				</td>
			</tr>
			<tr v-if="rows.length === 0">
				<td colspan="9" class="text-center text-white/50">
					{{ $t("raukk_sourcing.outputs.empty") }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
