<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import {
		changeClass,
		formatChange,
		formatMoney,
		marketMovers,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
	import type { MarketMoversDirection } from "@/features/market_report/marketReport.types";

	const { summary, direction } = defineProps<{
		summary: MarketSummary;
		direction: MarketMoversDirection;
	}>();

	const rows = computed(() => marketMovers(summary.materials, direction));
</script>

<template>
	<ol class="flex flex-col h-96">
		<li
			v-for="m in rows"
			:key="m.ticker"
			class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 h-12">
			<MarketTickerChip :ticker="m.ticker" :category="m.category" />
			<div class="min-w-0">
				<div class="truncate">{{ m.name }}</div>
				<div class="text-xs text-muted truncate tabular-nums">
					{{
						$t("market_report.movers.row", {
							price:
								m.vwap_7d == null
									? "–"
									: `${formatNumber(m.vwap_7d, m.vwap_7d < 100 ? 2 : 0)} ȼ`,
							turnover: formatMoney(m.turnover_7d),
						})
					}}
				</div>
			</div>
			<PSparkline
				class="hidden sm:block"
				:points="m.spark"
				:trend="m.change_pct ?? 0"
				:label="
					$t('market_report.movers.spark_label', { ticker: m.ticker })
				" />
			<div
				class="w-20 text-right font-bold tabular-nums"
				:class="changeClass(m.change_pct)">
				{{ formatChange(m.change_pct) }}
			</div>
		</li>
		<li v-if="!rows.length" class="text-muted py-3">
			{{ $t("market_report.movers.empty") }}
		</li>
	</ol>
</template>
