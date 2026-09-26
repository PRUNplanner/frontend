<script setup lang="ts">
	import { computed, PropType } from "vue";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { exchangeTypesArray, exchangeGameTypesArray } =
		await useExchangeData();
	const { getMaterialClass } = useMaterialData();

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import {
		IMaterialExchangeOverview,
		IMaterialExchangeVWAPAnalysis,
	} from "@/database/services/useExchangeData.types";

	// UI
	import { PTable, PIcon } from "@/ui";
	import {
		KeyboardArrowUpSharp,
		KeyboardDoubleArrowUpSharp,
		KeyboardArrowDownSharp,
		KeyboardDoubleArrowDownSharp,
		CircleOutlined,
	} from "@vicons/material";

	const props = defineProps({
		ticker: {
			type: String,
			required: true,
		},
		daily: {
			type: Number,
			required: false,
		},
		overviewData: {
			type: Object as PropType<IMaterialExchangeOverview>,
			required: true,
		},
	});

	const tradedRows = [
		{ label: "terms.7d", days: 7, volumeKey: "sum_traded_7d" },
		{ label: "terms.30d", days: 30, volumeKey: "sum_traded_30d" },
	] as const;

	const tradedRowsData = computed(() =>
		tradedRows.map((row) => {
			const daily = Math.abs((props.daily ?? 0) * row.days);

			return {
				...row,
				daily,
				marketShare: Object.fromEntries(
					exchangeTypesArray.map((cx) => [
						cx,
						props.overviewData[row.volumeKey][cx] > 0
							? (daily / props.overviewData[row.volumeKey][cx]) *
								100
							: 0,
					])
				),
			};
		})
	);

	const getTrendIcon = (analysis: IMaterialExchangeVWAPAnalysis) => {
		const { significance, percentChange } = analysis;
		const isPositive = percentChange > 0;

		// Handle Stable case first
		if (significance === "STABLE") return CircleOutlined;

		// Handle Highly Significant (Double Arrows)
		if (significance === "HIGHLY-SIGNIFICANT") {
			return isPositive
				? KeyboardDoubleArrowUpSharp
				: KeyboardDoubleArrowDownSharp;
		}

		// Handle Significant (Single Arrows)
		if (significance === "SIGNIFICANT") {
			return isPositive ? KeyboardArrowUpSharp : KeyboardArrowDownSharp;
		}

		// Fallback
		return CircleOutlined;
	};
</script>

<template>
	<PTable :key="`CX#OverviewTable#${ticker}`" striped class="bg-black">
		<thead>
			<tr>
				<th :class="getMaterialClass(ticker)">
					{{ ticker }}
				</th>
				<th>AI1</th>
				<th>CI1</th>
				<th>IC1</th>
				<th>NC1</th>
				<th>{{ $t("cx_info_table.universe") }}</th>
			</tr>
		</thead>
		<tbody class="child:child:first:font-bold child:child:px-2!">
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">{{ $t("cx_info_table.vwap") }}</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.7d") }}</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`vwap_7d#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData.vwap_7d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.30d") }}</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`vwap_30d#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData.vwap_30d[cx], 2, true) }}
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.trend") }}</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`vwap_7d#${cx}`"
					class="font-mono">
					<div class="flex flex-row items-center gap-x-1">
						<PIcon :size="18">
							<component
								:is="
									getTrendIcon(overviewData.vwap_analysis[cx])
								"
								:class="
									overviewData.vwap_analysis[cx]
										.significance === 'STABLE'
										? 'text-white/50'
										: overviewData.vwap_analysis[cx]
													.percentChange > 0
											? 'text-positive'
											: 'text-negative'
								" />
						</PIcon>
						<div
							:class="
								overviewData.vwap_analysis[cx].significance ===
								'STABLE'
									? 'text-white/50'
									: overviewData.vwap_analysis[cx]
												.percentChange > 0
										? 'text-positive'
										: 'text-negative'
							">
							{{
								formatNumber(
									overviewData.vwap_analysis[cx]
										.percentChange * 100,
									2,
									true
								)
							}}
							%
						</div>
					</div>
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">{{ $t("cx_info_table.traded_volume") }}</td>
			</tr>
			<tr
				v-for="row in tradedRowsData"
				:key="row.volumeKey"
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>
					{{ $t(row.label) }}
					<div v-if="daily" class="text-white/50 font-mono">
						{{ formatNumber(row.daily, 2, true) }}
					</div>
				</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`${row.volumeKey}#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData[row.volumeKey][cx], 2, true) }}
					<div
						v-if="daily"
						:class="
							row.marketShare[cx] >= 5 // red at 5% market share
								? 'text-negative'
							: 'text-white/50'
						">
						{{
							row.marketShare[cx]
								? `${formatNumber(row.marketShare[cx])}%`
								: "—"
						}}
					</div>
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">
					{{ $t("cx_info_table.market_live_data") }}
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.ask") }}</td>
				<td
					v-for="cx in exchangeGameTypesArray"
					:key="`ask#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData.ask[cx], 2, true) }}
				</td>
				<td>&mdash;</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.bid") }}</td>
				<td
					v-for="cx in exchangeGameTypesArray"
					:key="`bid#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData.bid[cx], 2, true) }}
				</td>
				<td>&mdash;</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.spread") }}</td>
				<td
					v-for="cx in exchangeGameTypesArray"
					:key="`spread#${cx}`"
					class="font-mono">
					{{ formatNumber(overviewData.spread[cx], 2, true) }}
				</td>
				<td>&mdash;</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray border-t-2 border-dark-gray">
				<td>{{ $t("cx_info_table.supply_vs_demand") }}</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`supply_demand#${cx}`"
					class="font-mono">
					<div>
						{{ formatNumber(overviewData.supply[cx], 0, true) }}
					</div>
					<div>
						{{ formatNumber(overviewData.demand[cx], 0, true) }}
					</div>
				</td>
			</tr>
			<tr
				class="[&>td:nth-child(6)]:border-l-2 [&>td:nth-child(6)]:border-dark-gray">
				<td>{{ $t("terms.delta") }}</td>
				<td
					v-for="cx in exchangeTypesArray"
					:key="`delta_supply_demand#${cx}`"
					class="font-mono"
					:class="
						overviewData.delta_supply_demand[cx] > 0
							? 'text-negative'
							: 'text-positive'
					">
					{{
						formatNumber(
							overviewData.delta_supply_demand[cx],
							2,
							true,
							true
						)
					}}
				</td>
			</tr>
			<tr
				class="border-b-2 border-t-2 border-dark-gray child:bg-dark-gray/50">
				<td colspan="6">{{ $t("cx_info_table.insights") }}</td>
			</tr>
			<tr v-if="overviewData.systemic_health" class="">
				<td colspan="6" class="border-t border-b border-dark-gray">
					<div class="flex flex-col gap-y-2">
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div class="flex flex-col">
								<span
									class="text-[10px] text-white/50 uppercase">
									{{ $t("cx_info_table.market_breadth") }}
								</span>
								<span class="text-lg font-mono"
									>{{
										formatNumber(
											overviewData.systemic_health
												.diffusionIndex,
											0
										)
									}}%</span
								>
								<div
									class="w-full bg-gray-800 h-1 mt-1 overflow-hidden">
									<div
										class="bg-prunplanner h-full transition-all"
										:style="{
											width: `${overviewData.systemic_health.diffusionIndex}%`,
										}"></div>
								</div>
							</div>

							<div class="flex flex-col">
								<span
									class="text-[10px] text-white/50 uppercase">
									{{ $t("cx_info_table.liquidity_ratio") }}
								</span>
								<span
									class="text-lg font-mono"
									:class="
										overviewData.systemic_health
											.liquidityRatio < 1
											? 'text-negative'
											: 'text-positive'
									">
									{{
										formatNumber(
											overviewData.systemic_health
												.liquidityRatio,
											2
										)
									}}
								</span>
								<span
									class="text-[10px] text-white/50 font-normal">
									{{ $t("cx_info_table.demand_vs_supply") }}
								</span>
							</div>

							<div class="flex flex-col">
								<span
									class="text-[10px] text-white/50 uppercase">
									{{ $t("cx_info_table.weighted_trend") }}
								</span>
								<span
									class="text-lg font-mono"
									:class="
										overviewData.systemic_health
											.weightedTrend > 0
											? 'text-positive'
											: 'text-negative'
									">
									{{
										formatNumber(
											overviewData.systemic_health
												.weightedTrend * 100,
											2,
											false,
											true
										)
									}}%
								</span>
								<span
									class="text-[10px] text-white/50 font-normal">
									{{
										$t(
											"cx_info_table.volume_adjusted_delta"
										)
									}}
								</span>
							</div>

							<div class="flex flex-col">
								<span
									class="text-[10px] text-white/50 uppercase">
									{{ $t("cx_info_table.price_cohesion") }}
								</span>
								<span
									class="text-lg font-mono"
									:class="
										overviewData.systemic_health
											.priceCohesion > 5
											? 'text-negative'
											: 'text-positive'
									">
									{{
										formatNumber(
											overviewData.systemic_health
												.priceCohesion,
											2
										)
									}}%
								</span>
								<span
									class="text-[10px] text-white/50 font-normal">
									{{ $t("cx_info_table.variance_index") }}
								</span>
							</div>
						</div>
					</div>
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
