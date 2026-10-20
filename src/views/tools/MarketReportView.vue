<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";

	const { t } = useI18n();

	useHead({
		title: `${t("market_report.view_title")} | PRUNplanner`,
		meta: [
			{
				name: "description",
				content: t("market_report.description"),
			},
		],
	});

	// Composables
	import { useMarketReport } from "@/features/market_report/useMarketReport";
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
	const MarketMovers = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketMovers.vue")
	);
	const MarketLeaders = defineAsyncComponent(
		() => import("@/features/market_report/components/MarketLeaders.vue")
	);
	const MarketExchangeCards = defineAsyncComponent(
		() =>
			import("@/features/market_report/components/MarketExchangeCards.vue")
	);

	// Util
	import {
		CHANGE_SCALE_PCT,
		changeColor,
		formatDay,
		MARKET_EXCHANGES,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import {
		WorkforceTypeSchema,
		type WorkforceType,
	} from "@/features/api/schemas/planningData.schemas";
	import type {
		MarketIndexView,
		MarketMoversDirection,
	} from "@/features/market_report/marketReport.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	const { summary, failed, retry } = useMarketReport();

	// the index chart is the page's main content
	const { contentReady } = useContentReady();
	watch(summary, (s) => s && contentReady(), { immediate: true });

	const INDEX_VIEWS: MarketIndexView[] = ["combined", "exchange", "sector"];
	const TIERS: WorkforceType[] = WorkforceTypeSchema.options;
	const DIRECTIONS: MarketMoversDirection[] = ["rising", "falling"];

	const indexView = ref<MarketIndexView>("combined");

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
	const METHOD = [
		"source",
		"turnover",
		"prices",
		"index",
		"movers",
		"heavy_day",
		"not_included",
		"flat",
	];
</script>

<template>
	<div class="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
		<header class="flex flex-col gap-2">
			<h1 class="text-2xl font-bold">{{ t("market_report.title") }}</h1>
			<p
				class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
				data-as-of>
				<i18n-t keypath="market_report.as_of.prices" tag="span">
					<template #date>
						<b v-if="summary" class="text-ink">
							{{ formatDay(summary.as_of) }}
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
			<div
				class="flex flex-col gap-3 p-4 rounded-panel border border-line">
				<h2 id="mr-short" class="text-base font-bold">
					{{ t("market_report.in_short.title") }}
				</h2>
				<MarketBlock
					:ready="!!summary"
					:failed="failed"
					size="h-40 md:h-24"
					@retry="retry">
					<MarketInShort :summary="summary!" />
				</MarketBlock>
			</div>
			<MarketBlock
				:ready="!!summary"
				:failed="failed"
				size="h-59 lg:h-28"
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
				<PButtonGroup
					role="group"
					:aria-label="t('market_report.index.view.label')">
					<PButton
						v-for="view in INDEX_VIEWS"
						:key="view"
						size="sm"
						:pressed="indexView === view"
						@click="setIndexView(view)">
						{{ t(`market_report.index.view.${view}`) }}
					</PButton>
				</PButtonGroup>
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
							date: formatDay(summary.index.base),
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
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="max-w-3xl">
					<h2 id="mr-workforce" class="text-base font-bold">
						{{ t("market_report.workforce.title") }}
					</h2>
					<p class="text-sm text-muted">
						{{ t("market_report.workforce.caption") }}
					</p>
				</div>
				<div class="max-w-full overflow-x-auto py-2.5 -my-2.5">
					<PButtonGroup
						role="group"
						:aria-label="t('market_report.workforce.tier_label')">
						<PButton
							v-for="tt in TIERS"
							:key="tt"
							size="sm"
							:pressed="tier === tt"
							@click="setTier(tt)">
							{{ t(`game.workforce_type.${tt}`) }}
						</PButton>
					</PButtonGroup>
				</div>
			</div>
			<MarketBlock :ready="workforceSeen" size="h-112">
				<MarketWorkforce :tier="tier" />
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

		<div ref="listsEl" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<section
				class="flex flex-col gap-3 p-4 rounded-panel border border-line min-w-0"
				aria-labelledby="mr-movers">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h2 id="mr-movers" class="text-base font-bold">
						{{ t("market_report.movers.title") }}
					</h2>
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
				<MarketBlock
					:ready="!!summary && listsSeen"
					:failed="failed"
					size="h-96"
					@retry="retry">
					<MarketMovers :summary="summary!" :direction="direction" />
				</MarketBlock>
				<p class="text-xs text-muted">
					{{ t("market_report.movers.caption") }}
				</p>
			</section>
			<section
				class="flex flex-col gap-3 p-4 rounded-panel border border-line min-w-0"
				aria-labelledby="mr-leaders">
				<h2 id="mr-leaders" class="text-base font-bold leading-8">
					{{ t("market_report.leaders.title") }}
				</h2>
				<MarketBlock
					:ready="!!summary && listsSeen"
					:failed="failed"
					size="h-128"
					@retry="retry">
					<MarketLeaders :summary="summary!" />
				</MarketBlock>
				<p class="text-xs text-muted">
					{{ t("market_report.leaders.caption") }}
				</p>
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
				size="h-393 sm:h-195 xl:h-96"
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
					<li v-for="key in METHOD" :key="key">
						{{ t(`market_report.method.${key}`) }}
					</li>
				</ul>
			</details>
		</section>
	</div>
</template>
