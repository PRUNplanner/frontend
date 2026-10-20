<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import {
		MARKET_EXCHANGES,
		SECTOR_COLORS,
		summaryDays,
	} from "@/features/market_report/marketReport.util";

	// Components
	import PLineChart from "@/ui/charts/PLineChart.vue";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
	import type { MarketIndexView } from "@/features/market_report/marketReport.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	const { summary, view } = defineProps<{
		summary: MarketSummary;
		view: MarketIndexView;
	}>();

	const { t } = useI18n();
	const theme = useChartTheme();

	const days = computed(() => summaryDays(summary));

	// 1 line combined, 4 per exchange, 8 per sector
	const series = computed<ILineSeries[]>(() => {
		const index = summary.index;
		if (view === "exchange")
			return MARKET_EXCHANGES.map((ex) => ({
				key: ex,
				label: ex,
				color: theme.value.exchange(ex),
				values: index.per_exchange[ex] ?? [],
			}));
		if (view === "sector")
			return summary.sectors.map((s, i) => ({
				key: s.key,
				label: t(`market_report.sector.${s.key}`),
				color: SECTOR_COLORS[i % SECTOR_COLORS.length],
				values: index.per_sector[s.key] ?? [],
			}));
		return [
			{
				key: "combined",
				label: t("market_report.index.all"),
				color: theme.value.ink,
				values: index.combined,
			},
		];
	});
</script>

<template>
	<div class="h-80" data-index-chart>
		<PLineChart
			:days="days"
			:series="series"
			:label="
				t('market_report.index.chart_label', {
					view: t(`market_report.index.view.${view}`),
				})
			" />
	</div>
</template>
