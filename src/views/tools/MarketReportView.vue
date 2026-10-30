<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";

	const { t } = useI18n();

	useHead({
		title: t("market_report.view_title"),
		meta: [
			{
				name: "description",
				content: t("market_report.description"),
			},
		],
	});

	// Composables
	import { useMarketReport } from "@/features/market_report/useMarketReport";
	import { useMarketBooks } from "@/features/market_report/useMarketBooks";
	import { useInView } from "@/features/market_report/useInView";
	import { useContentReady } from "@/lib/perf/useContentReady";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components: the frame and the modules above the fold are in this
	// chunk, the ones below load when their section comes near
	import MarketBlock from "@/features/market_report/components/MarketBlock.vue";
	import MarketInShort from "@/features/market_report/components/MarketInShort.vue";
	import MarketKpis from "@/features/market_report/components/MarketKpis.vue";
	import MarketIndexChart from "@/features/market_report/components/MarketIndexChart.vue";
	const MarketWorkforce = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketWorkforce.vue")
	);
	const MarketTreemap = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketTreemap.vue")
	);
	const MarketMoversTable = defineAsyncComponent(
		() =>
			import("@/features/market_report/components/MarketMoversTable.vue")
	);
	const MarketLeaders = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketLeaders.vue")
	);
	const MarketGaps = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketGaps.vue")
	);
	const MarketExchangeCards = defineAsyncComponent(
		() =>
			import("@/features/market_report/components/MarketExchangeCards.vue")
	);

	// Util
	import {
		CHANGE_SCALE_PCT,
		changeColor,
		formatDate,
		MARKET_EXCHANGES,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
	import type {
		MarketGapBasis,
		MarketIndexView,
		MarketMoversDirection,
	} from "@/features/market_report/marketReport.types";

	// UI
	import PSegmented from "@/ui/components/PSegmented.vue";

	const { summary, failed, retry } = useMarketReport();
	const { books, failed: booksFailed, load: loadBooks } = useMarketBooks();

	// the index chart is the page's main content; the order books (In
	// short's gap, the gaps, the exchange cards) start once it is on screen
	const { contentReady } = useContentReady();
	let booksStarted = false;
	watch(
		summary,
		(s) => {
			if (!s) return;
			contentReady();
			if (booksStarted) return;
			booksStarted = true;
			if (typeof requestIdleCallback === "function")
				requestIdleCallback(() => loadBooks());
			else setTimeout(() => loadBooks(), 1);
		},
		{ immediate: true }
	);

	const options = <T extends string>(keys: T[], prefix: string) =>
		computed(() =>
			keys.map((value) => ({ value, label: t(`${prefix}.${value}`) }))
		);
	const INDEX_VIEWS = options<MarketIndexView>(
		["exchange", "combined", "sector"],
		"market_report.index.view"
	);
	const DIRECTIONS = options<MarketMoversDirection>(
		["rising", "falling"],
		"market_report.movers"
	);
	const BASES = options<MarketGapBasis>(
		["vwap", "books"],
		"market_report.gaps.basis"
	);

	const indexView = ref<MarketIndexView>("exchange");

	// member count of every line in the current index view
	const indexMembers = computed<string>(() => {
		const members = summary.value?.index.members ?? {};
		if (indexView.value === "combined") return String(members.ALL ?? 0);
		const keys =
			indexView.value === "exchange"
				? MARKET_EXCHANGES
				: (summary.value?.sectors.map((s) => s.key) ?? []);
		return keys
			.map(
				(k) =>
					`${indexView.value === "sector" ? t(`market_report.sector.${k}`) : k} ${members[k] ?? 0}`
			)
			.join(", ");
	});
	const tier = ref<WorkforceType>("pioneer");
	const direction = ref<MarketMoversDirection>("rising");
	const basis = ref<MarketGapBasis>("vwap");

	function setIndexView(view: MarketIndexView): void {
		indexView.value = view;
		trackEvent("market:view_change", { chart: "index", view });
	}
	function setTier(view: WorkforceType): void {
		tier.value = view;
		trackEvent("market:view_change", { chart: "workforce", view });
	}
	function setDirection(view: MarketMoversDirection): void {
		direction.value = view;
		trackEvent("market:view_change", { chart: "movers", view });
	}
	function setBasis(view: MarketGapBasis): void {
		basis.value = view;
		trackEvent("market:view_change", { chart: "gaps", view });
	}

	// below the fold: code and data load about a screen ahead
	const workforceEl = ref<HTMLElement | null>(null);
	const treemapEl = ref<HTMLElement | null>(null);
	const listsEl = ref<HTMLElement | null>(null);
	const exchangesEl = ref<HTMLElement | null>(null);
	const workforceSeen = useInView(workforceEl);
	const treemapSeen = useInView(treemapEl);
	const listsSeen = useInView(listsEl);
	const exchangesSeen = useInView(exchangesEl);

	const SCALE = `linear-gradient(90deg, ${[-12, -6, 0, 6, 12]
		.map((pct) => changeColor(pct))
		.join(", ")})`;
	const method = computed(() => [
		"source",
		"turnover",
		"prices",
		"index",
		"movers",
		"gaps",
		"heavy_day",
		"not_included",
		"flat",
	]);
</script>

<template>
	<div class="w-full max-w-[1240px] mx-auto px-6 py-6 flex flex-col gap-6">
		<header class="flex flex-col gap-2">
			<h1 class="text-2xl font-bold">{{ t("market_report.title") }}</h1>
			<p
				class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
				data-as-of>
				<i18n-t keypath="market_report.as_of.prices" tag="span">
					<template #date>
						<b v-if="summary" class="text-ink">
							{{ formatDate(summary.as_of) }}
						</b>
						<span
							v-else
							class="inline-block w-12 h-3 align-middle rounded-sm bg-white/5 motion-safe:animate-pulse" />
					</template>
				</i18n-t>
				<span>{{ t("market_report.as_of.books") }}</span>
				<span>{{ t("market_report.as_of.source") }}</span>
			</p>
		</header>

		<section class="flex flex-col gap-3" aria-labelledby="mr-short">
			<h2 id="mr-short" class="text-base font-bold">
				{{ t("market_report.in_short.title") }}
			</h2>
			<MarketBlock
				:ready="!!summary"
				:failed="failed"
				size="h-62 md:h-41"
				@retry="retry">
				<MarketInShort
					:summary="summary!"
					:books="books"
					:books-failed="booksFailed" />
			</MarketBlock>
			<MarketBlock
				:ready="!!summary"
				:failed="failed"
				size="h-79 sm:h-59 lg:h-28"
				@retry="retry">
				<MarketKpis :summary="summary!" />
			</MarketBlock>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="mr-index">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="max-w-3xl">
					<h2 id="mr-index" class="text-base font-bold">
						{{ t("market_report.index.title") }}
					</h2>
					<p class="text-sm text-muted">
						{{ t("market_report.index.caption") }}
					</p>
				</div>
				<PSegmented
					block="phone"
					:value="indexView"
					:options="INDEX_VIEWS"
					:label="t('market_report.index.view.label')"
					@update:value="setIndexView" />
			</div>
			<MarketBlock
				:ready="!!summary"
				:failed="failed"
				size="h-80"
				@retry="retry">
				<MarketIndexChart :summary="summary!" :view="indexView" />
			</MarketBlock>
			<p class="text-xs text-muted min-h-8 lg:min-h-4">
				<template v-if="summary">
					{{
						t(`market_report.index.base_${indexView}`, {
							date: formatDate(summary.index.base),
							members: indexMembers,
							coverage: `${formatNumber((summary.index.coverage.ALL ?? 0) * 100, 0)} %`,
						})
					}}
				</template>
			</p>
		</section>

		<section
			ref="workforceEl"
			class="flex flex-col gap-3"
			aria-labelledby="mr-workforce">
			<div class="max-w-3xl">
				<h2 id="mr-workforce" class="text-base font-bold">
					{{ t("market_report.workforce.title") }}
				</h2>
				<p class="text-sm text-muted">
					{{ t("market_report.workforce.caption") }}
				</p>
			</div>
			<MarketBlock :ready="workforceSeen" size="h-[768px] lg:h-[462px]">
				<MarketWorkforce :tier="tier" @update:tier="setTier" />
			</MarketBlock>
		</section>

		<section
			ref="treemapEl"
			class="flex flex-col gap-3"
			aria-labelledby="mr-treemap">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div class="max-w-3xl">
					<h2 id="mr-treemap" class="text-base font-bold">
						{{ t("market_report.treemap.title") }}
					</h2>
					<p class="text-sm text-muted">
						{{ t("market_report.treemap.caption") }}
					</p>
				</div>
				<div
					class="flex items-center gap-2 text-xs text-muted tabular-nums"
					aria-hidden="true">
					<span>−{{ CHANGE_SCALE_PCT }} %</span>
					<span
						class="w-24 h-2.5 rounded-sm"
						:style="{ background: SCALE }" />
					<span>+{{ CHANGE_SCALE_PCT }} %</span>
					<span
						class="ml-2 size-3 rounded-sm"
						style="
							background: repeating-linear-gradient(
								135deg,
								var(--color-selected) 0 4px,
								rgb(255 255 255 / 0.12) 4px 6px
							);
						" />
					{{ t("market_report.treemap.flat") }}
				</div>
			</div>
			<MarketBlock
				:ready="!!summary && treemapSeen"
				:failed="failed"
				size="h-120"
				@retry="retry">
				<MarketTreemap :summary="summary!" />
			</MarketBlock>
		</section>

		<div ref="listsEl" class="flex flex-col gap-6">
			<section class="flex flex-col gap-3" aria-labelledby="mr-movers">
				<div class="flex flex-wrap items-end justify-between gap-3">
					<div class="max-w-3xl">
						<h2 id="mr-movers" class="text-base font-bold">
							{{ t("market_report.movers.title") }}
						</h2>
						<p class="text-sm text-muted">
							{{ t("market_report.movers.caption") }}
						</p>
					</div>
					<PSegmented
						block="phone"
						:value="direction"
						:options="DIRECTIONS"
						:label="t('market_report.movers.direction_label')"
						@update:value="setDirection" />
				</div>
				<MarketBlock
					:ready="!!summary && listsSeen"
					:failed="failed"
					size="h-[358px] sm:h-[396px]"
					@retry="retry">
					<MarketMoversTable
						:summary="summary!"
						:direction="direction" />
				</MarketBlock>
			</section>

			<section
				class="flex flex-col gap-3 p-4 rounded-panel border border-line min-w-0"
				aria-labelledby="mr-leaders">
				<div class="max-w-3xl">
					<h2 id="mr-leaders" class="text-base font-bold">
						{{ t("market_report.leaders.title") }}
					</h2>
					<p class="text-sm text-muted">
						{{ t("market_report.leaders.caption") }}
					</p>
				</div>
				<MarketBlock
					:ready="!!summary && listsSeen"
					:failed="failed"
					size="h-[560px] lg:h-[320px]"
					@retry="retry">
					<MarketLeaders :summary="summary!" />
				</MarketBlock>
			</section>

			<section class="flex flex-col gap-3" aria-labelledby="mr-gaps">
				<div class="flex flex-wrap items-end justify-between gap-3">
					<div class="max-w-3xl">
						<h2 id="mr-gaps" class="text-base font-bold">
							{{ t("market_report.gaps.title") }}
						</h2>
						<p class="text-sm text-muted">
							{{ t(`market_report.gaps.caption_${basis}`) }}
						</p>
					</div>
					<PSegmented
						block="phone"
						:value="basis"
						:options="BASES"
						:label="t('market_report.gaps.basis.label')"
						@update:value="setBasis" />
				</div>
				<MarketBlock
					:ready="!!summary && listsSeen"
					:failed="failed"
					size="h-120"
					@retry="retry">
					<MarketGaps :summary="summary!" :basis="basis" />
				</MarketBlock>
			</section>
		</div>

		<section
			ref="exchangesEl"
			class="flex flex-col gap-3"
			aria-labelledby="mr-exchanges">
			<div class="max-w-3xl">
				<h2 id="mr-exchanges" class="text-base font-bold">
					{{ t("market_report.exchanges.title") }}
				</h2>
				<p class="text-sm text-muted">
					{{ t("market_report.exchanges.caption") }}
				</p>
			</div>
			<MarketBlock
				:ready="!!summary && exchangesSeen"
				:failed="failed"
				size="h-337 sm:h-167 xl:h-82"
				@retry="retry">
				<MarketExchangeCards :summary="summary!" />
			</MarketBlock>
		</section>

		<section aria-labelledby="mr-method">
			<details class="rounded-panel border border-line p-4">
				<summary
					id="mr-method"
					class="cursor-pointer text-base font-bold py-2.5 lg:py-0">
					{{ t("market_report.method.title") }}
				</summary>
				<ul class="flex flex-col gap-2 pt-3 list-disc pl-5 text-sm">
					<li v-for="key in method" :key="key">
						{{ t(`market_report.method.${key}`) }}
					</li>
				</ul>
			</details>
		</section>
	</div>
</template>
