<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanView } from "@/features/planning/usePlanView";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { ResultTile } from "@/features/planning/planView.util";
	import type { ElementId } from "@/features/planning/layout/planLayout.types";

	// Util
	import { formatAmount, formatNumber, formatPayback } from "@/util/numbers";

	// UI
	import { PValue } from "@/ui";
	import PMeter from "@/ui/charts/PMeter.vue";

	/**
	 * One of the plan's results: profit, payback, workforce, area with
	 * profit per area, or storage. A button that opens the element its
	 * figure comes from; narrow, the sub line goes below the figure.
	 *
	 * @author jplacht
	 */
	const { tile } = defineProps<{ tile: ResultTile }>();

	const { calculation, empire, focusElement } = usePlanView();
	const {
		result,
		overviewData: overview,
		visitationData: visitation,
	} = calculation;

	// where each figure comes from
	const OPENS: Record<ResultTile, ElementId> = {
		profit: "profit-breakdown",
		payback: "construction-cart",
		area: "planet",
		workforce: "workforce",
		storage: "visitation-frequency",
	};
	function open(): void {
		trackEvent("plan:result_tile_open", { tile });
		focusElement(OPENS[tile]);
	}

	const area = computed(() => result.value.area);
	const profitPerArea = computed(() =>
		area.value.areaUsed > 0
			? overview.value.profit / area.value.areaUsed
			: 0
	);

	// the tiers the plan needs workers of; the least efficient one shows
	const needed = computed(() =>
		Object.values(result.value.workforce).filter((w) => w.required > 0)
	);
	const lowestEfficiency = computed(() =>
		needed.value.length
			? Math.min(...needed.value.map((w) => w.efficiency))
			: undefined
	);
	const shortTier = computed(() =>
		Object.values(result.value.workforce).find((w) => w.left < 0)
	);
	// "PIO 260/650 · SET 550/1,450": workers needed of the beds, per tier
	// the plan needs; a tier short of beds in red
	const tierParts = computed(() =>
		needed.value.map((w) => ({
			key: w.name,
			text: `${t(`plan.results.tier_short.${w.name}`)} ${formatAmount(w.required)}/${formatAmount(w.capacity)}`,
			short: w.left < 0,
		}))
	);
	// "Agri 1 · Chem 4": the experts placed, in one line
	const expertLine = computed(() =>
		Object.values(result.value.experts)
			.filter((e) => e.amount > 0)
			.map(
				(e) => `${t(`plan.results.expert_short.${e.name}`)} ${e.amount}`
			)
			.join(" · ")
	);

	// the figure, then its sub line below; from 360 px of tile width the
	// sub line sits next to the figure
	const body =
		"flex flex-col gap-y-1 @min-[360px]:flex-row @min-[360px]:flex-wrap @min-[360px]:items-baseline @min-[360px]:gap-x-4";
	const label =
		"block text-xs font-medium uppercase tracking-wider text-muted";
	const sub = "text-xs text-muted text-balance";
	const value = "text-lg font-medium text-ink-strong text-nowrap";
</script>

<template>
	<button
		type="button"
		class="block w-full h-full px-3 py-2.5 rounded text-left tabular-nums cursor-pointer hover:bg-hover focus-visible:bg-hover transition-colors"
		:data-tile="tile"
		@click="open">
		<template v-if="tile === 'profit'">
			<span :class="label">{{ t("plan.results.profit") }}</span>
			<div :class="body">
				<span
					translate="no"
					class="text-xl font-medium leading-tight text-nowrap">
					<PValue :value="overview.profit" />
					<span class="pl-1 text-sm text-muted">ȼ</span>
				</span>
				<span :class="sub">
					{{
						t("plan.results.revenue_cost", {
							revenue: formatNumber(result.revenue),
							cost: formatNumber(result.cost),
							degradation: formatNumber(
								overview.dailyDegradationCost
							),
							fees: formatNumber(overview.dailyProductionFeeCost),
						})
					}}
				</span>
			</div>
		</template>

		<template v-else-if="tile === 'payback'">
			<span :class="label">{{ t("plan.results.payback") }}</span>
			<div :class="body">
				<span translate="no" :class="value">
					{{ formatPayback(overview.roi) }}
				</span>
				<!-- what the payback earns back -->
				<span
					class="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted"
					data-build-cost>
					<span
						translate="no"
						class="text-sm font-medium text-ink-strong">
						{{ formatNumber(overview.totalConstructionCost, 0) }}
					</span>
					{{ t("plan.results.build_cost") }}
				</span>
			</div>
		</template>

		<!-- the lowest efficiency, workers needed of the beds per tier and
			the experts -->
		<template v-else-if="tile === 'workforce'">
			<span :class="label">{{ t("plan.results.workforce") }}</span>
			<div :class="body">
				<span
					translate="no"
					:class="[value, shortTier ? 'text-negative!' : '']"
					:data-short="!!shortTier"
					:title="t('plan.results.lowest_efficiency')">
					{{
						lowestEfficiency === undefined
							? "—"
							: `${formatNumber(lowestEfficiency * 100, 1)} %`
					}}
				</span>
				<span class="min-w-0">
					<span translate="no" :class="sub" data-workforce-tiers>
						<span v-for="(part, i) in tierParts" :key="part.key">
							<span v-if="i"> · </span>
							<span
								class="whitespace-nowrap"
								:class="part.short ? 'text-negative' : ''"
								:data-short="part.short">
								{{ part.text }}
							</span>
						</span>
					</span>
					<!-- one line, the full list on hover -->
					<span
						v-if="expertLine"
						translate="no"
						class="block text-xs text-muted truncate"
						:title="expertLine"
						data-experts>
						{{ expertLine }}
					</span>
				</span>
			</div>
		</template>

		<!-- used of total over its meter, the profit per used area (and
			the empire's) below -->
		<template v-else-if="tile === 'area'">
			<span :class="label">{{ t("plan.results.area") }}</span>
			<div :class="body" data-area>
				<span :class="value">
					<span
						translate="no"
						:class="area.areaLeft < 0 ? 'text-negative' : ''"
						:data-over="area.areaLeft < 0">
						{{ area.areaUsed }}
					</span>
					<span translate="no" class="text-sm text-muted">
						/ {{ area.areaTotal }}
					</span>
				</span>
				<span
					class="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted"
					data-profit-area>
					<span class="text-sm font-medium">
						<PValue :value="profitPerArea" />
					</span>
					{{ t("plan.results.profit_per_area") }}
					<span v-if="empire.profitPerArea.value !== undefined">
						·
						{{
							t("plan.results.empire_average", {
								value: formatNumber(
									empire.profitPerArea.value,
									2,
									false,
									true
								),
							})
						}}
					</span>
				</span>
			</div>
			<PMeter
				class="mt-1.5"
				:value="area.areaUsed"
				:max="area.areaTotal"
				:label="t('plan.results.area')" />
		</template>

		<template v-else>
			<span :class="label">{{ t("plan.results.storage") }}</span>
			<div :class="body">
				<span translate="no" :class="value">
					{{ formatNumber(visitation.storageFilled, 1) }}
					<span translate="yes" class="text-sm text-muted">
						{{ t("plan.results.days_to_full") }}
					</span>
				</span>
				<span
					:class="sub"
					:title="
						t('plan.results.in_out_volume_per_day', {
							in: formatNumber(visitation.dailyVolumeImport, 1),
							out: formatNumber(visitation.dailyVolumeExport, 1),
						})
					">
					{{
						t("plan.results.in_out_per_day", {
							in: formatNumber(visitation.dailyWeightImport, 1),
							out: formatNumber(visitation.dailyWeightExport, 1),
						})
					}}
				</span>
			</div>
		</template>
	</button>
</template>
