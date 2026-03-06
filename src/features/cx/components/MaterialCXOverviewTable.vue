<script setup lang="ts">
	import { PropType } from "vue";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { exchangeTypesArray } = await useExchangeData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";

	// UI
	import { PTable } from "@/ui";

	defineProps({
		ticker: {
			type: String,
			required: true,
		},
		overviewData: {
			type: Object as PropType<IMaterialExchangeOverview>,
			required: true,
		},
	});
</script>

<template>
	<PTable :key="`CX#OverviewTable#${ticker}`" striped>
		<thead>
			<tr>
				<th>{{ ticker }}</th>
				<th>AI1</th>
				<th>CI1</th>
				<th>IC1</th>
				<th>NC1</th>
				<th>UNIVERSE</th>
			</tr>
		</thead>
		<tbody class="child:child:first:font-bold">
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">VWAP</td>
			</tr>
			<tr>
				<td>7D</td>
				<td v-for="cx in exchangeTypesArray" :key="`vwap_7d#${cx}`">
					{{ formatNumber(overviewData.vwap_7d[cx], 2, true) }}
				</td>
			</tr>
			<tr>
				<td>30D</td>
				<td v-for="cx in exchangeTypesArray" :key="`vwap_30d#${cx}`">
					{{ formatNumber(overviewData.vwap_30d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">Traded Volume</td>
			</tr>
			<tr>
				<td>7D</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`sum_traded_7d#${cx}`">
					{{ formatNumber(overviewData.sum_traded_7d[cx], 2, true) }}
				</td>
			</tr>
			<tr>
				<td>30D</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`sum_traded_30d#${cx}`">
					{{ formatNumber(overviewData.sum_traded_30d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">Exchange Status</td>
			</tr>
			<tr>
				<td></td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`exchange_status#${cx}`">
					{{ overviewData.exchange_status[cx] }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
