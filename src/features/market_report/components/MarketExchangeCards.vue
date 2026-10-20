<script setup lang="ts">
	import { computed, ref, shallowRef } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Util
	import {
		bookStats,
		exchangeCards,
		formatMoney,
		MARKET_EXCHANGES,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PButton } from "@/ui";

	// Types & Interfaces
	import type { Exchange } from "@/features/api/schemas/gameData.schemas";
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const theme = useChartTheme();

	const cards = computed(() => exchangeCards(summary));
	// the same scale for all four
	const barMax = computed(() =>
		Math.max(1, ...cards.value.flatMap((c) => c.daily))
	);

	// order books load on their own; the turnover above doesn't wait
	const books = shallowRef<Exchange[] | null>(null);
	const booksFailed = ref(false);
	function loadBooks(forceRefetch: boolean = false): void {
		booksFailed.value = false;
		useQuery("GetMarketExchanges")
			.execute({ forceRefetch })
			.then((data) => (books.value = data))
			.catch(() => (booksFailed.value = true));
	}
	loadBooks();

	const stats = computed(() =>
		books.value
			? Object.fromEntries(
					MARKET_EXCHANGES.map((ex) => [
						ex,
						bookStats(books.value!, ex),
					])
				)
			: null
	);
</script>

<template>
	<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
		<article
			v-for="c in cards"
			:key="c.code"
			class="flex flex-col gap-3 p-4 h-96 rounded-panel border border-line">
			<header class="flex items-center gap-2">
				<span
					class="size-2.5 rounded-full"
					:style="{ background: theme.exchange(c.code) }" />
				<h3 class="font-bold">{{ c.code }}</h3>
				<span class="text-xs text-muted">
					{{ $t(`market_report.exchanges.name.${c.code}`) }}
				</span>
			</header>
			<div>
				<div class="text-xs text-muted">
					{{ $t("market_report.exchanges.turnover_30d") }}
				</div>
				<div class="text-2xl font-bold tabular-nums">
					{{ formatMoney(c.turnover30d) }}
				</div>
				<div class="text-xs text-muted">
					{{
						$t("market_report.exchanges.share", {
							share: `${formatNumber(c.share, 0)} %`,
						})
					}}
				</div>
			</div>
			<svg
				role="img"
				:aria-label="
					$t('market_report.exchanges.bars_label', {
						exchange: c.code,
					})
				"
				class="w-full h-11"
				:viewBox="`0 0 ${c.daily.length} 44`"
				preserveAspectRatio="none">
				<rect
					v-for="(v, i) in c.daily"
					:key="i"
					:x="i + 0.15"
					:width="0.7"
					:y="44 - (v / barMax) * 44"
					:height="(v / barMax) * 44"
					:fill="theme.exchange(c.code)" />
			</svg>
			<dl
				class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
				<dt class="text-muted">
					{{ $t("market_report.exchanges.turnover_7d") }}
				</dt>
				<dd class="text-right">{{ formatMoney(c.turnover7d) }}</dd>
				<dt class="text-muted">
					{{ $t("market_report.exchanges.traded_7d") }}
				</dt>
				<dd class="text-right">{{ c.traded7d }}</dd>
				<template v-if="stats">
					<dt class="text-muted">
						{{ $t("market_report.exchanges.spread") }}
					</dt>
					<dd class="text-right">
						{{
							stats[c.code].spreadMedian == null
								? "–"
								: `${formatNumber(stats[c.code].spreadMedian!, 1)} %`
						}}
					</dd>
					<dt class="text-muted">
						{{ $t("market_report.exchanges.no_bid") }}
					</dt>
					<dd class="text-right">{{ stats[c.code].noBid }}</dd>
					<dt class="text-muted">
						{{ $t("market_report.exchanges.no_ask") }}
					</dt>
					<dd class="text-right">{{ stats[c.code].noAsk }}</dd>
				</template>
			</dl>
			<div
				v-if="!stats && !booksFailed"
				aria-busy="true"
				data-skeleton
				class="h-16 rounded-panel bg-white/5 motion-safe:animate-pulse">
				<span class="sr-only">{{ $t("wrapper.loading") }}</span>
			</div>
			<div
				v-if="booksFailed"
				class="flex flex-wrap items-center gap-2 text-xs text-muted">
				{{ $t("market_report.error") }}
				<PButton type="secondary" size="sm" @click="loadBooks(true)">
					{{ $t("wrapper.retry") }}
				</PButton>
			</div>
		</article>
	</div>
</template>
