<script setup lang="ts">
	// Components
	import RepairDueTag from "@/features/repair_analysis/components/RepairDueTag.vue";

	// Util
	import { REPAIR_DAY_MAX } from "@/features/repair_analysis/repairAnalysis.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IRepairBuilding } from "@/features/repair_analysis/useRepairAnalysis.types";

	// UI
	import { PButton, PInputNumber } from "@/ui";

	/**
	 * Every building type of the plan with its best interval, good range,
	 * the chosen interval and its profit. The last column is the next due
	 * date with a FIO site (`due`), else a good-range bar. `cards` lays the
	 * rows out as tappable cards for phones.
	 *
	 * @author jplacht
	 */
	const {
		buildings,
		intervals,
		selected = undefined,
		due = undefined,
		cards = false,
	} = defineProps<{
		buildings: IRepairBuilding[];
		intervals: Record<string, number>;
		selected?: string;
		/** days until the next due building per type, with a FIO site */
		due?: Record<string, number | undefined>;
		cards?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "select", ticker: string): void;
		(e: "update:interval", ticker: string, value: number): void;
		(e: "reset"): void;
	}>();

	const inRange = (b: IRepairBuilding) =>
		intervals[b.ticker] >= b.range[0] && intervals[b.ticker] <= b.range[1];
	const profit = (b: IRepairBuilding) => {
		const v = b.curve[intervals[b.ticker]].profit * b.amount;
		return (v > 0 ? "+" : "") + formatNumber(v, 0);
	};
	// 96 px range bar
	const rx = (day: number) => (day / REPAIR_DAY_MAX) * 96;
</script>

<template>
	<section
		:aria-label="$t('plan.tools.repair_analysis.list.title')"
		class="flex flex-col min-w-0"
		:class="
			cards ? 'gap-1.5' : 'bg-surface border border-line rounded-panel'
		">
		<div
			class="flex justify-between items-center gap-3"
			:class="cards ? '' : 'pt-3 pb-2.5 px-4'">
			<div class="flex flex-col">
				<h2 class="font-bold text-ink-strong">
					{{ $t("plan.tools.repair_analysis.list.title") }}
				</h2>
				<span class="text-xs text-muted">
					{{
						cards
							? $t("plan.tools.repair_analysis.list.hint_cards")
							: $t("plan.tools.repair_analysis.list.hint")
					}}
				</span>
			</div>
			<PButton type="secondary" @click="emit('reset')">
				{{ $t("plan.tools.repair_analysis.list.reset") }}
			</PButton>
		</div>

		<template v-if="cards">
			<button
				v-for="b in buildings"
				:key="b.ticker"
				type="button"
				class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 w-full min-h-11 py-2 px-3 text-start bg-surface border border-line rounded-panel hover:bg-hover cursor-pointer"
				data-testid="repair-building-card"
				@click="emit('select', b.ticker)">
				<span>
					<b class="text-ink-strong"
						>{{ b.amount }}× {{ b.ticker }}</b
					>
					<span class="ms-1 text-muted">{{ b.name }}</span>
				</span>
				<span>
					<RepairDueTag
						v-if="due?.[b.ticker] !== undefined"
						:days="due[b.ticker]!" />
				</span>
				<span class="text-sm text-muted-strong">
					{{
						$t("plan.tools.repair_analysis.list.card_interval", {
							day: intervals[b.ticker],
							best: b.best,
							from: b.range[0],
							to: b.range[1],
						})
					}}
				</span>
				<span class="text-sm text-muted-strong text-end">
					{{ profit(b) }}
				</span>
			</button>
		</template>

		<div v-else class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-surface-sunken text-muted text-xs text-start">
						<th class="py-1.5 pl-4 pr-1.5 font-medium text-start">
							{{ $t("plan.tools.repair_analysis.list.building") }}
						</th>
						<th class="p-1.5 font-medium text-end">
							{{ $t("plan.tools.repair_analysis.list.best") }}
						</th>
						<th class="p-1.5 font-medium text-start">
							{{ $t("plan.tools.repair_analysis.list.interval") }}
						</th>
						<th class="p-1.5 font-medium text-end">
							{{ $t("plan.tools.repair_analysis.per_day") }}
						</th>
						<th class="py-1.5 pr-4 pl-1.5 font-medium text-start">
							{{
								due
									? $t(
											"plan.tools.repair_analysis.list.next_due"
										)
									: $t(
											"plan.tools.repair_analysis.list.good_range"
										)
							}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="b in buildings"
						:key="b.ticker"
						class="border-t border-line"
						:class="
							b.ticker === selected
								? 'bg-selected'
								: 'hover:bg-hover'
						"
						data-testid="repair-building-row">
						<td class="py-1 pl-4 pr-1.5">
							<button
								type="button"
								class="touch-target flex flex-col items-start cursor-pointer -my-0.5 -mx-1 py-0.5 px-1 rounded-control text-start leading-tight"
								:aria-pressed="b.ticker === selected"
								@click="emit('select', b.ticker)">
								<span class="font-bold text-ink-strong">
									{{ b.amount }}× {{ b.ticker }}
								</span>
								<span class="text-xs text-muted">{{
									b.name
								}}</span>
							</button>
						</td>
						<td class="p-1.5 text-end text-nowrap">
							{{
								$t("plan.tools.repair_analysis.n_d", {
									n: b.best,
								})
							}}
							<span class="text-xs text-muted">
								({{ b.range[0] }}–{{ b.range[1] }})
							</span>
						</td>
						<td class="p-1.5">
							<PInputNumber
								:value="intervals[b.ticker]"
								:min="1"
								:max="REPAIR_DAY_MAX"
								show-buttons
								class="w-24"
								:status="inRange(b) ? undefined : 'warning'"
								:aria-label="
									$t(
										'plan.tools.repair_analysis.list.interval_label',
										{ ticker: b.ticker }
									)
								"
								@update:value="
									(v) =>
										v &&
										emit('update:interval', b.ticker, v)
								" />
						</td>
						<td class="p-1.5 text-end text-nowrap">
							{{ profit(b) }}
						</td>
						<td class="py-1.5 pr-4 pl-1.5">
							<template v-if="due">
								<RepairDueTag
									v-if="due[b.ticker] !== undefined"
									:days="due[b.ticker]!" />
								<span v-else class="text-muted">—</span>
							</template>
							<svg
								v-else
								width="96"
								height="16"
								viewBox="0 0 96 16"
								class="block"
								role="img"
								:aria-label="
									$t(
										b.range[0] === b.range[1]
											? 'plan.tools.repair_analysis.charts.good_one'
											: 'plan.tools.repair_analysis.charts.good',
										{
											from: b.range[0],
											to: b.range[1],
										}
									)
								">
								<rect
									x="0"
									y="7"
									width="96"
									height="2"
									class="fill-line-strong" />
								<rect
									:x="rx(b.range[0])"
									y="3"
									:width="
										Math.max(
											2,
											rx(b.range[1]) - rx(b.range[0])
										)
									"
									height="10"
									rx="2"
									class="fill-positive/35" />
								<rect
									:x="rx(intervals[b.ticker]) - 0.75"
									y="0"
									width="1.5"
									height="16"
									class="fill-ink-strong" />
								<circle
									:cx="rx(b.best)"
									cy="8"
									r="3.5"
									class="fill-positive stroke-surface"
									stroke-width="1.5" />
							</svg>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>
