<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		formatMarketPrice,
		formatQuantity,
		marketRows,
	} from "@/features/material_tile/materialMarket.util";
	import { CX_DOT_COLOR } from "@/features/exchanges/exchangeLabel.util";
	import { formatShare } from "@/features/cx/marketCheck.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		EXCHANGES_TYPE,
		IMaterialExchangeOverview,
	} from "@/database/services/useExchangeData.types";
	import type {
		IMarketRow,
		IMarketTrend,
	} from "@/features/material_tile/materialMarket.types";

	// UI
	import { PSegmented } from "@/ui";

	/*
	 * Every exchange's numbers in three views over the same rows: prices,
	 * order books and volume. Market details and Market Exploration show it;
	 * the plan columns only with a daily flow.
	 */
	const {
		overview,
		daily = undefined,
		yourCx = null,
	} = defineProps<{
		overview: IMaterialExchangeOverview;
		// + sold, − bought per day
		daily?: number;
		// tinted, the exchange the plan is checked against
		yourCx?: EXCHANGES_TYPE | null;
	}>();

	type View = "prices" | "book" | "volume";

	const { t } = useI18n();
	const view = ref<View>("prices");
	const views = computed(() =>
		(["prices", "book", "volume"] as View[]).map((value) => ({
			value,
			label: t(`material_tile.details.views.${value}`),
		}))
	);

	const rows = computed(() => marketRows(overview, daily));

	const cxLabel = (cx: string) =>
		cx === "UNIVERSE" ? t("exchanges.labels.universe") : cx;
	const full = (n: number) => formatNumber(n, 0);
	const signedPct = (n: number | null) =>
		n === null ? "—" : `${formatNumber(n, 1, false, true)} %`;
	const trendText = (trend: IMarketTrend) =>
		`${trend.glyph} ${formatNumber(Math.abs(trend.change) * 100, 1)} %`;
	const trendClass = (trend: IMarketTrend) =>
		trend.level === 0
			? "text-muted"
			: trend.change > 0
				? "text-positive"
				: "text-negative";
	const VERDICT_CLASS = {
		fine: "text-muted",
		watch: "text-warning",
		too_big: "text-negative",
	};

	function spreadPct(row: IMarketRow): string {
		if (row.spreadState === "no_bids" || row.spreadState === "no_asks")
			return t(`material_tile.card.${row.spreadState}`);
		return row.spreadPct === null
			? "—"
			: `${formatNumber(row.spreadPct, 1)} %`;
	}
	const shareText = (share: number | null) =>
		share === null ? t("material_tile.card.no_trades") : formatShare(share);
	const offeredShare = (row: IMarketRow) =>
		row.supply + row.demand > 0
			? (row.supply / (row.supply + row.demand)) * 100
			: 50;

	const note = computed(() =>
		t(
			`material_tile.details.notes.${
				view.value === "volume" && daily ? "volume_plan" : view.value
			}`
		)
	);
</script>

<template>
	<div class="flex flex-col gap-2">
		<PSegmented
			v-model:value="view"
			:options="views"
			:label="$t('material_tile.details.views.label')"
			size="sm" />
		<div class="overflow-x-auto">
			<!-- headers wrap at spaces, values never -->
			<table class="w-full text-[13px] tabular-nums" :data-view="view">
				<thead>
					<tr
						class="text-muted text-xs *:font-medium *:px-1.5 *:pb-1 *:text-right">
						<th class="text-left!">
							{{ $t("material_tile.card.columns.cx") }}
						</th>
						<template v-if="view === 'prices'">
							<th>{{ $t("material_tile.card.columns.ask") }}</th>
							<th>{{ $t("material_tile.card.columns.bid") }}</th>
							<th>
								{{ $t("material_tile.card.columns.spread") }}
							</th>
							<th>
								{{
									$t(
										"material_tile.details.columns.spread_pct"
									)
								}}
							</th>
							<th>
								{{ $t("material_tile.card.columns.vwap_7d") }}
							</th>
							<th>
								{{ $t("material_tile.card.columns.vwap_30d") }}
							</th>
							<th>
								{{ $t("material_tile.card.columns.trend") }}
							</th>
							<th>
								{{
									$t(
										"material_tile.details.columns.vs_universe"
									)
								}}
							</th>
						</template>
						<template v-else-if="view === 'book'">
							<th>
								{{
									$t("material_tile.details.columns.offered")
								}}
							</th>
							<th>
								{{ $t("material_tile.details.columns.wanted") }}
							</th>
							<th>
								{{ $t("material_tile.details.columns.delta") }}
							</th>
							<th>
								{{ $t("material_tile.details.columns.ratio") }}
							</th>
							<th class="text-left!">
								{{ $t("material_tile.details.columns.split") }}
							</th>
						</template>
						<template v-else>
							<th>
								{{
									$t(
										"material_tile.details.columns.traded_7d"
									)
								}}
							</th>
							<th>
								{{
									$t(
										"material_tile.details.columns.traded_30d"
									)
								}}
							</th>
							<th>
								{{ $t("material_tile.card.columns.per_day") }}
							</th>
							<template v-if="daily">
								<th>
									{{
										$t(
											"material_tile.details.columns.share_7d"
										)
									}}
								</th>
								<th>
									{{
										$t(
											"material_tile.details.columns.share_30d"
										)
									}}
								</th>
								<th>
									{{
										$t(
											"material_tile.details.columns.verdict"
										)
									}}
								</th>
							</template>
						</template>
					</tr>
				</thead>
				<tbody class="whitespace-nowrap">
					<tr
						v-for="row in rows"
						:key="row.cx"
						class="border-t border-line *:px-1.5 *:py-1 *:text-right *:font-mono"
						:class="row.cx === yourCx ? 'bg-link/10' : ''"
						:data-cx="row.cx"
						:data-your-cx="row.cx === yourCx || undefined">
						<td class="text-left! font-sans!">
							<span class="inline-flex items-center gap-1.5">
								<span
									class="size-2 rounded-full"
									:style="{
										background: CX_DOT_COLOR[row.cx],
									}" />
								<span class="font-bold text-ink-strong">
									{{ cxLabel(row.cx) }}
								</span>
								<span
									v-if="row.status"
									class="text-xs text-warning">
									{{
										$t(
											`material_tile.card.status.${row.status}`
										)
									}}
								</span>
								<span
									v-if="row.cx === yourCx"
									class="text-xs text-link">
									{{ $t("material_tile.card.your_cx") }}
								</span>
							</span>
						</td>
						<template v-if="view === 'prices'">
							<template v-if="row.cx === 'UNIVERSE'">
								<td class="text-muted">—</td>
								<td class="text-muted">—</td>
								<td class="text-muted">—</td>
								<td class="text-muted">—</td>
							</template>
							<template v-else>
								<td>{{ formatMarketPrice(row.ask) }}</td>
								<td>{{ formatMarketPrice(row.bid) }}</td>
								<td>
									{{
										row.spread === null
											? "—"
											: formatNumber(row.spread, 2, true)
									}}
								</td>
								<td
									:class="
										row.spreadState === 'ok'
											? ''
											: 'text-warning'
									">
									{{ spreadPct(row) }}
								</td>
							</template>
							<td>{{ formatMarketPrice(row.vwap7d) }}</td>
							<td>{{ formatMarketPrice(row.vwap30d) }}</td>
							<td :class="trendClass(row.trend)">
								{{ trendText(row.trend) }}
							</td>
							<td>{{ signedPct(row.vsUniverse) }}</td>
						</template>
						<template v-else-if="view === 'book'">
							<td>{{ full(row.supply) }}</td>
							<td>{{ full(row.demand) }}</td>
							<td>
								{{
									formatNumber(
										row.supply - row.demand,
										0,
										false,
										true
									)
								}}
							</td>
							<td>
								{{
									row.wantedPerOffered === null
										? "—"
										: formatNumber(row.wantedPerOffered, 2)
								}}
							</td>
							<td class="text-left!">
								<div
									role="img"
									:aria-label="
										$t(
											'material_tile.details.split_label',
											{
												cx: cxLabel(row.cx),
												offered: full(row.supply),
												wanted: full(row.demand),
											}
										)
									"
									class="flex h-1.5 w-16 rounded-full overflow-hidden bg-link">
									<div
										class="h-full bg-white/40"
										:style="{
											width: `${offeredShare(row)}%`,
										}" />
								</div>
							</td>
						</template>
						<template v-else>
							<td>{{ full(row.traded7d) }}</td>
							<td>{{ full(row.traded30d) }}</td>
							<td :class="row.perDay < 1 ? 'text-warning' : ''">
								{{ formatQuantity(row.perDay) }}
							</td>
							<template v-if="daily">
								<td>{{ shareText(row.share7) }}</td>
								<td :class="VERDICT_CLASS[row.verdict!]">
									{{ shareText(row.share) }}
								</td>
								<td
									class="font-sans!"
									:class="VERDICT_CLASS[row.verdict!]">
									{{
										$t(
											`material_tile.card.verdict.${row.verdict}`
										)
									}}
								</td>
							</template>
						</template>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="text-xs text-muted">{{ note }}</p>
	</div>
</template>
