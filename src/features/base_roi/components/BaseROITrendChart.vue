<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { capitalizeString } from "@/util/text";
	import { matchesSearch } from "@/features/base_roi/baseROIMetrics";
	import {
		historyDays,
		profitHistory,
	} from "@/features/base_roi/baseROIHistory";
	import { profitTrend } from "@/features/base_roi/baseROITrend";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Static
	import { HISTORY_DAYS } from "@/features/base_roi/baseROI.constants";

	// Components
	import PLineChart from "@/ui/charts/PLineChart.vue";

	// Types & Interfaces
	import type {
		IBaseROIRow,
		IBaseROISeries,
	} from "@/features/base_roi/baseROI.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	/**
	 * Volume-weighted daily profit of the last HISTORY_DAYS days: per industry, and
	 * per building, product or recipe as the search drills in. Above the
	 * table, from the table's rows and price history.
	 */
	const { rows, search, series, historyFailed } = defineProps<{
		/** shown rows before the search */
		rows: IBaseROIRow[];
		search: string;
		series: IBaseROISeries | null;
		historyFailed: boolean;
	}>();

	const theme = useChartTheme();
	const days = historyDays(HISTORY_DAYS);

	// every row's profit per day, again only when the rows or prices change
	const profits = computed(() => {
		const map = new Map<string, number[]>();
		if (!series) return map;
		for (const row of rows)
			map.set(
				row.key,
				profitHistory(
					row.materials,
					row.degradation,
					series,
					HISTORY_DAYS
				).profit
			);
		return map;
	});

	const trend = computed(() =>
		profitTrend(
			rows.filter((r) => matchesSearch(r, search)),
			profits.value,
			search
		)
	);

	const title = computed(() =>
		t(`base_roi.trend.title_${trend.value.level}`, {
			focus:
				trend.value.level === "building"
					? capitalizeString(trend.value.focus!)
					: trend.value.focus,
		})
	);

	// the app's distinct chart hues: one per line, 7 lines at most
	const colors = computed(() => [
		...["AI1", "CI1", "IC1", "NC1"].map((c) => theme.value.exchange(c)),
		theme.value.positive,
		theme.value.warning,
		theme.value.negative,
	]);
	const chartSeries = computed<ILineSeries[]>(() =>
		trend.value.lines.map((l, i) => ({
			key: l.key,
			label:
				trend.value.level === "industry"
					? l.key
						? capitalizeString(l.key)
						: t("base_roi.trend.no_industry")
					: l.key,
			color: colors.value[i % colors.value.length],
			values: l.values,
		}))
	);
</script>

<template>
	<section
		v-if="!historyFailed"
		class="flex flex-col gap-1"
		aria-labelledby="base-roi-trend-title"
		data-base-roi-trend>
		<h2 id="base-roi-trend-title" class="text-sm font-bold">
			{{ title }}
		</h2>
		<div
			v-if="!series"
			aria-busy="true"
			data-skeleton
			class="h-80 rounded bg-white/5 motion-safe:animate-pulse" />
		<p
			v-else-if="!chartSeries.length"
			class="h-80 flex items-center justify-center text-muted">
			{{ t("base_roi.trend.empty") }}
		</p>
		<div v-else class="h-80">
			<PLineChart :days="days" :series="chartSeries" :label="title" />
		</div>
		<p class="text-xs text-muted">
			{{ t("base_roi.trend.note") }}
			<!-- a span, not a template: no text at a fragment's edge (page translation) -->
			<span v-if="trend.more">
				· {{ t("base_roi.trend.more", { n: trend.more }) }}
			</span>
		</p>
	</section>
</template>
