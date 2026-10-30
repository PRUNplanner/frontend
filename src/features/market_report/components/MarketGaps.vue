<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMarketBooks } from "@/features/market_report/useMarketBooks";
	import { useMarketList } from "@/features/market_report/useMarketList";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		exchangeGaps,
		formatBookPrice,
		formatChange,
		formatMoney,
		GAP_MIN_PCT,
		GAP_MIN_TURNOVER,
		GAP_MIN_UNITS,
	} from "@/features/market_report/marketReport.util";
	import { formatMaterialName } from "@/util/text";

	// Components
	import MarketBlock from "@/features/market_report/components/MarketBlock.vue";
	import MarketExchangePill from "@/features/market_report/components/MarketExchangePill.vue";
	import MarketShowAll from "@/features/market_report/components/MarketShowAll.vue";
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";
	import PDataTable from "@/ui/components/PDataTable.vue";
	import PSelect from "@/ui/components/PSelect.vue";

	// Types & Interfaces
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
	import type {
		IMarketGap,
		MarketGapBasis,
	} from "@/features/market_report/marketReport.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// price gaps between exchanges: a sortable table, stacked rows on phones
	const { summary, basis } = defineProps<{
		summary: MarketSummary;
		basis: MarketGapBasis;
	}>();
	const { t } = useI18n();
	const { books, failed, load } = useMarketBooks();
	load();

	const TOP = 10;

	interface IGapRow extends IMarketGap {
		label: string;
		/** Books now's order: open gaps by size, closed ones last */
		now: number;
	}

	const rows = computed<IGapRow[]>(() =>
		books.value
			? exchangeGaps(books.value, summary, basis).map((g) => ({
					...g,
					label: formatMaterialName(g.name, g.ticker),
					now: g.open ?? -1,
				}))
			: []
	);
	const maxGap = computed(() => Math.max(1, ...rows.value.map((r) => r.gap)));

	const columns = computed<PDataTableColumn<IGapRow>[]>(() => [
		{
			key: "label",
			title: t("market_report.gaps.col.material"),
			sorter: (a, b) => a.label.localeCompare(b.label),
		},
		{
			key: "low",
			title: t(`market_report.gaps.col.low_${basis}`),
			sorter: (a, b) => a.low.localeCompare(b.low),
		},
		{
			key: "high",
			title: t(`market_report.gaps.col.high_${basis}`),
			sorter: (a, b) => a.high.localeCompare(b.high),
		},
		{
			key: "gap",
			title: t("market_report.gaps.col.gap"),
			align: "right",
			sorter: true,
			width: 170,
		},
		...(basis === "vwap"
			? [
					{
						key: "now",
						title: t("market_report.gaps.col.now"),
						sorter: true as const,
					},
				]
			: []),
	]);

	const list = useMarketList(
		() => rows.value,
		TOP,
		() => columns.value,
		() => basis
	);
	const { sort, page } = list;

	// the phone's "Sort by": the gap is the default order
	const sortOptions = computed(() =>
		["gap", "label", ...(basis === "vwap" ? ["now"] : [])].map((key) => ({
			value: key,
			label: t(`market_report.gaps.sort.${key}`),
		}))
	);
	const sortBy = computed<string>({
		get: () => sort.value.key ?? "gap",
		set: (key) =>
			(sort.value =
				key === "gap"
					? { key: null, order: false }
					: { key, order: key === "label" ? "ascend" : "descend" }),
	});

	function toggle(): void {
		list.toggle();
		trackEvent("market:view_change", {
			chart: "gaps",
			view: list.expanded.value ? "all" : basis,
		});
	}

	const rowKey = (r: IGapRow) => r.ticker;
	// the price on one side: VWAP 7D, or the ask and the bid
	const lowPrice = (r: IGapRow) =>
		basis === "vwap"
			? formatBookPrice(r.lowPrice)
			: t("market_report.gaps.ask", { price: formatBookPrice(r.lowPrice) });
	const highPrice = (r: IGapRow) =>
		basis === "vwap"
			? formatBookPrice(r.highPrice)
			: t("market_report.gaps.bid", { price: formatBookPrice(r.highPrice) });
	const nowText = (r: IGapRow) =>
		r.open == null
			? t("market_report.gaps.closed")
			: t("market_report.gaps.open", { change: formatChange(r.open) });
	const nowDetail = (r: IGapRow) =>
		[
			r.ask > 0
				? t("market_report.gaps.ask_on", {
						price: formatBookPrice(r.ask),
						exchange: r.low,
					})
				: t("market_report.gaps.no_ask", { exchange: r.low }),
			r.bid > 0
				? t("market_report.gaps.bid_on", {
						price: formatBookPrice(r.bid),
						exchange: r.high,
					})
				: t("market_report.gaps.no_bid", { exchange: r.high }),
		].join(" · ");
	const empty = computed(() =>
		t("market_report.gaps.empty", { min: `${GAP_MIN_PCT} %` })
	);
</script>

<template>
	<MarketBlock :ready="!!books" :failed="failed" size="h-120" @retry="load(true)">
		<div class="flex flex-col gap-3">
			<PDataTable
				v-model:sort="sort"
				class="hidden sm:block"
				:columns="columns"
				:data="list.visible.value"
				:row-key="rowKey"
				:min-width="760">
				<template #cell-label="{ row }">
					<div class="flex items-center gap-3 min-w-0">
						<MarketTickerChip
							:ticker="row.ticker"
							:category="row.category" />
						<span class="truncate text-ink-strong">{{ row.label }}</span>
					</div>
				</template>
				<template #cell-low="{ row }">
					<span class="flex items-center gap-2 tabular-nums">
						<MarketExchangePill :code="row.low" />
						{{ lowPrice(row) }}
					</span>
				</template>
				<template #cell-high="{ row }">
					<span class="flex items-center gap-2 tabular-nums">
						<MarketExchangePill :code="row.high" />
						{{ highPrice(row) }}
					</span>
				</template>
				<template #cell-gap="{ row }">
					<span class="flex items-center justify-end gap-2.5">
						<span
							aria-hidden="true"
							class="shrink-0 w-16 h-1.5 rounded-full bg-white/8">
							<span
								class="block h-full rounded-full bg-positive"
								:style="{ width: `${(row.gap / maxGap) * 100}%` }" />
						</span>
						<b class="min-w-19 whitespace-nowrap text-positive">
							{{ formatChange(row.gap) }}
						</b>
					</span>
				</template>
				<template #cell-now="{ row }">
					<span class="flex flex-col leading-tight">
						<b :class="row.open == null ? 'text-ink' : 'text-positive'">
							{{ nowText(row) }}
						</b>
						<span class="text-xs text-muted tabular-nums">
							{{ nowDetail(row) }}
						</span>
					</span>
				</template>
				<template #empty>{{ empty }}</template>
			</PDataTable>

			<div class="sm:hidden flex flex-col gap-2">
				<PSelect
					v-model:value="sortBy"
					:options="sortOptions"
					:aria-label="t('market_report.list.sort_by')" />
				<ol>
					<li
						v-for="r in list.visible.value"
						:key="r.ticker"
						class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-2 border-b border-white/5">
						<MarketTickerChip
							class="row-span-2"
							:ticker="r.ticker"
							:category="r.category" />
						<span
							class="flex flex-wrap items-center gap-1.5 text-[13px] tabular-nums">
							<MarketExchangePill :code="r.low" />
							{{ lowPrice(r) }}
							<span aria-hidden="true">→</span>
							<MarketExchangePill :code="r.high" />
							{{ highPrice(r) }}
						</span>
						<b class="row-span-2 whitespace-nowrap text-positive">
							{{ formatChange(r.gap) }}
						</b>
						<span
							class="text-xs truncate"
							:class="r.open == null ? 'text-muted' : 'text-positive'">
							{{ r.label
							}}{{ basis === "vwap" ? ` · ${nowText(r)}` : "" }}
						</span>
					</li>
					<li v-if="!rows.length" class="text-muted py-3">
						{{ empty }}
					</li>
				</ol>
			</div>

			<MarketShowAll
				v-model:page="page"
				:total="list.total.value"
				:top="TOP"
				:offset="list.offset.value"
				:shown="list.visible.value.length"
				:page-count="list.pageCount.value"
				:expanded="list.expanded.value"
				:show-all="
					t('market_report.list.show_all.gaps', {
						count: list.total.value,
					})
				"
				:pages-label="t('market_report.gaps.pages_label')"
				@toggle="toggle" />

			<p class="text-xs text-muted">
				{{
					t("market_report.gaps.footnote", {
						units: GAP_MIN_UNITS,
						turnover: formatMoney(GAP_MIN_TURNOVER),
						min: `${GAP_MIN_PCT} %`,
					})
				}}
			</p>
		</div>
	</MarketBlock>
</template>
