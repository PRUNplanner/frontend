<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, ref } from "vue";
	import { useI18n } from "vue-i18n";
	import { useRouter } from "vue-router";

	// Composables
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Components
	import PSparkline from "@/ui/charts/PSparkline.vue";
	import PLayerClose from "@/ui/components/PLayerClose.vue";
	import MaterialMarketPlanLine from "@/features/material_tile/components/MaterialMarketPlanLine.vue";

	// Util
	import {
		formatMarketPrice,
		formatQuantity,
		isRare,
		MARKET_EXCHANGES,
		marketRows,
		marketSummary,
		planLine,
		sharedDomain,
		translateRef,
	} from "@/features/material_tile/materialMarket.util";
	import { CX_DOT_COLOR } from "@/features/exchanges/exchangeLabel.util";
	import { formatShare } from "@/features/cx/marketCheck.util";
	import { formatMaterialName } from "@/util/text";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { Material } from "@/features/api/schemas/gameData.schemas";
	import type { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";
	import type {
		DailyContext,
		IMarketRow,
		IMarketTrend,
		IPlanLine,
	} from "@/features/material_tile/materialMarket.types";

	// UI
	import { PButton } from "@/ui";

	/*
	 * The material's market at a glance: what it is worth, where it trades
	 * and whether the market can carry the plan. Shown by MaterialTile in a
	 * hover card, or as a bottom sheet (sheet) on touch.
	 */
	const {
		ticker,
		material,
		categoryClass,
		overview,
		daily = undefined,
		dailyContext = "plan",
		marketCheck = undefined,
		pinned = false,
		sheet = false,
		narrow = false,
		clickOpensDetails = false,
		clickOnly = false,
	} = defineProps<{
		ticker: string;
		material: Material | null;
		categoryClass: string;
		overview: IMaterialExchangeOverview;
		// + sold, − bought per day
		daily?: number;
		dailyContext?: DailyContext;
		// the row's Market check, where the caller has one
		marketCheck?: IMarketCheck;
		pinned?: boolean;
		// the phone layout in a bottom sheet
		sheet?: boolean;
		// less room than 624 px beside the ticker: VWAPs stacked, no Spread
		narrow?: boolean;
		// a click on the ticker opens Market details, not a pinned card
		clickOpensDetails?: boolean;
		// the "On click only" setting: the card only ever opens pinned
		clickOnly?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "close"): void;
		(e: "details"): void;
	}>();

	const { t } = useI18n();
	const router = useRouter();
	const theme = useChartTheme();

	const rows = computed(() => marketRows(overview, daily));
	const universe = computed(() => rows.value.at(-1)!);
	const plan = computed((): IPlanLine | null =>
		daily ? planLine(rows.value, marketCheck) : null
	);
	const summary = computed(() => marketSummary(overview));
	const rare = computed(() => isRare(overview));
	const yourCx = computed(() => marketCheck?.exchange ?? null);
	const compact = computed(() => sheet || narrow);

	// 30 daily VWAPs per exchange, one cached request each, once the card
	// stayed open a moment (tabbing through tiles opens one card after another)
	const SPARK_DELAY_MS = 250;
	const history = ref<Partial<Record<string, (number | null)[]>>>({});
	const domain = computed(() =>
		sharedDomain(Object.values(history.value).filter((s) => !!s))
	);
	let sparkTimer: ReturnType<typeof setTimeout> | undefined;
	onMounted(() => (sparkTimer = setTimeout(loadHistory, SPARK_DELAY_MS)));
	onBeforeUnmount(() => clearTimeout(sparkTimer));
	function loadHistory(): void {
		for (const cx of MARKET_EXCHANGES)
			useQuery("GetCXSparklines", {
				exchange: cx,
				metric: "vwap_daily",
				tickers: [ticker],
			})
				.execute()
				.then((r) => {
					history.value = { ...history.value, [cx]: r.series[ticker] };
				})
				// the column stays empty, the numbers still show
				.catch(() => undefined);
	}

	const cxLabel = (cx: string) =>
		cx === "UNIVERSE" ? t("exchanges.labels.universe") : cx;

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

	function spreadText(row: IMarketRow): string {
		if (row.spreadState === "no_bids" || row.spreadState === "no_asks")
			return t(`material_tile.card.${row.spreadState}`);
		return `${formatNumber(row.spreadPct!, 1)} %`;
	}

	const shareText = (row: IMarketRow) =>
		row.share === null ? t("material_tile.card.no_trades") : formatShare(row.share);

	const weightedClass = computed(() => {
		const w = summary.value.weightedTrend;
		if (w === null || Math.abs(w) < 0.005) return "text-muted";
		return w > 0 ? "text-positive" : "text-negative";
	});
	const weightedGlyph = computed(() => {
		const w = summary.value.weightedTrend;
		return w === null || w === 0 ? "■" : w > 0 ? "▲" : "▼";
	});
	const offeredShare = computed(() => {
		const { offered, wanted } = summary.value;
		return offered + wanted > 0 ? (offered / (offered + wanted)) * 100 : 50;
	});

	function openExploration(): void {
		emit("close");
		router.push({
			name: "market-exploration",
			query: { material: ticker },
		});
	}
</script>

<template>
	<div
		class="flex flex-col gap-3 text-ink"
		:class="sheet ? 'w-full' : narrow ? 'w-max max-w-full p-4' : 'w-[624px] p-4'"
		data-material-market-card>
		<!-- header -->
		<div class="flex items-start gap-3">
			<div
				class="shrink-0 px-2.5 py-1.5 rounded-control font-bold text-base"
				:class="categoryClass">
				{{ ticker }}
			</div>
			<div class="flex-1 min-w-0">
				<div class="font-bold text-ink-strong truncate">
					{{ formatMaterialName(material?.name ?? "", ticker) }}
				</div>
				<div v-if="material" class="text-xs text-muted">
					{{
						$t(
							`game.material_category.${material.category_name.replace(" ", "_")}`
						)
					}}
					·
					{{
						$t("material_tile.card.facts", {
							weight: formatNumber(material.weight, 2),
							volume: formatNumber(material.volume, 2),
						})
					}}
				</div>
			</div>
			<div class="text-right shrink-0">
				<div class="text-xs text-muted">
					{{ $t("material_tile.card.universe_vwap") }}
				</div>
				<div class="font-mono text-base font-bold text-ink-strong">
					{{ formatMarketPrice(universe.vwap7d) }}
				</div>
				<div class="text-xs" :class="trendClass(universe.trend)">
					{{
						$t("material_tile.card.vs_30d", {
							trend: trendText(universe.trend),
						})
					}}
				</div>
			</div>
			<div v-if="pinned" class="flex items-center gap-1 shrink-0">
				<span class="text-xs text-muted">
					{{ $t("material_tile.card.pinned") }}
				</span>
				<PLayerClose
					:aria-label="$t('material_tile.card.close')"
					@click="emit('close')" />
			</div>
		</div>

		<MaterialMarketPlanLine
			v-if="plan"
			:plan="plan"
			:daily="daily!"
			:daily-context="dailyContext" />

		<!-- exchanges -->
		<div class="overflow-x-auto">
			<table class="w-full text-xs tabular-nums whitespace-nowrap">
				<thead>
					<tr
						class="text-muted text-xs *:font-medium *:pb-1"
						:class="compact ? '*:px-0.5' : '*:px-1'">
						<th class="text-left">
							{{ $t("material_tile.card.columns.cx") }}
						</th>
						<th class="text-right">
							{{ $t("material_tile.card.columns.ask") }}
						</th>
						<th class="text-right">
							{{ $t("material_tile.card.columns.bid") }}
						</th>
						<th v-if="!compact" class="text-right">
							{{ $t("material_tile.card.columns.spread") }}
						</th>
						<template v-if="compact">
							<th class="text-right">
								{{ $t("material_tile.card.columns.vwap") }}
							</th>
						</template>
						<template v-else>
							<th class="text-right">
								{{ $t("material_tile.card.columns.vwap_7d") }}
							</th>
							<th class="text-right">
								{{ $t("material_tile.card.columns.vwap_30d") }}
							</th>
							<th class="text-right">
								{{ $t("material_tile.card.columns.trend") }}
							</th>
						</template>
						<th class="text-left">
							{{ $t("material_tile.card.columns.history") }}
						</th>
						<th class="text-right">
							{{ $t("material_tile.card.columns.per_day") }}
						</th>
						<th v-if="plan && !sheet" class="text-right">
							{{ $t("material_tile.card.columns.plan") }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in rows"
						:key="row.cx"
						class="border-t border-line *:py-1"
						:class="[
							compact ? '*:px-0.5' : '*:px-1',
							row.cx === yourCx ? 'bg-link/10' : '',
						]"
						:data-cx="row.cx"
						:data-your-cx="row.cx === yourCx || undefined">
						<td class="text-left">
							<div class="flex items-center gap-1.5">
								<span
									class="size-2 rounded-full shrink-0"
									:style="{ background: CX_DOT_COLOR[row.cx] }" />
								<span class="font-bold text-ink-strong">
									{{ cxLabel(row.cx) }}
								</span>
							</div>
							<div
								v-if="row.cx === yourCx"
								class="pl-3.5 text-xs text-link">
								{{ $t("material_tile.card.your_cx") }}
							</div>
							<div
								v-if="row.status"
								class="pl-3.5 text-xs text-warning"
								data-status>
								{{ $t(`material_tile.card.status.${row.status}`) }}
							</div>
						</td>
						<template v-if="row.cx === 'UNIVERSE'">
							<td class="text-right text-muted">—</td>
							<td class="text-right text-muted">—</td>
							<td v-if="!compact" class="text-right text-muted">—</td>
						</template>
						<template v-else>
							<td
								class="text-right font-mono"
								:class="row.ask ? '' : 'text-muted'">
								{{ formatMarketPrice(row.ask) }}
							</td>
							<td
								class="text-right font-mono"
								:class="row.bid ? '' : 'text-muted'">
								{{ formatMarketPrice(row.bid) }}
							</td>
							<td
								v-if="!compact"
								class="text-right font-mono"
								:class="row.spreadState === 'ok' ? '' : 'text-warning'"
								data-spread>
								{{ spreadText(row) }}
							</td>
						</template>
						<td v-if="compact" class="text-right font-mono">
							<div>{{ formatMarketPrice(row.vwap7d) }}</div>
							<div class="text-muted">
								{{ formatMarketPrice(row.vwap30d) }}
							</div>
							<div :class="trendClass(row.trend)">
								{{ trendText(row.trend) }}
							</div>
						</td>
						<template v-else>
							<td class="text-right font-mono">
								{{ formatMarketPrice(row.vwap7d) }}
							</td>
							<td class="text-right font-mono">
								{{ formatMarketPrice(row.vwap30d) }}
							</td>
							<td class="text-right" :class="trendClass(row.trend)">
								{{ trendText(row.trend) }}
							</td>
						</template>
						<td class="text-left">
							<span
								v-if="row.cx === 'UNIVERSE' && !compact"
								class="text-xs text-muted">
								{{ $t("material_tile.card.shared_scale") }}
							</span>
							<PSparkline
								v-else-if="row.cx !== 'UNIVERSE' && history[row.cx]"
								:points="history[row.cx]!"
								:trend="row.trend.change * 100"
								:domain="domain"
								:color="theme.exchange(row.cx)"
								:width="sheet ? 36 : compact ? 40 : 64"
								:label="
									$t('material_tile.card.spark_label', {
										cx: row.cx,
									})
								" />
						</td>
						<td
							class="text-right font-mono"
							:class="row.perDay < 1 ? 'text-warning' : ''">
							{{ formatQuantity(row.perDay) }}
						</td>
						<td
							v-if="plan && !sheet"
							class="text-right font-mono"
							:class="VERDICT_CLASS[row.verdict!]"
							data-share>
							{{ shareText(row) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- summary -->
		<div class="flex flex-col gap-1 text-xs text-muted-strong">
			<div v-if="rare" class="text-warning" data-rare>
				{{
					$t("material_tile.card.rare", {
						units: formatNumber(overview.sum_traded_30d.UNIVERSE, 0),
					})
				}}
			</div>
			<div>
				<span :class="weightedClass">{{ weightedGlyph }}</span>
				{{ translateRef(t, summary.trend) }}
			</div>
			<div class="flex items-center gap-2">
				<span>
					{{
						$t("material_tile.card.summary.book", {
							offered: formatQuantity(summary.offered),
							wanted: formatQuantity(summary.wanted),
						})
					}}
				</span>
				<div
					role="img"
					:aria-label="
						$t('material_tile.card.summary.book_label', {
							offered: formatQuantity(summary.offered),
							wanted: formatQuantity(summary.wanted),
						})
					"
					class="flex h-1.5 w-24 rounded-full overflow-hidden bg-link">
					<div
						class="h-full bg-white/40"
						:style="{ width: `${offeredShare}%` }" />
				</div>
			</div>
			<div>{{ translateRef(t, summary.cohesionText) }}</div>
		</div>

		<!-- footer -->
		<div
			class="flex flex-wrap items-center gap-2 pt-2 border-t border-line"
			:class="sheet ? 'justify-stretch *:flex-1' : ''">
			<span v-if="!sheet" class="flex-1 text-xs text-muted">
				{{
					$t(
						clickOnly
							? "material_tile.card.hint_click"
							: pinned
								? "material_tile.card.hint_pinned"
								: clickOpensDetails
									? "material_tile.card.hint_details"
									: "material_tile.card.hint"
					)
				}}
			</span>
			<PButton
				type="secondary"
				:class="sheet ? 'h-11!' : ''"
				data-exploration
				@click="openExploration">
				{{ $t("material_tile.card.exploration") }}
			</PButton>
			<PButton
				type="secondary"
				:class="sheet ? 'h-11!' : ''"
				data-details
				@click="emit('details')">
				{{ $t("material_tile.card.details") }}
			</PButton>
		</div>
	</div>
</template>
