<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IAreaResult,
		IOverviewData,
		IVisitationData,
		IWorkforceRecord,
	} from "@/features/planning/usePlanCalculation.types";
	import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";

	// Components
	import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";

	// Util
	import { formatAmount, formatNumber, formatPayback } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";
	import { countLevels } from "@/features/cx/marketCheck.util";

	// UI
	import { PValue } from "@/ui";
	import PMeter from "@/ui/charts/PMeter.vue";

	/**
	 * The plan's results, always in view: profit, payback, profit per
	 * area, area, storage, workforce and market flags. Each figure appears
	 * only here.
	 *
	 * @author jplacht
	 */
	const {
		overview,
		area,
		visitation,
		workforce,
		checks,
		revenue,
		cost,
		empireProfitPerArea = undefined,
		compare = undefined,
	} = defineProps<{
		overview: IOverviewData;
		area: IAreaResult;
		visitation: IVisitationData;
		workforce: IWorkforceRecord;
		// market flags of the plan's net material flow
		checks: Map<string, IMarketCheck>;
		revenue: number;
		cost: number;
		// the empire's average, when the empire page calculated it
		empireProfitPerArea?: number;
		// a shared plan's copy: the shared plan's figures and its own
		compare?: IPlanCompare;
	}>();

	const emit = defineEmits<{ (e: "open:planCheck"): void }>();

	const profitPerArea = computed(() =>
		area.areaUsed > 0 ? overview.profit / area.areaUsed : 0
	);

	// the tiers the plan needs workers of; the least efficient one shows
	const needed = computed(() =>
		Object.values(workforce).filter((w) => w.required > 0)
	);
	const lowestEfficiency = computed(() =>
		needed.value.length
			? Math.min(...needed.value.map((w) => w.efficiency))
			: undefined
	);
	const shortTier = computed(() =>
		Object.values(workforce).find((w) => w.left < 0)
	);
	// the worst problem first: beds short, then luxuries off
	const workforceNote = computed(() => {
		if (shortTier.value)
			return t("plan.results.beds_short", {
				tier: capitalizeString(
					t(`game.workforce_type.${shortTier.value.name}`)
				),
				n: formatAmount(-shortTier.value.left),
			});
		const off = needed.value.reduce(
			(n, w) => n + (w.lux1 ? 0 : 1) + (w.lux2 ? 0 : 1),
			0
		);
		return off
			? t("plan.results.luxuries_off", { n: off }, off)
			: t("plan.results.all_housed");
	});

	const flags = computed(() => countLevels([...checks.values()]));

	// label and figure share a line; under 64rem of page width every tile
	// puts them on two, so the figures line up
	const head =
		"flex flex-wrap items-baseline gap-x-2 @max-[64rem]:flex-col @max-[64rem]:items-start";
	const label = "text-xs font-medium uppercase tracking-wider text-muted";
	// wraps only where a narrow tile would overflow, evenly; below 60rem of
	// page width (tablets, phones) only the figures show
	const sub = "text-xs text-muted text-balance @max-[60rem]:hidden";
	const value = "text-lg font-medium text-ink-strong text-nowrap";
</script>

<template>
	<section
		:aria-label="t('plan.results.label')"
		class="tabular-nums">
		<div
			class="grid grid-cols-[1.4fr_1fr_1fr] gap-x-3 @min-[48rem]:gap-x-0 @min-[48rem]:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] @min-[72rem]:grid-cols-[1.5fr_repeat(6,minmax(0,1fr))] @min-[48rem]:divide-x divide-line">
			<div class="py-1.5 @min-[48rem]:pr-3">
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
							degradation: formatNumber(overview.dailyDegradationCost),
						})
					}}
				</div>
			</div>
			<div class="py-1.5 @min-[48rem]:px-3">
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
			<div class="py-1.5 @min-[48rem]:px-3 @max-[48rem]:hidden">
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
			<div class="py-1.5 @min-[48rem]:px-3">
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
			<div class="py-1.5 @min-[48rem]:px-3 @max-[48rem]:hidden">
				<div :class="head">
					<span :class="label">{{ t("plan.results.storage") }}</span>
					<span :class="value">
						{{ formatNumber(visitation.storageFilled, 1) }}
						<span class="text-sm text-muted">
							{{ t("plan.results.days_to_full") }}
						</span>
					</span>
				</div>
				<div
					:class="sub"
					:title="
						t('plan.results.in_out_per_day', {
							in: formatNumber(visitation.dailyVolumeImport, 1),
							out: formatNumber(visitation.dailyVolumeExport, 1),
							unit: 'm³',
						})
					">
					{{
						t("plan.results.in_out_per_day", {
							in: formatNumber(visitation.dailyWeightImport, 1),
							out: formatNumber(visitation.dailyWeightExport, 1),
							unit: "t",
						})
					}}
				</div>
			</div>
			<!-- the quick checks: below 72rem of page width only the figures
				before them show -->
			<div class="py-1.5 px-3 @max-[72rem]:hidden">
				<div :class="head">
					<span :class="label">{{ t("plan.results.workforce") }}</span>
					<span
						:class="[value, shortTier ? 'text-negative!' : '']"
						:title="t('plan.results.lowest_efficiency')">
						{{
							lowestEfficiency === undefined
								? "—"
								: `${formatNumber(lowestEfficiency * 100, 1)} %`
						}}
					</span>
				</div>
				<div
					:class="[sub, shortTier ? 'text-negative!' : '']"
					data-workforce-note>
					{{ workforceNote }}
				</div>
			</div>
			<button
				type="button"
				class="py-1.5 pl-3 text-left cursor-pointer hover:bg-hover @max-[72rem]:hidden"
				data-market
				@click="emit('open:planCheck')">
				<div :class="head">
					<span :class="label">{{ t("plan.results.market") }}</span>
					<span v-if="flags.red" :class="[value, 'text-negative!']">
						{{ t("plan.results.cant_trade", { n: flags.red }, flags.red) }}
					</span>
					<span v-else-if="flags.amber" :class="[value, 'text-warning!']">
						{{
							t("plan.results.large_share", { n: flags.amber }, flags.amber)
						}}
					</span>
					<span v-else :class="[value, 'text-muted!']">
						{{ t("plan.results.no_flags") }}
					</span>
				</div>
				<div :class="sub">
					<template v-if="flags.red && flags.amber">
						{{
							t("plan.results.large_share", { n: flags.amber }, flags.amber)
						}}
						·
					</template>
					<span class="text-link">{{ t("plan.results.plan_check") }}</span>
				</div>
			</button>
		</div>
		<SharedPlanDeltas v-if="compare" class="pb-2" :compare="compare" />
	</section>
</template>
