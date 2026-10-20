<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Util
	import {
		formatMoney,
		MARKET_EXCHANGES,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";
	import PStackedBar from "@/ui/charts/PStackedBar.vue";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const theme = useChartTheme();

	const total = computed(() =>
		summary.materials.reduce((a, m) => a + m.turnover_30d, 0)
	);
	const rows = computed(() => {
		const top = [...summary.materials]
			.sort((a, b) => b.turnover_30d - a.turnover_30d)
			.slice(0, 10);
		const max = top[0]?.turnover_30d || 1;
		return top.map((m) => ({
			m,
			width: (m.turnover_30d / max) * 100,
			share: total.value ? (m.turnover_30d / total.value) * 100 : 0,
			segments: MARKET_EXCHANGES.map((ex) => ({
				key: ex,
				value: m.turnover_7d_by_exchange[ex] ?? 0,
				color: theme.value.exchange(ex),
			})),
		}));
	});
</script>

<template>
	<div class="flex flex-col gap-3">
		<ol class="flex flex-col h-120">
			<li
				v-for="r in rows"
				:key="r.m.ticker"
				class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 h-12">
				<MarketTickerChip
					:ticker="r.m.ticker"
					:category="r.m.category" />
				<div class="min-w-0 flex flex-col gap-1">
					<div class="truncate">{{ r.m.name }}</div>
					<div :style="{ width: `${r.width}%` }">
						<PStackedBar
							:segments="r.segments"
							:label="
								$t('market_report.leaders.split_label', {
									ticker: r.m.ticker,
								})
							">
							<div
								v-for="s in r.segments"
								:key="s.key"
								class="flex justify-between gap-3 tabular-nums">
								<span>{{ s.key }}</span>
								{{ formatMoney(s.value) }}
							</div>
						</PStackedBar>
					</div>
				</div>
				<div class="text-right tabular-nums">
					<div class="font-bold">
						{{ formatMoney(r.m.turnover_30d) }}
					</div>
					<div class="text-xs text-muted">
						{{
							$t("market_report.leaders.share", {
								share: `${formatNumber(r.share, 1)} %`,
							})
						}}
					</div>
				</div>
			</li>
		</ol>
		<div class="flex flex-wrap gap-3 text-xs text-muted" aria-hidden="true">
			<span
				v-for="ex in MARKET_EXCHANGES"
				:key="ex"
				class="flex items-center gap-1">
				<span
					class="size-2.5 rounded-sm"
					:style="{ background: theme.exchange(ex) }" />
				{{ ex }}
			</span>
		</div>
	</div>
</template>
