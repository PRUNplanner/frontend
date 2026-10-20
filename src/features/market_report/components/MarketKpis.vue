<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import {
		changeClass,
		formatChange,
		formatDay,
		formatMoney,
		marketKpis,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const kpis = computed(() => marketKpis(summary));
</script>

<template>
	<dl class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="kpi">
			<dt class="text-muted">
				{{ $t("market_report.kpi.turnover_7d") }}
			</dt>
			<dd class="text-2xl font-bold tabular-nums">
				{{ formatMoney(kpis.turnover7d) }}
			</dd>
			<dd class="text-xs text-muted">
				<span :class="changeClass(kpis.turnover7dChange)">
					{{ formatChange(kpis.turnover7dChange) }}
				</span>
				{{ $t("market_report.kpi.turnover_7d_hint") }}
			</dd>
		</div>
		<div class="kpi">
			<dt class="text-muted">{{ $t("market_report.kpi.traded_7d") }}</dt>
			<dd class="text-2xl font-bold tabular-nums">
				{{ formatNumber(kpis.traded7d, 0) }}
			</dd>
			<dd class="text-xs text-muted">
				{{
					$t("market_report.kpi.traded_7d_hint", {
						total: formatNumber(kpis.traded30d, 0),
					})
				}}
			</dd>
		</div>
		<div class="kpi">
			<dt class="text-muted">{{ $t("market_report.kpi.index") }}</dt>
			<dd class="text-2xl font-bold tabular-nums">
				{{ kpis.index == null ? "–" : formatNumber(kpis.index, 1) }}
			</dd>
			<dd class="text-xs text-muted">
				<span :class="changeClass(kpis.indexChange)">
					{{ formatChange(kpis.indexChange) }}
				</span>
				{{
					$t("market_report.kpi.index_hint", {
						date: formatDay(summary.index.base),
					})
				}}
			</dd>
		</div>
		<div class="kpi">
			<dt class="text-muted">{{ $t("market_report.kpi.flat") }}</dt>
			<dd class="text-2xl font-bold tabular-nums">
				{{ formatNumber(kpis.flatShare, 0) }} %
			</dd>
			<dd class="text-xs text-muted">
				{{
					$t("market_report.kpi.flat_hint", {
						count: kpis.flatCount,
					})
				}}
			</dd>
		</div>
	</dl>
</template>

<style scoped>
	@reference "../../../assets/css/style.css";

	.kpi {
		@apply flex flex-col gap-1 p-3 h-28 rounded-panel border border-line;
	}
</style>
