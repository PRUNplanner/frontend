<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMarketExploration } from "@/features/market_exploration/useMarketExploration";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Components
	import PLineChart from "@/ui/charts/PLineChart.vue";

	// Util
	import {
		cheapestExchange,
		exchangeLines,
	} from "@/features/market_exploration/marketExploration.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";
	import type { ExchangeMetric } from "@/features/market_exploration/marketExploration.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	// UI
	import { PSpin } from "@/ui";

	// the material tile's market history: one line per exchange over the
	// last 30 days, the cheapest exchange by its latest VWAP below
	const { materialTicker, metric } = defineProps<{
		materialTicker: string;
		metric: ExchangeMetric;
	}>();

	const { t } = useI18n();
	const theme = useChartTheme();
	const { getMaterialExplorationData } = useMarketExploration();

	const EXCHANGES = ["AI1", "CI1", "IC1", "NC1"];
	const RANGE_DAYS = 30;

	const data = ref<Record<string, Exploration[]> | null>(null);
	const failed = ref(false);

	onMounted(async () => {
		try {
			data.value = await getMaterialExplorationData(materialTicker);
		} catch {
			failed.value = true;
		}
	});

	const lines = computed(() =>
		data.value ? exchangeLines(data.value, metric, RANGE_DAYS) : null
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

	// by VWAP whatever the chart shows
	const cheapest = computed(() =>
		data.value
			? cheapestExchange(
					exchangeLines(data.value, "vwap", RANGE_DAYS).values
				)
			: null
	);
</script>

<template>
	<div>
		<div
			v-if="!data && !failed"
			class="h-75 flex items-center justify-center">
			<PSpin size="lg" />
		</div>
		<div
			v-else-if="!lines || !hasValues"
			class="h-75 flex items-center justify-center text-muted">
			{{
				t(
					failed
						? "material_tile.chart.error"
						: "material_tile.chart.empty"
				)
			}}
		</div>
		<div v-else class="h-75">
			<PLineChart
				:days="lines.days"
				:series="series"
				:label="
					t('material_tile.chart.label', {
						metric: t(`material_tile.chart.metric.${metric}`),
						ticker: materialTicker,
					})
				" />
		</div>
		<div
			class="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between">
			<div v-if="cheapest" class="material-chart-cheapest">
				{{ t("material_tile.chart.cheapest") }}
				<span class="font-bold">
					{{ cheapest.code }}
					{{
						formatNumber(
							cheapest.value,
							cheapest.value >= 100 ? 0 : 2
						)
					}}
				</span>
			</div>
			<router-link
				:to="{
					name: 'market-exploration',
					query: { material: materialTicker },
				}"
				class="ml-auto inline-flex items-center min-h-11 text-link-primary hover:underline">
				{{ t("material_tile.chart.open_exploration") }}
			</router-link>
		</div>
	</div>
</template>
