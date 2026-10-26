<script setup lang="ts">
	import { computed, defineAsyncComponent, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePlanContext } from "@/features/planning/usePlanContext";
	import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		calculateScaled,
		priceSensitivity,
	} from "@/features/planning/util/whatIf.util";
	import { chartZone } from "@/ui/charts/charts.util";
	import { formatNumber, formatPayback } from "@/util/numbers";

	// Components
	import PDivergingBar from "@/ui/charts/PDivergingBar.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanCheckMarket from "@/features/planning/components/tools/PlanCheckMarket.vue";
	import PlanCheckTarget from "@/features/planning/components/tools/PlanCheckTarget.vue";

	// Types & Interfaces
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
	import type { IPlanInput } from "@/features/planning/engine/engine.types";
	import type {
		BreakEven,
		ISensitivityRow,
		PlanCheckView,
	} from "@/features/planning/util/whatIf.types";
	import type { IChartZone } from "@/ui/charts/charts.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PSegmented, PTooltip } from "@/ui";

	const { t } = useI18n();

	const PlanCheckCompare = defineAsyncComponent(
		() =>
			import("@/features/planning/components/tools/PlanCheckCompare.vue")
	);

	const props = defineProps<{
		plan: IPlanInput["plan"];
		planUuid: string | undefined;
		empire: PlanEmpire | undefined;
		cxUuid: string | undefined;
		planet: Planet;
		/** the viewer's own plan, not a shared or read-only one */
		own?: boolean;
	}>();

	const planningStore = usePlanningStore();
	const userStore = useUserStore();
	const { getGameData, createPrices } = usePlanContext();
	const { materialsMap, getMaterialClass } = useMaterialData();
	const { view, pct } = usePlanCheckView();

	// runs only while the tool is open; a new price book per run picks up
	// CX preference changes
	const sensitivity = computed(() => {
		const input: IPlanInput = {
			plan: props.plan,
			empire: props.empire,
			cxUuid: props.cxUuid,
		};
		const ctx = {
			...getGameData(),
			planet: props.planet,
			prices: createPrices(props.planet.planet_natural_id, props.cxUuid),
		};
		return { input, ctx, ...priceSensitivity(input, ctx) };
	});

	// comparing needs the user's own plans
	const views = computed<PlanCheckView[]>(() =>
		userStore.isLoggedIn
			? ["market", "sensitivity", "compare"]
			: ["market", "sensitivity"]
	);
	const shownView = computed<PlanCheckView>(() =>
		views.value.includes(view.value) ? view.value : "market"
	);
	const PCTS = [10, 20, 30, 50];
	const viewOptions = computed(() =>
		views.value.map((v) => ({
			value: v,
			label: t(`plan.tools.plan_check.views.${v}`),
		}))
	);
	const pctOptions = computed(() =>
		PCTS.map((p) => ({
			value: p,
			label: t("plan.tools.plan_check.pct", { pct: p }),
		}))
	);

	function setView(value: PlanCheckView): void {
		if (view.value === value) return;
		view.value = value;
		trackEvent("plan:plancheck_change", { view: value });
	}

	function setPct(value: number): void {
		if (pct.value === value) return;
		pct.value = value;
		trackEvent("plan:plancheck_change", { view: view.value, pct: value });
	}

	/*
	 * Tornado list
	 */

	const TOP = 10;

	const profit = computed(() => sensitivity.value.result.profit);
	const impact = (row: ISensitivityRow) =>
		(Math.abs(row.slope) * pct.value) / 100;
	const showAll = ref(false);
	const shown = computed(() =>
		showAll.value
			? sensitivity.value.rows
			: sensitivity.value.rows.slice(0, TOP)
	);
	const rest = computed(() =>
		showAll.value ? [] : sensitivity.value.rows.slice(TOP)
	);
	const maxAbs = computed(() =>
		shown.value.length ? impact(shown.value[0]) : 0
	);

	const money = (value: number) => formatNumber(value, 0);
	const signedPct = (value: number) =>
		`${formatNumber(value, Math.abs(value) < 100 ? 1 : 0, false, true)} %`;
	// the price change that hurts: lower when profit rises with the price
	const hurtsLower = (row: ISensitivityRow) => row.slope > 0;
	const adverseChange = (row: ISensitivityRow) =>
		`${hurtsLower(row) ? "−" : "+"}${pct.value} %`;

	function breakEvenLabel(value: BreakEven): string {
		if (value === "never") return t("plan.tools.plan_check.never");
		if (value === "over") return t("plan.tools.plan_check.over");
		return signedPct(value);
	}

	const ZONE_CLASS: Record<IChartZone, string> = {
		red: "text-negative font-bold",
		yellow: "text-warning",
		none: "text-muted",
	};
	const breakEvenClass = (value: BreakEven) =>
		ZONE_CLASS[
			typeof value === "number"
				? chartZone(Math.abs(value), 60, 200)
				: "none"
		];

	const chipClass = (ticker: string) =>
		materialsMap.value[ticker] ? getMaterialClass(ticker) : "bg-black/40";

	const columns = computed<PDataTableColumn<ISensitivityRow>[]>(() => [
		{ key: "ticker", title: t("plan.tools.plan_check.columns.material") },
		{ key: "side", title: t("plan.tools.plan_check.columns.side") },
		{
			key: "bar",
			title: t("plan.tools.plan_check.columns.change"),
			titleAlign: "center",
		},
		{
			key: "range",
			title: t("plan.tools.plan_check.columns.range"),
			align: "right",
		},
		{
			key: "breakEven",
			title: t("plan.tools.plan_check.columns.break_even"),
			align: "right",
		},
	]);
	const rowKey = (row: ISensitivityRow) => row.ticker;

	/*
	 * What this means
	 */

	const top = computed(() => sensitivity.value.rows[0]);
	const adverse = computed(() => {
		if (!top.value) return undefined;
		const { input, ctx } = sensitivity.value;
		const sign = hurtsLower(top.value) ? -1 : 1;
		return calculateScaled(
			input,
			ctx,
			top.value.ticker,
			1 + (sign * pct.value) / 100
		).overview;
	});
	const allCosts = computed(
		() => profit.value - (sensitivity.value.result.cost * pct.value) / 100
	);
	const priceSource = computed(() =>
		props.cxUuid
			? t("plan.tools.plan_check.means.source_cx", {
					name: planningStore.getCX(props.cxUuid).cx_name,
				})
			: t("plan.tools.plan_check.means.source_universe")
	);
</script>

<template>
	<div class="@container flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ t("plan.tools.plan_check.title") }}
			</h2>
			<PSegmented
				v-if="views.length > 1"
				:value="shownView"
				:options="viewOptions"
				:label="t('plan.tools.plan_check.view_label')"
				@update:value="setView" />
			<HelpDrawer file-name="plan" />
			<div
				v-if="shownView === 'sensitivity'"
				class="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
				<span aria-hidden="true" class="text-sm text-muted">
					{{ t("plan.tools.plan_check.pct_label") }}
				</span>
				<PSegmented
					:value="pct"
					:options="pctOptions"
					:label="t('plan.tools.plan_check.pct_label')"
					@update:value="setPct" />
			</div>
		</div>

		<PlanCheckMarket
			v-if="shownView === 'market'"
			:plan="plan"
			:empire="empire"
			:cx-uuid="cxUuid"
			:planet="planet"
			:own="own" />
		<PlanCheckCompare
			v-else-if="shownView === 'compare'"
			:plan="plan"
			:plan-uuid="planUuid"
			:empire="empire"
			:cx-uuid="cxUuid"
			:planet="planet" />
		<p v-else-if="!sensitivity.rows.length" class="text-muted py-6">
			{{ t("plan.tools.plan_check.empty") }}
		</p>
		<div
			v-else
			class="grid grid-cols-[minmax(0,1fr)] @[1000px]:grid-cols-[minmax(0,1fr)_280px] gap-3 items-start">
			<div class="flex flex-col gap-2 min-w-0">
				<!-- below 640 px the side moves next to the material and the
					profit range drops: the bar carries the numbers -->
				<PDataTable
					class="@max-[640px]:[&_[data-col-key=side]]:hidden @max-[640px]:[&_[data-col-key=range]]:hidden"
					:columns="columns"
					:data="shown"
					:row-key="rowKey">
					<template #cell-ticker="{ row }">
						<span
							class="inline-block min-w-10 px-1 rounded-sm text-xs text-center font-bold"
							:class="chipClass(row.ticker)">
							{{ row.ticker }}
						</span>
						<span
							class="@[640px]:hidden ml-1.5 px-1.5 border border-white/20 rounded-sm text-xs text-muted-strong">
							{{ t(`plan.tools.plan_check.side.${row.side}`) }}
						</span>
					</template>
					<!-- a narrow table wraps the long title -->
					<template #header-bar>
						<span class="whitespace-normal">
							{{ t("plan.tools.plan_check.columns.change") }}
						</span>
					</template>
					<template #cell-side="{ row }">
						<span
							class="px-1.5 border border-white/20 rounded-sm text-xs text-muted-strong">
							{{ t(`plan.tools.plan_check.side.${row.side}`) }}
						</span>
					</template>
					<template #cell-bar="{ row }">
						<PTooltip placement="top">
							<template #trigger>
								<PDivergingBar
									class="@[640px]:min-w-65"
									:value="impact(row)"
									:max-abs="maxAbs"
									mirror
									:text="`+${money(impact(row))}`"
									:neg-text="`−${money(impact(row))}`"
									:label="
										t('plan.tools.plan_check.bar_label', {
											ticker: row.ticker,
											value: money(impact(row)),
										})
									" />
							</template>
							<div class="flex flex-col gap-1 min-w-48 text-sm">
								<div class="font-bold">
									{{ row.ticker }}
									<span
										v-if="materialsMap[row.ticker]"
										class="font-normal text-muted">
										{{ materialsMap[row.ticker].name }}
									</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-muted">
										{{
											t(
												"plan.tools.plan_check.tooltip.value"
											)
										}}
									</span>
									<span class="tabular-nums">
										{{ money(Math.abs(row.slope)) }} ȼ
									</span>
								</div>
								<div
									v-for="sign in [-1, 1]"
									:key="sign"
									class="flex justify-between gap-4">
									<span class="text-muted">
										{{
											t(
												"plan.tools.plan_check.tooltip.profit",
												{
													change: `${sign < 0 ? "−" : "+"}${pct} %`,
												}
											)
										}}
									</span>
									<span class="tabular-nums">
										{{
											money(
												profit +
													(sign * row.slope * pct) /
														100
											)
										}}
										ȼ
									</span>
								</div>
							</div>
						</PTooltip>
					</template>
					<template #cell-range="{ row }">
						<span class="tabular-nums whitespace-nowrap">
							{{ money(profit - impact(row)) }} –
							{{ money(profit + impact(row)) }}
						</span>
					</template>
					<template #cell-breakEven="{ row }">
						<span
							class="tabular-nums whitespace-nowrap"
							:class="breakEvenClass(row.breakEven)">
							{{ breakEvenLabel(row.breakEven) }}
						</span>
					</template>
				</PDataTable>
				<p v-if="rest.length" class="text-xs text-muted">
					{{
						t(
							"plan.tools.plan_check.more",
							{
								n: rest.length,
								tickers: rest.map((r) => r.ticker).join(", "),
								value: money(impact(rest[0])),
							},
							rest.length
						)
					}}
				</p>
				<button
					v-if="sensitivity.rows.length > TOP"
					type="button"
					class="self-start min-h-7 pointer-coarse:min-h-11 text-xs text-link hover:underline cursor-pointer"
					:aria-expanded="showAll"
					@click="showAll = !showAll">
					{{
						showAll
							? t("common.buttons.show_fewer")
							: t("common.buttons.show_all", {
									n: sensitivity.rows.length,
								})
					}}
				</button>
				<p class="text-xs text-muted flex flex-wrap gap-x-6">
					<span>
						{{
							t("plan.tools.plan_check.footnote.centre", {
								profit: money(profit),
							})
						}}
					</span>
					<span>{{
						t("plan.tools.plan_check.footnote.break_even")
					}}</span>
				</p>
			</div>

			<div class="flex flex-col gap-3">
				<PlanCheckTarget
					:ctx="sensitivity.ctx"
					:profit="profit"
					:rows="sensitivity.rows" />
				<div
					v-if="top && adverse"
					class="flex flex-col gap-3 border border-white/10 rounded p-3 text-sm">
					<h3 class="font-bold text-white">
						{{ t("plan.tools.plan_check.means.title") }}
					</h3>
					<p class="flex gap-2">
						<span
							class="shrink-0 h-fit min-w-10 px-1 rounded-sm text-xs text-center font-bold"
							:class="chipClass(top.ticker)">
							{{ top.ticker }}
						</span>
						<span>
							{{
								t(
									hurtsLower(top)
										? "plan.tools.plan_check.means.lower"
										: "plan.tools.plan_check.means.higher",
									{
										pct,
										ticker: top.ticker,
										profit: money(adverse.profit),
									}
								)
							}}
							{{
								typeof top.breakEven === "number"
									? t(
											"plan.tools.plan_check.means.break_even",
											{
												change: signedPct(
													top.breakEven
												),
											}
										)
									: top.breakEven === "never" && profit < 0
										? t(
												"plan.tools.plan_check.means.never_loss"
											)
										: t(
												`plan.tools.plan_check.means.${top.breakEven}`
											)
							}}
						</span>
					</p>
					<dl class="flex flex-col divide-y divide-white/10">
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{
									t("plan.tools.plan_check.means.profit_if", {
										ticker: top.ticker,
										change: adverseChange(top),
									})
								}}
							</dt>
							<dd class="font-bold tabular-nums">
								{{ money(adverse.profit) }} ȼ
							</dd>
						</div>
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{
									t("plan.tools.plan_check.means.roi_if", {
										ticker: top.ticker,
										change: adverseChange(top),
									})
								}}
							</dt>
							<dd class="font-bold tabular-nums">
								{{ formatPayback(adverse.roi) }}
							</dd>
						</div>
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{
									t("plan.tools.plan_check.means.all_costs", {
										pct,
									})
								}}
							</dt>
							<dd class="font-bold tabular-nums">
								{{ money(allCosts) }} ȼ
							</dd>
						</div>
						<div
							class="flex justify-between items-center gap-3 py-1.5">
							<dt>
								{{
									t(
										"plan.tools.plan_check.means.most_sensitive"
									)
								}}
							</dt>
							<dd class="flex gap-1">
								<span
									v-for="r in sensitivity.rows.slice(0, 3)"
									:key="r.ticker"
									class="min-w-10 px-1 rounded-sm text-xs text-center font-bold"
									:class="chipClass(r.ticker)">
									{{ r.ticker }}
								</span>
							</dd>
						</div>
					</dl>
					<p class="text-xs text-muted">{{ priceSource }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
