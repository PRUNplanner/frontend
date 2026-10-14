<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMarketExploration } from "@/features/market_exploration/useMarketExploration";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Components
	import PLineChart from "@/ui/charts/PLineChart.vue";

	// Util
	import { exchangeLines } from "@/features/market_exploration/marketExploration.util";

	// Types & Interfaces
	import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
	import type {
		ExchangeMetric,
		ExchangeRange,
	} from "@/features/market_exploration/marketExploration.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	// UI
	import { PSpin } from "@/ui";

	// one line per exchange for a material, from the 4 cached CXPC queries
	const { materialTicker, metric, range } = defineProps<{
		materialTicker: string;
		metric: ExchangeMetric;
		range: ExchangeRange;
	}>();

	const { t } = useI18n();
	const theme = useChartTheme();
	const { getMaterialExplorationData } = useMarketExploration();

	const EXCHANGES = ["AI1", "CI1", "IC1", "NC1"];

	const data = ref<Record<string, Exploration[]> | null>(null);
	const failed = ref(false);

	watch(
		() => materialTicker,
		async (ticker) => {
			data.value = null;
			failed.value = false;
			try {
				const result = await getMaterialExplorationData(ticker);
				// a newer material may have been picked meanwhile
				if (ticker === materialTicker) data.value = result;
			} catch {
				if (ticker === materialTicker) failed.value = true;
			}
		},
		{ immediate: true }
	);

	const lines = computed(() =>
		data.value ? exchangeLines(data.value, metric, range) : null
	);
	const series = computed((): ILineSeries[] =>
		EXCHANGES.map((code) => ({
			key: code,
			label: code,
			color: theme.value.exchange(code),
			values: lines.value?.values[code] ?? [],
		}))
	);
	const hasValues = computed(() =>
		series.value.some((s) => s.values.some((v) => v !== null))
	);
</script>

<template>
	<div class="h-full w-full">
		<div
			v-if="!data && !failed"
			class="h-full flex items-center justify-center">
			<PSpin size="lg" />
		</div>
		<div
			v-else-if="!lines || !hasValues"
			class="h-full flex items-center justify-center text-muted">
			{{
				t(
					failed
						? "market_exploration.chart.exchanges.error"
						: "market_exploration.chart.exchanges.empty"
				)
			}}
		</div>
		<PLineChart
			v-else
			:days="lines.days"
			:series="series"
			:volume="lines.volume"
			:label="
				t('market_exploration.chart.exchanges.label', {
					metric: t(`market_exploration.chart.metric.${metric}`),
					ticker: materialTicker,
				})
			"
			:volume-title="t('market_exploration.chart.exchanges.volume_title')"
			:volume-unit="t('market_exploration.chart.exchanges.volume_unit')"
			:volume-label="t('market_exploration.chart.exchanges.volume')" />
	</div>
</template>
