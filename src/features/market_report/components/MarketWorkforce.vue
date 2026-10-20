<script setup lang="ts">
	import { computed, ref, shallowRef } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Util
	import {
		changeClass,
		formatChange,
		formatDay,
		formatMoney,
		MARKET_EXCHANGES,
		seriesChange,
		WORKFORCE_TICKERS,
		workforceDrivers,
		workforceSeries,
	} from "@/features/market_report/marketReport.util";

	// Components
	import MarketBlock from "@/features/market_report/components/MarketBlock.vue";
	import PLineChart from "@/ui/charts/PLineChart.vue";

	// Types & Interfaces
	import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
	import type { IPriceSeries } from "@/features/market_report/marketReport.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	const { tier } = defineProps<{ tier: WorkforceType }>();

	const { t } = useI18n();
	const theme = useChartTheme();

	// VWAP 7D sparks end on the last complete UTC day, like the summary
	const DAYS = 90;
	const DAY_MS = 86_400_000;
	// UNIVERSE is the ALL headline, the others one line each
	const SCOPES = ["UNIVERSE", ...MARKET_EXCHANGES];

	// the series end yesterday
	const now = new Date();
	const today = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate()
	);
	const days = Array.from(
		{ length: DAYS },
		(_, i) => today - (DAYS - i) * DAY_MS
	);

	const prices = shallowRef<Record<string, IPriceSeries> | null>(null);
	const failed = ref(false);

	async function load(): Promise<void> {
		failed.value = false;
		try {
			const results = await Promise.all(
				SCOPES.map((exchange) =>
					useQuery("GetCXSparklines", {
						exchange,
						days: DAYS,
						metric: "vwap_7d",
						tickers: WORKFORCE_TICKERS,
					}).execute()
				)
			);
			prices.value = Object.fromEntries(
				results.map((r, i) => [SCOPES[i], r.series])
			);
		} catch {
			failed.value = true;
		}
	}
	load();

	const costs = computed(() =>
		prices.value
			? Object.fromEntries(
					SCOPES.map((s) => [
						s,
						workforceSeries(prices.value![s], tier, DAYS),
					])
				)
			: null
	);

	const series = computed<ILineSeries[]>(() =>
		MARKET_EXCHANGES.map((ex) => ({
			key: ex,
			label: ex,
			color: theme.value.exchange(ex),
			values: costs.value?.[ex] ?? [],
		}))
	);

	const headline = computed(() => {
		const all = costs.value?.UNIVERSE ?? [];
		const firstIndex = all.findIndex((v) => v != null);
		const latest = MARKET_EXCHANGES.map((ex) => ({
			ex,
			cost: costs.value?.[ex].findLast((v) => v != null) ?? null,
		})).filter((e) => e.cost != null);
		const cheapest = latest.sort((a, b) => a.cost! - b.cost!)[0];
		return {
			cost: all.findLast((v) => v != null) ?? null,
			change: seriesChange(all),
			since: firstIndex < 0 ? null : days[firstIndex],
			cheapest,
		};
	});

	const drivers = computed(() =>
		prices.value ? workforceDrivers(prices.value.UNIVERSE, tier, DAYS) : []
	);
</script>

<template>
	<MarketBlock :ready="!!prices" :failed="failed" size="h-112" @retry="load">
		<div class="h-112 flex flex-col gap-3">
			<div
				class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
				<div>
					<div class="text-3xl font-bold tabular-nums">
						{{
							headline.cost == null
								? "–"
								: formatMoney(headline.cost)
						}}
					</div>
					<div class="text-xs text-muted">
						{{ t("market_report.workforce.cost") }} ·
						<span :class="changeClass(headline.change)">
							{{ formatChange(headline.change) }}
						</span>
						<template v-if="headline.since">
							<!-- the space would be dropped between the tags -->
							{{
								" " +
								t("market_report.workforce.since", {
									date: formatDay(headline.since),
								})
							}}
						</template>
					</div>
				</div>
				<div class="flex flex-col gap-1 text-sm sm:items-end">
					<div v-if="headline.cheapest">
						{{
							t("market_report.workforce.cheapest", {
								exchange: headline.cheapest.ex,
								cost: formatMoney(headline.cheapest.cost!),
							})
						}}
					</div>
					<div v-if="drivers.length" class="text-muted">
						{{ t("market_report.workforce.drivers") }}:
						<template v-for="(d, i) in drivers" :key="d.ticker">
							<span v-if="i">, </span>
							<span :class="changeClass(d.pct)">
								{{
									t("market_report.workforce.driver", {
										ticker: d.ticker,
										delta:
											(d.delta >= 0 ? "+" : "−") +
											formatMoney(Math.abs(d.delta)),
										change: formatChange(d.pct),
									})
								}}
							</span>
						</template>
					</div>
				</div>
			</div>
			<div class="flex-1 min-h-0">
				<PLineChart
					:days="days"
					:series="series"
					:label="
						t('market_report.workforce.chart_label', {
							tier: t(`game.workforce_type.${tier}`),
						})
					" />
			</div>
		</div>
	</MarketBlock>
</template>
