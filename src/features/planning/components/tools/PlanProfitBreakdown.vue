<script lang="ts">
	import { ref } from "vue";
	import type { ProfitBreakdownMode } from "@/features/planning/util/profitBreakdown.types";

	// module scope: the mode survives closing and reopening the tool
	const mode = ref<ProfitBreakdownMode>("cost_type");
</script>

<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { profitBreakdown } from "@/features/planning/util/profitBreakdown.util";
	import { topWithOther } from "@/ui/charts/charts.util";
	import { formatNumber, formatPercent } from "@/util/numbers";

	// Components
	import PWaterfall from "@/ui/charts/PWaterfall.vue";

	// Types & Interfaces
	import type {
		IMaterialIO,
		IOverviewData,
		IProductionBuilding,
	} from "@/features/planning/usePlanCalculation.types";
	import type { IProfitBreakdownItem } from "@/features/planning/util/profitBreakdown.types";
	import type {
		IWaterfallColumn,
		IWaterfallSegment,
	} from "@/ui/charts/charts.types";

	// UI
	import { PButton, PButtonGroup } from "@/ui";

	const { t } = useI18n();

	const props = defineProps<{
		materialIO: IMaterialIO[];
		workforceMaterialIO: IMaterialIO[];
		buildings: IProductionBuilding[];
		overview: IOverviewData;
	}>();

	const { materialsMap, getMaterialClass } = useMaterialData();

	const breakdown = computed(() =>
		profitBreakdown(
			props.materialIO,
			props.workforceMaterialIO,
			props.buildings,
			props.overview
		)
	);

	const MODES: ProfitBreakdownMode[] = ["cost_type", "building"];
	function setMode(value: ProfitBreakdownMode): void {
		if (mode.value === value) return;
		mode.value = value;
		trackEvent("plan:profit_breakdown_mode", { mode: value });
	}

	const MORE = "\u0000more";
	const chipClass = (ticker: string) =>
		materialsMap.value[ticker] ? getMaterialClass(ticker) : undefined;

	// the 3 largest, the rest as "+n more"
	function segments(
		items: IProfitBreakdownItem[],
		material = true
	): IWaterfallSegment[] {
		return topWithOther(
			items.map((i) => ({ name: i.key, value: i.value })),
			3,
			(n) => `${MORE}${n}`
		).map((s) =>
			s.name.startsWith(MORE)
				? {
						key: MORE,
						label: t("plan.tools.profit_breakdown.more", {
							n: s.name.slice(MORE.length),
						}),
						value: s.value,
					}
				: {
						key: s.name,
						label: s.name,
						value: s.value,
						chipClass: material ? chipClass(s.name) : undefined,
					}
		);
	}

	const label = (key: string) =>
		t(`plan.tools.profit_breakdown.steps.${key}`);

	const degradationColumn = computed<IWaterfallColumn>(() => ({
		key: "degradation",
		label: label("degradation"),
		kind: "step",
		value: -breakdown.value.degradation,
		tone: "hatched",
		segments: [],
	}));
	const profitColumn = computed<IWaterfallColumn>(() => ({
		key: "profit",
		label: label("profit"),
		kind: "total",
		value: breakdown.value.profit,
		tone: breakdown.value.profit >= 0 ? "positive" : "negative",
		segments: [],
	}));

	// at most this many building steps, the rest summed into one
	const TOP_BUILDINGS = 7;

	const columns = computed<IWaterfallColumn[]>(() => {
		const b = breakdown.value;
		if (mode.value === "cost_type")
			return [
				{
					key: "output",
					label: label("output"),
					kind: "total",
					value: b.output,
					tone: "neutral",
					segments: segments(b.outputItems),
				},
				{
					key: "inputs",
					label: label("inputs"),
					kind: "step",
					value: -b.inputs,
					tone: "negative",
					segments: segments(b.inputItems),
				},
				{
					key: "workforce",
					label: label("workforce"),
					kind: "step",
					value: -b.workforce,
					tone: "negative",
					segments: segments(b.workforceItems),
				},
				degradationColumn.value,
				profitColumn.value,
			];

		const buildings = topWithOther(
			b.buildings.map((i) => ({ name: i.key, value: i.value })),
			TOP_BUILDINGS,
			(n) => `${MORE}${n}`
		).sort((x, y) => y.value - x.value);

		return [
			...buildings.map((i): IWaterfallColumn => ({
				key: `building:${i.name}`,
				label: i.name.startsWith(MORE)
					? t("plan.tools.profit_breakdown.more_buildings", {
							n: i.name.slice(MORE.length),
						})
					: i.name,
				kind: "step",
				value: i.value,
				tone: i.value >= 0 ? "neutral" : "negative",
				segments: [],
			})),
			...(Math.abs(b.unattributed) >= 0.01
				? [
						{
							key: "unattributed",
							label: label("unattributed"),
							kind: "step",
							value: b.unattributed,
							tone: b.unattributed >= 0 ? "neutral" : "negative",
							segments: [],
						} as IWaterfallColumn,
					]
				: []),
			degradationColumn.value,
			profitColumn.value,
		];
	});

	const isEmpty = computed(
		() =>
			breakdown.value.output === 0 &&
			breakdown.value.inputs + breakdown.value.workforce === 0
	);

	/*
	 * Tooltip
	 */

	const share = (value: number) =>
		formatPercent((Math.abs(value) / breakdown.value.output) * 100, 1);
	const money = (value: number) => `${formatNumber(value)} ȼ`;

	const STEP_ITEMS = {
		output: "outputItems",
		inputs: "inputItems",
		workforce: "workforceItems",
	} as const;

	function tooltipItem(
		column: IWaterfallColumn,
		segment: IWaterfallSegment
	): IProfitBreakdownItem | undefined {
		const items =
			column.key in STEP_ITEMS
				? breakdown.value[
						STEP_ITEMS[column.key as keyof typeof STEP_ITEMS]
					]
				: [];
		return items.find((i) => i.key === segment.key);
	}

	/*
	 * Key figures
	 */

	const costs = computed(
		() =>
			breakdown.value.inputs +
			breakdown.value.workforce +
			breakdown.value.degradation
	);
	const largestCost = computed(
		() =>
			[
				...breakdown.value.inputItems,
				...breakdown.value.workforceItems,
			].sort((a, b) => b.value - a.value)[0]
	);
	const workforceTickers = computed(() =>
		breakdown.value.workforceItems
			.slice(0, 2)
			.map((i) => i.key)
			.join(", ")
	);
</script>

<template>
	<div class="@container flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h2 class="text-white/80 font-bold text-lg">
				{{ t("plan.tools.profit_breakdown.title") }}
			</h2>
			<span class="text-sm text-muted">
				{{ t("plan.tools.profit_breakdown.subtitle") }}
			</span>
			<PButtonGroup
				class="ml-auto"
				role="group"
				:aria-label="t('plan.tools.profit_breakdown.mode_label')">
				<PButton
					v-for="m in MODES"
					:key="m"
					:pressed="mode === m"
					@click="setMode(m)">
					{{ t(`plan.tools.profit_breakdown.mode.${m}`) }}
				</PButton>
			</PButtonGroup>
		</div>

		<p v-if="isEmpty" class="text-muted py-6">
			{{ t("plan.tools.profit_breakdown.empty") }}
		</p>
		<div
			v-else
			class="grid grid-cols-[minmax(0,1fr)] @[900px]:grid-cols-[minmax(0,1fr)_260px] gap-3">
			<div class="sm:border sm:border-white/10 sm:rounded sm:p-3 pt-8">
				<PWaterfall
					:columns="columns"
					:label="t('plan.tools.profit_breakdown.title')">
					<template #tooltip="{ column, segment }">
						<div class="flex flex-col gap-1 min-w-48">
							<div class="font-bold">
								{{ segment.label || column.label }}
								<span
									v-if="materialsMap[segment.key]"
									class="font-normal text-muted">
									{{ materialsMap[segment.key].name }}
								</span>
							</div>
							<template
								v-for="item in [tooltipItem(column, segment)]"
								:key="String(item?.key)">
								<div
									v-if="item?.amount !== undefined"
									class="flex justify-between gap-4">
									<span class="text-muted">
										{{
											t(
												column.key === "output"
													? "plan.tools.profit_breakdown.tooltip.produced"
													: "plan.tools.profit_breakdown.tooltip.consumed"
											)
										}}
									</span>
									<span class="tabular-nums">
										{{ formatNumber(item.amount) }}
									</span>
								</div>
								<div
									v-if="item?.price !== undefined"
									class="flex justify-between gap-4">
									<span class="text-muted">
										{{
											t(
												"plan.tools.profit_breakdown.tooltip.price"
											)
										}}
									</span>
									<span class="tabular-nums">
										{{ money(item.price) }}
									</span>
								</div>
							</template>
							<div class="flex justify-between gap-4">
								<span class="text-muted">
									{{
										t(
											"plan.tools.profit_breakdown.tooltip.per_day"
										)
									}}
								</span>
								<span class="tabular-nums">
									{{
										money(
											segment.label
												? Math.sign(column.value) *
														segment.value
												: column.value
										)
									}}
								</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted">
									{{
										t(
											"plan.tools.profit_breakdown.tooltip.share"
										)
									}}
								</span>
								<span class="tabular-nums">
									{{ share(segment.value) }}
								</span>
							</div>
							<p
								v-if="column.key === 'unattributed'"
								class="text-xs text-muted max-w-60">
								{{
									t(
										"plan.tools.profit_breakdown.tooltip.unattributed"
									)
								}}
							</p>
						</div>
					</template>
				</PWaterfall>
			</div>

			<div
				class="flex flex-col gap-3 border border-white/10 rounded p-3 text-sm">
				<h3 class="font-bold text-white">
					{{ t("plan.tools.profit_breakdown.key_figures.title") }}
				</h3>
				<dl class="flex flex-col divide-y divide-white/10">
					<div class="flex justify-between py-1.5">
						<dt>
							{{
								t(
									"plan.tools.profit_breakdown.key_figures.output"
								)
							}}
						</dt>
						<dd class="font-bold tabular-nums">
							{{ money(breakdown.output) }}
						</dd>
					</div>
					<div class="flex justify-between py-1.5">
						<dt>
							{{
								t(
									"plan.tools.profit_breakdown.key_figures.costs"
								)
							}}
						</dt>
						<dd class="font-bold tabular-nums">
							{{ money(costs) }}
						</dd>
					</div>
					<div class="flex justify-between py-1.5">
						<dt>
							{{
								t(
									"plan.tools.profit_breakdown.key_figures.margin"
								)
							}}
						</dt>
						<dd
							class="font-bold tabular-nums"
							:class="
								breakdown.profit >= 0
									? 'text-positive'
									: 'text-negative'
							">
							{{
								formatPercent(
									(breakdown.profit / breakdown.output) * 100,
									1
								)
							}}
						</dd>
					</div>
				</dl>
				<ul class="flex flex-col gap-2">
					<li v-if="breakdown.outputItems[0]" class="flex gap-2">
						<span
							class="shrink-0 h-fit px-1 rounded-sm text-[10px] font-bold"
							:class="
								chipClass(breakdown.outputItems[0].key) ??
								'bg-black/40'
							">
							{{ breakdown.outputItems[0].key }}
						</span>
						<span>
							{{
								t(
									"plan.tools.profit_breakdown.key_figures.earner",
									{
										share: share(
											breakdown.outputItems[0].value
										),
									}
								)
							}}
						</span>
					</li>
					<li v-if="largestCost" class="flex gap-2">
						<span
							class="shrink-0 h-fit px-1 rounded-sm text-[10px] font-bold"
							:class="
								chipClass(largestCost.key) ?? 'bg-black/40'
							">
							{{ largestCost.key }}
						</span>
						<span>
							{{
								t(
									"plan.tools.profit_breakdown.key_figures.cost",
									{
										share: share(largestCost.value),
									}
								)
							}}
						</span>
					</li>
					<li v-if="breakdown.workforce > 0">
						{{
							t(
								"plan.tools.profit_breakdown.key_figures.workforce",
								{
									tickers: workforceTickers,
									share: share(breakdown.workforce),
								}
							)
						}}
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
