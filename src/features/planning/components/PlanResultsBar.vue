<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IAreaResult,
		IOverviewData,
		IVisitationData,
	} from "@/features/planning/usePlanCalculation.types";
	import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";

	// Components
	import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";

	// Util
	import { formatNumber, formatPayback } from "@/util/numbers";

	// UI
	import { PValue } from "@/ui";
	import PMeter from "@/ui/charts/PMeter.vue";

	/**
	 * The plan's results, always in view: profit, payback, profit per
	 * area, area and storage. Each figure appears only here.
	 *
	 * @author jplacht
	 */
	const {
		overview,
		area,
		visitation,
		revenue,
		cost,
		empireProfitPerArea = undefined,
		compare = undefined,
	} = defineProps<{
		overview: IOverviewData;
		area: IAreaResult;
		visitation: IVisitationData;
		revenue: number;
		cost: number;
		// the empire's average, when the empire page calculated it
		empireProfitPerArea?: number;
		// a shared plan's copy: the shared plan's figures and its own
		compare?: IPlanCompare;
	}>();

	const profitPerArea = computed(() =>
		area.areaUsed > 0 ? overview.profit / area.areaUsed : 0
	);

	// label and figure share a line, a narrow tile puts them on two
	const head = "flex flex-wrap items-baseline gap-x-2";
	const label = "text-xs font-medium uppercase tracking-wider text-muted";
	// wraps only where a narrow tile would overflow, evenly; below 60rem of
	// page width (tablets, phones) only the figures show
	const sub = "text-xs text-muted text-balance @max-[60rem]:hidden";
	const value = "text-lg font-medium text-ink-strong";
</script>

<template>
	<section
		:aria-label="t('plan.results.label')"
		class="tabular-nums">
		<div
			class="grid grid-cols-[1.4fr_1fr_1fr] gap-x-3 md:gap-x-0 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] md:divide-x divide-line">
			<div class="py-1.5 md:pr-3">
				<div :class="head">
					<span :class="label">{{ t("plan.results.profit") }}</span>
					<span class="text-xl font-medium leading-tight">
						<PValue :value="overview.profit" />
						<span class="pl-1 text-sm text-muted">ȼ</span>
					</span>
				</div>
				<div :class="sub">
					{{
						t("plan.results.revenue_cost", {
							revenue: formatNumber(revenue),
							cost: formatNumber(cost),
						})
					}}
				</div>
			</div>
			<div class="py-1.5 md:px-3">
				<div :class="head">
					<span :class="label">{{ t("plan.results.payback") }}</span>
					<span :class="value">{{ formatPayback(overview.roi) }}</span>
				</div>
				<div :class="sub">
					{{
						t("plan.results.build", {
							cost: formatNumber(overview.totalConstructionCost, 0),
						})
					}}
				</div>
			</div>
			<div class="py-1.5 md:px-3 max-md:hidden">
				<div :class="head">
					<span :class="label">{{ t("plan.results.profit_area") }}</span>
					<span :class="value"><PValue :value="profitPerArea" /></span>
				</div>
				<div v-if="empireProfitPerArea !== undefined" :class="sub">
					{{
						t("plan.results.empire_average", {
							value: formatNumber(empireProfitPerArea, 2, false, true),
						})
					}}
				</div>
			</div>
			<div class="py-1.5 md:px-3">
				<div :class="head">
					<span :class="label">{{ t("plan.results.area") }}</span>
					<span :class="value">
						<span :class="area.areaLeft < 0 ? 'text-negative' : ''">
							{{ area.areaUsed }}
						</span>
						<span class="text-sm text-muted">
							/ {{ area.areaTotal }}
						</span>
					</span>
				</div>
				<PMeter
					class="mt-1.5"
					:value="area.areaUsed"
					:max="area.areaTotal"
					:label="t('plan.results.area')" />
			</div>
			<div class="py-1.5 md:pl-3 max-md:hidden">
				<div :class="head">
					<span :class="label">{{ t("plan.results.storage") }}</span>
					<span :class="value">
						{{ formatNumber(visitation.storageFilled, 1) }}
						<span class="text-sm text-muted">
							{{ t("plan.results.days_to_full") }}
						</span>
					</span>
				</div>
				<div :class="sub">
					{{
						t("plan.results.out_per_day", {
							weight: formatNumber(visitation.dailyWeightExport, 1),
							volume: formatNumber(visitation.dailyVolumeExport, 1),
						})
					}}
				</div>
			</div>
		</div>
		<SharedPlanDeltas v-if="compare" class="pb-2" :compare="compare" />
	</section>
</template>
