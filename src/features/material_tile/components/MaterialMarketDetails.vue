<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Components
	import MaterialDataChart from "@/features/market_exploration/components/MaterialDataChart.vue";
	import MaterialExchangeTable from "@/features/material_tile/components/MaterialExchangeTable.vue";
	import MaterialMarketPlanLine from "@/features/material_tile/components/MaterialMarketPlanLine.vue";

	// Util
	import {
		isRare,
		MARKET_EXCHANGES,
		marketRows,
		marketSummary,
		planLine,
	} from "@/features/material_tile/materialMarket.util";
	import { formatMaterialName } from "@/util/text";
	import { formatNumber, formatSmallNumber } from "@/util/numbers";
	import { formatDate } from "@/util/date";

	// Types & Interfaces
	import type { Material } from "@/features/api/schemas/gameData.schemas";
	import type { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";
	import type { ExchangeMetric } from "@/features/market_exploration/marketExploration.types";
	import type {
		DailyContext,
		IPlanLine,
	} from "@/features/material_tile/materialMarket.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	/*
	 * Market details, the drawer behind the market card: the material, the
	 * plan against each exchange, every exchange in three views, the last
	 * 30 days and the market's health in plain words.
	 */
	const {
		ticker,
		material,
		categoryClass,
		overview,
		daily = undefined,
		dailyContext = "plan",
		marketCheck = undefined,
	} = defineProps<{
		ticker: string;
		material: Material | null;
		categoryClass: string;
		overview: IMaterialExchangeOverview;
		daily?: number;
		dailyContext?: DailyContext;
		marketCheck?: IMarketCheck;
	}>();

	const { t } = useI18n();

	const rows = computed(() => marketRows(overview, daily));
	const plan = computed((): IPlanLine | null =>
		daily ? planLine(rows.value, marketCheck) : null
	);
	const summary = computed(() => marketSummary(overview));
	const rare = computed(() => isRare(overview));
	const active = computed(
		() =>
			MARKET_EXCHANGES.filter(
				(cx) => overview.exchange_status[cx] === "ACTIVE"
			).length
	);

	const chartMetric = ref<ExchangeMetric>("vwap");
	const chartMetrics: ExchangeMetric[] = ["vwap", "low", "high", "traded"];

	const health = computed(() => {
		const s = summary.value;
		const band = s.cohesionText.key.split(".").at(-1)!;
		const trendClass =
			s.weightedTrend === null || Math.abs(s.weightedTrend) < 0.005
				? "text-muted"
				: s.weightedTrend > 0
					? "text-positive"
					: "text-negative";
		return [
			{
				key: "breadth",
				value: `${formatNumber((s.rising / 4) * 100, 0)} %`,
				valueText: t("material_tile.health.breadth.value", {
					rising: s.rising,
				}),
				text: t("material_tile.health.breadth.text"),
				valueClass: "",
			},
			{
				key: "trend",
				value:
					s.weightedTrend === null
						? "—"
						: `${formatNumber(s.weightedTrend * 100, 1, false, true)} %`,
				valueText: t("material_tile.health.trend.value"),
				text: t("material_tile.health.trend.text"),
				valueClass: trendClass,
			},
			{
				key: "balance",
				value: s.balance === null ? "—" : formatNumber(s.balance, 2),
				valueText: t("material_tile.health.balance.value"),
				text: t(s.balanceText.key),
				valueClass: "",
			},
			{
				key: "cohesion",
				value: `${formatNumber(s.cohesion, 2)} %`,
				valueText: t(`material_tile.health.cohesion.${band}`),
				text: t("material_tile.health.cohesion.text"),
				valueClass: band === "apart" ? "text-warning" : "",
			},
		];
	});
</script>

<template>
	<div class="flex flex-col gap-6" data-material-market-details>
		<!-- material -->
		<div class="flex items-center gap-4">
			<div
				class="shrink-0 px-4 py-2 rounded-control text-2xl font-bold"
				:class="categoryClass">
				{{ ticker }}
			</div>
			<div class="min-w-0">
				<div class="text-base font-bold text-ink-strong">
					{{ formatMaterialName(material?.name ?? "", ticker) }}
				</div>
				<div v-if="material" class="text-muted">
					{{
						$t(
							`game.material_category.${material.category_name.replace(" ", "_")}`
						)
					}}
				</div>
				<div class="flex flex-wrap gap-x-4 text-xs text-muted-strong">
					<span v-if="material">
						{{ $t("material_tile.details.weight") }}
						{{ formatSmallNumber(material.weight) }} t
					</span>
					<span v-if="material">
						{{ $t("material_tile.details.volume") }}
						{{ formatSmallNumber(material.volume) }} m³
					</span>
					<span>
						{{
							$t("material_tile.details.data_of", {
								date: formatDate(
									overview.calendar_date.UNIVERSE
								),
							})
						}}
					</span>
					<span :class="active < 4 ? 'text-warning' : ''" data-active>
						{{ $t("material_tile.details.active", { n: active }) }}
					</span>
				</div>
			</div>
		</div>

		<!-- rare and plan -->
		<div v-if="rare || plan" class="flex flex-col gap-2">
			<div
				v-if="rare"
				class="px-3 py-2 rounded-panel border border-warning/40 text-warning"
				data-rare>
				{{
					$t("material_tile.card.rare", {
						units: formatNumber(
							overview.sum_traded_30d.UNIVERSE,
							0
						),
					})
				}}
			</div>
			<MaterialMarketPlanLine
				v-if="plan"
				:plan="plan"
				:daily="daily!"
				:daily-context="dailyContext"
				limits />
		</div>

		<!-- exchanges -->
		<section class="flex flex-col gap-2">
			<h3 class="font-bold text-base text-ink-strong">
				{{ $t("material_tile.details.exchanges") }}
			</h3>
			<MaterialExchangeTable
				:overview="overview"
				:daily="daily"
				:your-cx="marketCheck?.exchange ?? null" />
		</section>

		<!-- last 30 days -->
		<section class="flex flex-col gap-2">
			<div class="flex flex-wrap gap-x-4 gap-y-2 items-center">
				<h3 class="grow font-bold text-base text-ink-strong">
					{{ $t("material_tile.details.history") }}
				</h3>
				<PButtonGroup
					role="group"
					:aria-label="$t('material_tile.chart.metric.label')">
					<PButton
						v-for="metric in chartMetrics"
						:key="metric"
						size="sm"
						:pressed="chartMetric === metric"
						@click="chartMetric = metric">
						{{ $t(`material_tile.chart.metric.${metric}`) }}
					</PButton>
				</PButtonGroup>
			</div>
			<MaterialDataChart
				:material-ticker="ticker"
				:metric="chartMetric" />
		</section>

		<!-- market health -->
		<section class="flex flex-col gap-2">
			<h3 class="font-bold text-base text-ink-strong">
				{{ $t("material_tile.health.title") }}
			</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div
					v-for="tile in health"
					:key="tile.key"
					class="flex flex-col gap-1 p-3 rounded-panel border border-line bg-surface-sunken"
					:data-health="tile.key">
					<div
						class="text-xs font-medium uppercase tracking-wide text-muted">
						{{ $t(`material_tile.health.${tile.key}.label`) }}
					</div>
					<div>
						<span
							class="font-mono text-lg font-bold"
							:class="tile.valueClass">
							{{ tile.value }}
						</span>
						<span class="pl-2 text-xs text-muted-strong">
							{{ tile.valueText }}
						</span>
					</div>
					<p class="text-xs text-muted">{{ tile.text }}</p>
				</div>
			</div>
		</section>
	</div>
</template>
