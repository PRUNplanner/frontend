<script setup lang="ts">
	import { PropType } from "vue";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { exchangeTypesArray, exchangeGameTypesArray } =
		await useExchangeData();

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
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>7D</td>
				<td v-for="cx in exchangeTypesArray" :key="`vwap_7d#${cx}`">
					{{ formatNumber(overviewData.vwap_7d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>30D</td>
				<td v-for="cx in exchangeTypesArray" :key="`vwap_30d#${cx}`">
					{{ formatNumber(overviewData.vwap_30d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">Traded Volume</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>7D</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`sum_traded_7d#${cx}`">
					{{ formatNumber(overviewData.sum_traded_7d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>30D</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`sum_traded_30d#${cx}`">
					{{ formatNumber(overviewData.sum_traded_30d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">Live Data</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>Ask</td>
				<td v-for="cx in exchangeGameTypesArray" :key="`ask#${cx}`">
					{{ formatNumber(overviewData.ask[cx], 2, true) }}
				</td>
				<td />
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>Bid</td>
				<td v-for="cx in exchangeGameTypesArray" :key="`bid#${cx}`">
					{{ formatNumber(overviewData.bid[cx], 2, true) }}
				</td>
				<td />
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray border-t-2 border-dark-gray">
				<td>Supply</td>
				<td v-for="cx in exchangeGameTypesArray" :key="`supply#${cx}`">
					{{ formatNumber(overviewData.supply[cx], 2, true) }}
				</td>
				<td />
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>Demand</td>
				<td v-for="cx in exchangeGameTypesArray" :key="`demand#${cx}`">
					{{ formatNumber(overviewData.demand[cx], 2, true) }}
				</td>
				<td />
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">Exchange Status</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
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
