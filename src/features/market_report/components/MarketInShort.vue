<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		changeSign,
		exchangeGaps,
		formatBookPrice,
		formatChange,
		formatDate,
		formatMoney,
		GAP_MIN_PCT,
		marketBrief,
	} from "@/features/market_report/marketReport.util";
	import { sparklineLayout } from "@/ui/charts/charts.util";
	import { formatNumber } from "@/util/numbers";
	import { formatMaterialName } from "@/util/text";

	// Components
	import MarketExchangePill from "@/features/market_report/components/MarketExchangePill.vue";
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";

	// Types & Interfaces
	import type { Exchange } from "@/features/api/schemas/gameData.schemas";
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const {
		summary,
		books,
		booksFailed = false,
	} = defineProps<{
		summary: MarketSummary;
		/** null while the order books load */
		books: Exchange[] | null;
		booksFailed?: boolean;
	}>();
	const { t } = useI18n();

	const W = 240;
	const H = 36;

	// tinted pill and line colour of a change
	function tone(pct: number | null) {
		const sign = changeSign(pct);
		return sign > 0
			? {
					pill: "text-positive bg-positive/14",
					color: "--color-positive",
				}
			: sign < 0
				? {
						pill: "text-negative bg-negative/14",
						color: "--color-negative",
					}
				: { pill: "text-muted bg-white/5", color: "--color-muted" };
	}

	function spark(values: (number | null)[]) {
		return sparklineLayout(values, W, H).lines.map((line) => {
			const xs = line.split(" ").map((p) => p.split(",")[0]);
			return {
				line,
				area: `${line} ${xs[xs.length - 1]},${H} ${xs[0]},${H}`,
			};
		});
	}

	const tiles = computed(() => {
		const b = marketBrief(summary);
		const since = t("market_report.in_short.since", {
			date: formatDate(summary.index.base),
		});
		return [
			{
				key: "index",
				label: t("market_report.in_short.index"),
				value: b.index == null ? "–" : formatNumber(b.index, 1),
				change: b.indexChange,
				note: since,
				spark: spark(summary.index.combined),
			},
			{
				key: "sector",
				label: t("market_report.in_short.sector"),
				value: b.sector ? t(`market_report.sector.${b.sector}`) : "–",
				change: b.sectorChange,
				note: since,
				spark: spark(
					b.sector ? (summary.index.per_sector[b.sector] ?? []) : []
				),
			},
			{
				key: "pioneer",
				label: t("market_report.in_short.pioneer"),
				value:
					b.pioneerCost == null
						? "–"
						: t("market_report.in_short.pioneer_value", {
								cost: formatMoney(b.pioneerCost),
							}),
				change: b.pioneerChange,
				note: t("market_report.in_short.since", {
					date: formatDate(b.pioneerStart),
				}),
				spark: spark(b.pioneerSeries),
			},
		].map((tile) => ({ ...tile, tone: tone(tile.change) }));
	});

	const gap = computed(() =>
		books ? (exchangeGaps(books, summary, "books")[0] ?? null) : null
	);
</script>

<template>
	<div
		class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 md:rounded-panel md:border md:border-line md:bg-white/2">
		<article
			v-for="tile in tiles"
			:key="tile.key"
			class="tile"
			:aria-labelledby="`mr-short-${tile.key}`">
			<h3 :id="`mr-short-${tile.key}`" class="tile-label">
				{{ tile.label }}
			</h3>
			<div class="tile-value">{{ tile.value }}</div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span class="pill" :class="tile.tone.pill">
					{{ formatChange(tile.change) }}
				</span>
				<span class="tile-note">{{ tile.note }}</span>
			</div>
			<svg
				class="hidden md:block w-full h-9 mt-auto"
				:viewBox="`0 0 ${W} ${H}`"
				preserveAspectRatio="none"
				aria-hidden="true">
				<g v-for="(s, i) in tile.spark" :key="i">
					<polygon
						:points="s.area"
						:style="{ fill: `var(${tile.tone.color})` }"
						fill-opacity="0.1" />
					<polyline
						:points="s.line"
						fill="none"
						:style="{ stroke: `var(${tile.tone.color})` }"
						stroke-width="1.5"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke" />
				</g>
			</svg>
		</article>

		<article class="tile" aria-labelledby="mr-short-gap" data-gap-tile>
			<h3 id="mr-short-gap" class="tile-label">
				{{ t("market_report.in_short.gap") }}
			</h3>
			<div
				v-if="!books && !booksFailed"
				aria-busy="true"
				data-skeleton
				class="flex-1 rounded-panel bg-white/5 motion-safe:animate-pulse">
				<span class="sr-only">{{ t("wrapper.loading") }}</span>
			</div>
			<p v-else-if="booksFailed" class="tile-note">
				{{ t("market_report.error") }}
			</p>
			<template v-else-if="gap">
				<div class="flex items-center gap-2.5 min-w-0">
					<MarketTickerChip
						:ticker="gap.ticker"
						:category="gap.category"
						class="max-md:w-10! max-md:h-6!" />
					<span class="tile-value">
						{{ formatMaterialName(gap.name, gap.ticker) }}
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span class="pill" :class="tone(gap.gap).pill">
						{{ formatChange(gap.gap) }}
					</span>
					<span class="tile-note">
						{{
							t("market_report.in_short.gap_note", {
								low: gap.low,
								high: gap.high,
							})
						}}
					</span>
				</div>
				<div
					class="hidden lg:flex items-center gap-2 h-9 mt-auto text-[13px] tabular-nums">
					<MarketExchangePill :code="gap.low" />
					{{
						t("market_report.gaps.ask", {
							price: formatBookPrice(gap.ask),
						})
					}}
					<span aria-hidden="true" class="text-muted">→</span>
					<MarketExchangePill :code="gap.high" />
					{{
						t("market_report.gaps.bid", {
							price: formatBookPrice(gap.bid),
						})
					}}
				</div>
			</template>
			<p v-else class="tile-note">
				{{
					t("market_report.in_short.no_gap", {
						min: `${GAP_MIN_PCT} %`,
					})
				}}
			</p>
		</article>
	</div>
</template>

<style scoped>
	@reference "../../../assets/css/style.css";

	.tile {
		@apply flex flex-col gap-1 md:gap-1.5 h-30 md:h-41 min-w-0 px-3 py-2.5 md:px-4.5 md:py-4 rounded-panel border border-line bg-white/2 md:rounded-none md:border-0 md:border-r md:bg-transparent md:last:border-r-0;
	}
	.tile-label {
		@apply text-xs font-normal leading-tight text-muted-strong;
	}
	.tile-value {
		@apply text-[17px] md:text-[22px] font-bold leading-tight text-ink-strong truncate;
	}
	.tile-note {
		@apply text-xs leading-tight text-muted;
	}
	.pill {
		@apply inline-flex items-center h-5.5 px-2 rounded-full text-xs font-bold whitespace-nowrap;
	}
</style>
