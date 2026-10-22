<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";

	// Composables
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { useMarketList } from "@/features/market_report/useMarketList";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		formatMoney,
		MARKET_EXCHANGES,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";
	import { formatMaterialName } from "@/util/text";

	// Components
	import MarketShowAll from "@/features/market_report/components/MarketShowAll.vue";
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";
	import PStackedBar from "@/ui/charts/PStackedBar.vue";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const theme = useChartTheme();
	const { t } = useI18n();

	const TOP = 10;

	const total = computed(() =>
		summary.materials.reduce((a, m) => a + m.turnover_30d, 0)
	);
	// every material by 30-day turnover, the bars scaled to the first
	const all = computed(() => {
		const sorted = [...summary.materials].sort(
			(a, b) => b.turnover_30d - a.turnover_30d
		);
		const max = sorted[0]?.turnover_30d || 1;
		return sorted.map((m, i) => ({
			rank: i + 1,
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

	const list = useMarketList(() => all.value, TOP);
	const { page } = list;

	function toggle(): void {
		list.toggle();
		trackEvent("market:view_change", {
			chart: "leaders",
			view: list.expanded.value ? "all" : "top",
		});
	}
</script>

<template>
	<div class="flex flex-col gap-3">
		<ol class="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
			<li
				v-for="r in list.visible.value"
				:key="r.m.ticker"
				class="grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 h-12">
				<span class="text-xs text-muted text-right tabular-nums">
					{{ r.rank }}
				</span>
				<MarketTickerChip
					:ticker="r.m.ticker"
					:category="r.m.category" />
				<div class="min-w-0 flex flex-col gap-1">
					<div class="truncate">
						{{ formatMaterialName(r.m.name, r.m.ticker) }}
					</div>
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
		<MarketShowAll
			v-model:page="page"
			:total="list.total.value"
			:top="TOP"
			:offset="list.offset.value"
			:shown="list.visible.value.length"
			:page-count="list.pageCount.value"
			:expanded="list.expanded.value"
			:show-all="
				t('market_report.list.show_all.materials', {
					count: list.total.value,
				})
			"
			:pages-label="t('market_report.leaders.pages_label')"
			@toggle="toggle" />
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
