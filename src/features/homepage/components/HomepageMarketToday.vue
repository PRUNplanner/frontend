<script setup lang="ts">
	import { computed, ref, shallowRef } from "vue";
	import { RouterLink } from "vue-router";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMarketReport } from "@/features/market_report/useMarketReport";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Components
	import HomepageMarketSkeleton from "@/features/homepage/components/HomepageMarketSkeleton.vue";
	import HomepageMarketSectorsHeader from "@/features/homepage/components/HomepageMarketSectorsHeader.vue";
	import MarketMovers from "@/features/market_report/components/MarketMovers.vue";
	import PLineChart from "@/ui/charts/PLineChart.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";

	// Util
	import {
		changeClass,
		formatChange,
		formatDay,
		formatMoney,
		indexChanges,
		marketLead,
		sectorCards,
		summaryDays,
		WORKFORCE_TICKERS,
	} from "@/features/market_report/marketReport.util";
	import {
		landingCard,
		landingGrid4,
		marketCard,
		marketGrid,
		marketLead as marketLeadBox,
		marketSector,
	} from "@/features/homepage/homepage.constants";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IPriceSeries,
		MarketMoversDirection,
	} from "@/features/market_report/marketReport.types";
	import type { ILineSeries } from "@/ui/charts/charts.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	// "Market today" on the landing page: mounted once the section comes
	// near, from the same queries as /market, which then loads nothing again
	const { t } = useI18n();
	const theme = useChartTheme();
	const { summary, failed } = useMarketReport();

	// the pioneer cost of the lead: the request of the report's workforce
	// chart (MarketWorkforce), all exchanges
	const prices = shallowRef<IPriceSeries | null>(null);
	useQuery("GetCXSparklines", {
		exchange: "UNIVERSE",
		days: 90,
		metric: "vwap_7d",
		tickers: WORKFORCE_TICKERS,
	})
		.execute()
		.then((r) => {
			prices.value = r.series;
		})
		// the lead leaves the pioneer cost out
		.catch(() => {});

	const DIRECTIONS: MarketMoversDirection[] = ["rising", "falling"];
	const direction = ref<MarketMoversDirection>("rising");

	function setDirection(view: MarketMoversDirection): void {
		direction.value = view;
		trackEvent("landing:market_view_change", { view });
	}
	function opened(target: "sector" | "mover"): void {
		trackEvent("landing:market_click", { target });
	}

	const lead = computed<string>(() => {
		if (!summary.value) return "";
		const l = marketLead(summary.value, prices.value);
		return [
			l.change != null &&
				t("homepage.market.lead.index", {
					change: formatChange(l.change),
					change30: formatChange(l.change30),
					start: formatDay(l.start),
				}),
			l.sector &&
				t("homepage.market.lead.sector", {
					sector: t(`market_report.sector.${l.sector}`),
					change: formatChange(l.sectorChange),
				}),
			l.pioneerCost != null &&
				l.pioneerStart != null &&
				t("homepage.market.lead.pioneer", {
					cost: formatMoney(l.pioneerCost),
					change: formatChange(l.pioneerChange),
					start: formatDay(l.pioneerStart),
				}),
			t("homepage.market.lead.source"),
		]
			.filter((s): s is string => !!s)
			.join(" ");
	});

	const level = computed<string>(() => {
		const last = summary.value?.index.combined.findLast((v) => v != null);
		return last == null ? "–" : formatNumber(last, 1);
	});

	const chips = computed(() => {
		const c = indexChanges(summary.value?.index.combined ?? []);
		return [
			{ days: 7, value: c.d7 },
			{ days: 30, value: c.d30 },
			{ days: 90, value: c.d90 },
		];
	});

	const series = computed<ILineSeries[]>(() => [
		{
			key: "combined",
			label: t("market_report.index.all"),
			color: theme.value.positive,
			values: summary.value?.index.combined ?? [],
		},
	]);

	const sectors = computed(() => {
		const cards = summary.value ? sectorCards(summary.value) : [];
		const most = Math.max(0, ...cards.map((c) => c.share));
		return cards.map((c) => ({
			...c,
			name: t(`market_report.sector.${c.key}`),
			bar: `${most ? Math.max(2, (c.share / most) * 100) : 0}%`,
		}));
	});
</script>

<template>
	<HomepageMarketSkeleton v-if="!summary && !failed" />
	<div v-else-if="summary" class="flex flex-col gap-9" data-market-today>
		<p :class="marketLeadBox" class="text-white/78" data-market-lead>
			{{ lead }}
		</p>

		<div :class="marketGrid">
			<article
				:class="[landingCard, marketCard]"
				class="p-6 sm:p-7 flex flex-col gap-3.5 min-w-0 overflow-hidden">
				<div class="flex flex-wrap justify-between items-start gap-3">
					<div class="flex flex-col gap-2">
						<h3 class="m-0 text-sm font-normal text-white/62">
							{{ t("homepage.market.index.label") }}
						</h3>
						<div
							class="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
							<div
								class="text-[44px] leading-none font-black tracking-[-0.02em] tabular-nums text-white"
								data-market-index>
								{{ level }}
							</div>
							<div class="flex flex-wrap gap-2">
								<span
									v-for="c in chips"
									:key="c.days"
									class="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-[#030707] font-mono text-[13px]">
									<span class="text-white/62">
										{{
											t("homepage.market.index.chip", {
												days: c.days,
											})
										}}
									</span>
									<b :class="changeClass(c.value)">
										{{ formatChange(c.value) }}
									</b>
								</span>
							</div>
						</div>
					</div>
					<p class="m-0 max-w-[250px] text-[13px] text-white/62">
						{{
							t("homepage.market.index.caption", {
								members: summary.index.members.ALL ?? 0,
								start: formatDay(summary.index.base),
							})
						}}
						<br />
						<span class="font-mono">
							{{
								t("homepage.market.source", {
									date: formatDay(summary.as_of),
								})
							}}
						</span>
					</p>
				</div>
				<div class="flex-1 min-h-0">
					<PLineChart
						:days="summaryDays(summary)"
						:series="series"
						area
						:label="t('homepage.market.index.chart_label')" />
				</div>
			</article>

			<article
				:class="[landingCard, marketCard]"
				class="p-6 sm:p-7 flex flex-col gap-3 min-w-0 overflow-hidden">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h3 class="m-0 text-[20px] font-bold text-white">
						{{ t("homepage.market.movers.title") }}
					</h3>
					<PButtonGroup
						role="group"
						:aria-label="t('market_report.movers.direction_label')">
						<PButton
							v-for="d in DIRECTIONS"
							:key="d"
							size="sm"
							:pressed="direction === d"
							@click="setDirection(d)">
							{{ t(`market_report.movers.${d}`) }}
						</PButton>
					</PButtonGroup>
				</div>
				<MarketMovers
					:summary="summary"
					:direction="direction"
					:count="5"
					link
					@open="opened('mover')" />
				<p class="m-0 mt-auto text-xs text-white/62">
					{{ t("homepage.market.movers.caption") }}
				</p>
			</article>
		</div>

		<div class="flex flex-col gap-3">
			<HomepageMarketSectorsHeader />
			<div :class="landingGrid4" class="rounded-2xl">
				<RouterLink
					v-for="s in sectors"
					:key="s.key"
					to="/market"
					:aria-label="
						t('homepage.market.sectors.label', {
							sector: s.name,
							change: formatChange(s.change),
						})
					"
					:class="marketSector"
					class="bg-[#0a1010] hover:bg-[#111a1a] px-4.5 py-4 flex flex-col gap-2 min-w-0 transition-colors"
					data-market-sector
					@click="opened('sector')">
					<span class="flex items-baseline justify-between gap-2">
						<span
							class="truncate text-[14.5px] font-medium text-white">
							{{ s.name }}
						</span>
						<span
							class="font-mono text-[15px] font-bold"
							:class="changeClass(s.change)">
							{{ formatChange(s.change) }}
						</span>
					</span>
					<PSparkline
						:points="s.values"
						:trend="s.change ?? 0"
						:label="
							t('homepage.market.sectors.spark_label', {
								sector: s.name,
							})
						" />
					<span
						class="flex flex-wrap justify-between gap-x-2 text-xs text-white/62 tabular-nums">
						<span>
							{{
								t("homepage.market.sectors.change30", {
									change: formatChange(s.change30),
								})
							}}
						</span>
						<span>
							{{
								t("homepage.market.sectors.share", {
									share: formatNumber(s.share, 0),
								})
							}}
						</span>
					</span>
					<span class="mt-auto h-1 rounded-full bg-white/10">
						<span
							class="block h-full rounded-full bg-prunplanner"
							:style="{ width: s.bar }" />
					</span>
				</RouterLink>
			</div>
		</div>
	</div>
</template>
