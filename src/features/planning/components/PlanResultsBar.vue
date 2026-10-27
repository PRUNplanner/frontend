<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IAreaResult,
		IOverviewData,
		IVisitationData,
		IExpertRecord,
		IWorkforceRecord,
	} from "@/features/planning/usePlanCalculation.types";
	import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";
	import type { ResultTile } from "@/features/planning/planView.util";

	// Components
	import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";

	// Util
	import { formatAmount, formatNumber, formatPayback } from "@/util/numbers";

	// UI
	import { PValue } from "@/ui";
	import PMeter from "@/ui/charts/PMeter.vue";

	/**
	 * The plan's results, always in view: profit, payback, workforce,
	 * area with profit per area, and storage. Each figure appears
	 * only here.
	 *
	 * @author jplacht
	 */
	const {
		overview,
		area,
		visitation,
		workforce,
		experts,
		revenue,
		cost,
		empireProfitPerArea = undefined,
		compare = undefined,
	} = defineProps<{
		overview: IOverviewData;
		area: IAreaResult;
		visitation: IVisitationData;
		workforce: IWorkforceRecord;
		experts: IExpertRecord;
		revenue: number;
		cost: number;
		// the empire's average, when the empire page calculated it
		empireProfitPerArea?: number;
		// a shared plan's copy: the shared plan's figures and its own
		compare?: IPlanCompare;
	}>();

	// a tile opens where its figure comes from
	const emit = defineEmits<{ (e: "open", tile: ResultTile): void }>();

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
		Object.values(experts)
			.filter((e) => e.amount > 0)
			.map((e) => `${t(`plan.results.expert_short.${e.name}`)} ${e.amount}`)
			.join(" · ")
	);

	// label and figure share a line; under 64rem of page width every tile
	// puts them on two, so the figures line up
	const head =
		"flex flex-wrap items-baseline gap-x-2 @max-[64rem]:flex-col @max-[64rem]:items-start";
	const label = "text-xs font-medium uppercase tracking-wider text-muted";
	// wraps only where a narrow tile would overflow, evenly; below 60rem of
	// page width (tablets, phones) only the figures show
	const sub = "text-xs text-muted text-balance @max-[60rem]:hidden";
	const value = "text-lg font-medium text-ink-strong text-nowrap";
	// every tile is a button: a quiet hover, the figures stay put; the first
	// and last visible tile reach into the bar's padding, so the hover does
	const tile =
		"py-2.5 text-left cursor-pointer hover:bg-hover focus-visible:bg-hover transition-colors";
</script>

<template>
	<section
		:aria-label="t('plan.results.label')"
		class="tabular-nums">
		<div
			class="grid grid-cols-3 gap-x-3 @min-[48rem]:gap-x-0 @min-[48rem]:grid-cols-4 @min-[72rem]:grid-cols-5 @min-[48rem]:divide-x divide-line">
			<button type="button" :class="[tile, '@min-[48rem]:-ml-6 @min-[48rem]:pl-6 @min-[48rem]:pr-3']" data-tile="profit" @click="emit('open', 'profit')">
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
			</button>
			<button type="button" :class="[tile, '@min-[48rem]:px-3']" data-tile="payback" @click="emit('open', 'payback')">
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
			</button>
			<!-- workforce: the lowest efficiency, workers needed of the beds per
				tier and the experts; below 72rem of page width it gives way -->
			<button type="button" :class="[tile, 'px-3 @max-[72rem]:hidden']" data-tile="workforce" @click="emit('open', 'workforce')">
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
				<div :class="sub" data-workforce-tiers>
					<template v-for="(part, i) in tierParts" :key="part.key">
						<template v-if="i"> · </template>
						<span
							class="whitespace-nowrap"
							:class="part.short ? 'text-negative' : ''">
							{{ part.text }}
						</span>
					</template>
				</div>
				<!-- one line, the full list on hover -->
				<div
					v-if="expertLine"
					class="text-xs text-muted truncate @max-[60rem]:hidden"
					:title="expertLine"
					data-experts>
					{{ expertLine }}
				</div>
			</button>
			<!-- area and what it earns: used of total over its meter, the
				profit per used area (and the empire's) below -->
			<button type="button" :class="[tile, '@min-[48rem]:px-3']" data-tile="area" data-area @click="emit('open', 'area')">
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
				<div
					class="flex flex-wrap items-baseline gap-x-1.5 mt-1 text-xs text-muted"
					data-profit-area>
					<span class="text-sm font-medium">
						<PValue :value="profitPerArea" />
					</span>
					{{ t("plan.results.profit_per_area") }}
					<span
						v-if="empireProfitPerArea !== undefined"
						class="@max-[60rem]:hidden">
						·
						{{
							t("plan.results.empire_average", {
								value: formatNumber(empireProfitPerArea, 2, false, true),
							})
						}}
					</span>
				</div>
			</button>
			<button type="button" :class="[tile, '@min-[48rem]:pl-3 @min-[48rem]:-mr-6 @min-[48rem]:pr-6 @max-[48rem]:hidden']" data-tile="storage" @click="emit('open', 'storage')">
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
			</button>
		</div>
		<SharedPlanDeltas v-if="compare" class="pb-2" :compare="compare" />
	</section>
</template>
