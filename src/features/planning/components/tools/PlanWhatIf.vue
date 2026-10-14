<script lang="ts">
	import { ref } from "vue";
	import type { WhatIfView } from "@/features/planning/util/whatIf.types";

	// module scope: view and price change survive closing and reopening
	const view = ref<WhatIfView>("sensitivity");
	const pct = ref<number>(20);
</script>

<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePlanContext } from "@/features/planning/usePlanContext";
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

	// Types & Interfaces
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
	import type { IPlanInput } from "@/features/planning/engine/engine.types";
	import type {
		BreakEven,
		ISensitivityRow,
	} from "@/features/planning/util/whatIf.types";
	import type { IChartZone } from "@/ui/charts/charts.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PButton, PButtonGroup, PDataTable, PTooltip } from "@/ui";

	const { t } = useI18n();

	const props = defineProps<{
		plan: IPlanInput["plan"];
		empire: PlanEmpire | undefined;
		cxUuid: string | undefined;
		planet: Planet;
	}>();

	const planningStore = usePlanningStore();
	const { getGameData, createPrices } = usePlanContext();
	const { materialsMap, getMaterialClass } = useMaterialData();

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

	const VIEWS: WhatIfView[] = ["sensitivity"];
	const PCTS = [10, 20, 30, 50];

	function setPct(value: number): void {
		if (pct.value === value) return;
		pct.value = value;
		trackEvent("plan:whatif_change", { view: view.value, pct: value });
	}

	/*
	 * Tornado list
	 */

	const TOP = 10;

	const profit = computed(() => sensitivity.value.result.profit);
	const impact = (row: ISensitivityRow) =>
		(Math.abs(row.slope) * pct.value) / 100;
	const shown = computed(() => sensitivity.value.rows.slice(0, TOP));
	const rest = computed(() => sensitivity.value.rows.slice(TOP));
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
		if (value === "never") return t("plan.tools.whatif.never");
		if (value === "over") return t("plan.tools.whatif.over");
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
		{ key: "ticker", title: t("plan.tools.whatif.columns.material") },
		{ key: "side", title: t("plan.tools.whatif.columns.side") },
		{
			key: "bar",
			title: t("plan.tools.whatif.columns.change"),
			titleAlign: "center",
			minWidth: 280,
		},
		{
			key: "range",
			title: t("plan.tools.whatif.columns.range"),
			align: "right",
		},
		{
			key: "breakEven",
			title: t("plan.tools.whatif.columns.break_even"),
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
		() =>
			profit.value - (sensitivity.value.result.cost * pct.value) / 100
	);
	const priceSource = computed(() =>
		props.cxUuid
			? t("plan.tools.whatif.means.source_cx", {
					name: planningStore.getCX(props.cxUuid).cx_name,
				})
			: t("plan.tools.whatif.means.source_universe")
	);
</script>

<template>
	<div class="@container flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ t("plan.tools.whatif.title") }}
			</h2>
			<PButtonGroup
				v-if="VIEWS.length > 1"
				role="group"
				:aria-label="t('plan.tools.whatif.view_label')">
				<PButton
					v-for="v in VIEWS"
					:key="v"
					:pressed="view === v"
					@click="view = v">
					{{ t(`plan.tools.whatif.views.${v}`) }}
				</PButton>
			</PButtonGroup>
			<span v-else class="text-sm text-muted">
				{{ t(`plan.tools.whatif.views.${view}`) }}
			</span>
			<div class="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
				<span id="whatif-pct-label" class="text-sm text-muted">
					{{ t("plan.tools.whatif.pct_label") }}
				</span>
				<PButtonGroup role="group" aria-labelledby="whatif-pct-label">
					<PButton
						v-for="p in PCTS"
						:key="p"
						class="min-h-11 @[640px]:min-h-0"
						:pressed="pct === p"
						@click="setPct(p)">
						{{ t("plan.tools.whatif.pct", { pct: p }) }}
					</PButton>
				</PButtonGroup>
			</div>
		</div>

		<p v-if="!sensitivity.rows.length" class="text-muted py-6">
			{{ t("plan.tools.whatif.empty") }}
		</p>
		<div
			v-else
			class="grid grid-cols-[minmax(0,1fr)] @[1000px]:grid-cols-[minmax(0,1fr)_280px] gap-3 items-start">
			<div class="flex flex-col gap-2 min-w-0">
				<PDataTable
					:columns="columns"
					:data="shown"
					:row-key="rowKey"
					:min-width="640">
					<template #cell-ticker="{ row }">
						<span
							class="inline-block min-w-10 px-1 rounded-sm text-xs text-center font-bold"
							:class="chipClass(row.ticker)">
							{{ row.ticker }}
						</span>
					</template>
					<template #cell-side="{ row }">
						<span
							class="px-1.5 border border-white/20 rounded-sm text-xs text-muted-strong">
							{{ t(`plan.tools.whatif.side.${row.side}`) }}
						</span>
					</template>
					<template #cell-bar="{ row }">
						<PTooltip placement="top">
							<template #trigger>
								<PDivergingBar
									:value="impact(row)"
									:max-abs="maxAbs"
									mirror />
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
										{{ t("plan.tools.whatif.tooltip.value") }}
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
											t("plan.tools.whatif.tooltip.profit", {
												change: `${sign < 0 ? "−" : "+"}${pct} %`,
											})
										}}
									</span>
									<span class="tabular-nums">
										{{
											money(
												profit +
													(sign * row.slope * pct) / 100
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
							"plan.tools.whatif.more",
							{
								n: rest.length,
								tickers: rest.map((r) => r.ticker).join(", "),
								value: money(impact(rest[0])),
							},
							rest.length
						)
					}}
				</p>
				<p class="text-xs text-muted flex flex-wrap gap-x-6">
					<span>
						{{
							t("plan.tools.whatif.footnote.centre", {
								profit: money(profit),
							})
						}}
					</span>
					<span>{{ t("plan.tools.whatif.footnote.break_even") }}</span>
				</p>
			</div>

			<div
				v-if="top && adverse"
				class="flex flex-col gap-3 border border-white/10 rounded p-3 text-sm">
				<h3 class="font-bold text-white">
					{{ t("plan.tools.whatif.means.title") }}
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
									? "plan.tools.whatif.means.lower"
									: "plan.tools.whatif.means.higher",
								{
									pct,
									ticker: top.ticker,
									profit: money(adverse.profit),
								}
							)
						}}
						{{
							typeof top.breakEven === "number"
								? t("plan.tools.whatif.means.break_even", {
										change: signedPct(top.breakEven),
									})
								: top.breakEven === "never" && profit < 0
									? t("plan.tools.whatif.means.never_loss")
									: t(`plan.tools.whatif.means.${top.breakEven}`)
						}}
					</span>
				</p>
				<dl class="flex flex-col divide-y divide-white/10">
					<div class="flex justify-between gap-3 py-1.5">
						<dt>
							{{
								t("plan.tools.whatif.means.profit_if", {
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
								t("plan.tools.whatif.means.roi_if", {
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
							{{ t("plan.tools.whatif.means.all_costs", { pct }) }}
						</dt>
						<dd class="font-bold tabular-nums">
							{{ money(allCosts) }} ȼ
						</dd>
					</div>
					<div class="flex justify-between items-center gap-3 py-1.5">
						<dt>{{ t("plan.tools.whatif.means.most_sensitive") }}</dt>
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
</template>
