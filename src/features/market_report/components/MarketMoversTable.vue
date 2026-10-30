<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMarketList } from "@/features/market_report/useMarketList";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		changeClass,
		formatChange,
		formatMoney,
		marketMovers,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";
	import { formatMaterialName } from "@/util/text";

	// Components
	import MarketShowAll from "@/features/market_report/components/MarketShowAll.vue";
	import MarketTickerChip from "@/features/market_report/components/MarketTickerChip.vue";
	import PDataTable from "@/ui/components/PDataTable.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";

	// Types & Interfaces
	import type { MarketMaterial } from "@/features/api/schemas/marketSummary.schemas";
	import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";
	import type { MarketMoversDirection } from "@/features/market_report/marketReport.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// the market report's movers: a sortable table, stacked rows on phones
	const { summary, direction } = defineProps<{
		summary: MarketSummary;
		direction: MarketMoversDirection;
	}>();
	const { t } = useI18n();

	const TOP = 8;

	interface IMoverRow extends MarketMaterial {
		label: string;
	}

	const rows = computed<IMoverRow[]>(() =>
		marketMovers(summary.materials, direction).map((m) => ({
			...m,
			label: formatMaterialName(m.name, m.ticker),
		}))
	);

	const columns = computed<PDataTableColumn<IMoverRow>[]>(() => [
		{
			key: "label",
			title: t("market_report.movers.col.material"),
			sorter: (a, b) => a.label.localeCompare(b.label),
		},
		{
			key: "vwap_7d",
			title: t("market_report.movers.col.vwap_7d"),
			align: "right",
			sorter: true,
		},
		{
			key: "turnover_7d",
			title: t("market_report.movers.col.traded_7d"),
			align: "right",
			sorter: true,
		},
		{
			key: "spark",
			title: t("market_report.movers.col.spark"),
			width: 124,
		},
		{
			key: "change_pct",
			title: t("market_report.movers.col.change"),
			align: "right",
			sorter: true,
			width: 120,
		},
	]);

	const list = useMarketList(
		() => rows.value,
		TOP,
		() => columns.value,
		() => direction
	);
	const { sort, page } = list;

	// the phone's "Sort by": the change is the default order
	const sortOptions = computed(() =>
		["change_pct", "label", "vwap_7d", "turnover_7d"].map((key) => ({
			value: key,
			label: t(`market_report.movers.sort.${key}`),
		}))
	);
	const sortBy = computed<string>({
		get: () => sort.value.key ?? "change_pct",
		set: (key) =>
			(sort.value =
				key === "change_pct"
					? { key: null, order: false }
					: { key, order: key === "label" ? "ascend" : "descend" }),
	});

	function toggle(): void {
		list.toggle();
		trackEvent("market:view_change", {
			chart: "movers",
			view: list.expanded.value ? "all" : direction,
		});
	}

	const rowKey = (r: IMoverRow) => r.ticker;
	const price = (m: MarketMaterial) =>
		m.vwap_7d == null
			? "–"
			: `${formatNumber(m.vwap_7d, m.vwap_7d < 100 ? 2 : 0)} ȼ`;
</script>

<template>
	<div class="flex flex-col gap-3">
		<PDataTable
			v-model:sort="sort"
			class="hidden sm:block"
			:columns="columns"
			:data="list.visible.value"
			:row-key="rowKey"
			:min-width="640">
			<template #cell-label="{ row }">
				<div class="flex items-center gap-3 min-w-0">
					<MarketTickerChip
						:ticker="row.ticker"
						:category="row.category" />
					<span class="truncate text-ink-strong">{{
						row.label
					}}</span>
				</div>
			</template>
			<template #cell-vwap_7d="{ row }">{{ price(row) }}</template>
			<template #cell-turnover_7d="{ row }">
				{{ formatMoney(row.turnover_7d) }}
			</template>
			<template #cell-spark="{ row }">
				<PSparkline
					:points="row.spark"
					:trend="row.change_pct ?? 0"
					:label="
						t('market_report.movers.spark_label', {
							ticker: row.ticker,
						})
					" />
			</template>
			<template #cell-change_pct="{ row }">
				<b
					class="whitespace-nowrap"
					:class="changeClass(row.change_pct)">
					{{ formatChange(row.change_pct) }}
				</b>
			</template>
			<template #empty>{{ t("market_report.movers.empty") }}</template>
		</PDataTable>

		<div class="sm:hidden flex flex-col gap-2">
			<PSelect
				v-model:value="sortBy"
				:options="sortOptions"
				:aria-label="t('market_report.list.sort_by')" />
			<ol>
				<li
					v-for="m in list.visible.value"
					:key="m.ticker"
					class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 h-12">
					<MarketTickerChip
						:ticker="m.ticker"
						:category="m.category" />
					<div class="min-w-0 leading-tight">
						<div class="truncate text-ink-strong">
							{{ m.label }}
						</div>
						<div class="text-xs text-muted truncate tabular-nums">
							{{
								t("market_report.movers.row", {
									price: price(m),
									turnover: formatMoney(m.turnover_7d),
								})
							}}
						</div>
					</div>
					<b
						class="whitespace-nowrap tabular-nums"
						:class="changeClass(m.change_pct)">
						{{ formatChange(m.change_pct) }}
					</b>
				</li>
				<li v-if="!rows.length" class="text-muted py-3">
					{{ t("market_report.movers.empty") }}
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
				t(`market_report.list.show_all.${direction}`, {
					count: list.total.value,
				})
			"
			:pages-label="t('market_report.movers.pages_label')"
			@toggle="toggle" />
	</div>
</template>
