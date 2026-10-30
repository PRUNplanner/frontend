<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import RepairIntervalCharts from "@/features/repair_analysis/components/RepairIntervalCharts.vue";
	import RepairMaterialList from "@/features/repair_analysis/components/RepairMaterialList.vue";

	// Util
	import {
		REPAIR_DAY_MAX,
		repairEfficiency,
	} from "@/features/repair_analysis/repairAnalysis.util";
	import { formatNumber, signed } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IRepairBuilding,
		IRepairMaterialList,
	} from "@/features/repair_analysis/useRepairAnalysis.types";

	// UI
	import { PButton, PInputNumber } from "@/ui";
	import { ChevronLeftSharp } from "@vicons/material";

	/**
	 * One building type: what its interval earns and costs, the interval
	 * control (field, slider, presets), the charts, and the materials for
	 * one repair of all its buildings. The #fio slot sits beside them.
	 *
	 * @author jplacht
	 */
	const {
		building,
		interval,
		materials,
		ages = [],
		back = false,
	} = defineProps<{
		building: IRepairBuilding;
		interval: number;
		materials: IRepairMaterialList;
		ages?: number[];
		/** phone: a back button to the list */
		back?: boolean;
	}>();

	const emit = defineEmits<{
		(
			e: "update:interval",
			value: number,
			source: "input" | "slider" | "preset"
		): void;
		(e: "back"): void;
	}>();

	const inRange = computed(
		() => interval >= building.range[0] && interval <= building.range[1]
	);
	const profit = computed(
		() => building.curve[interval].profit * building.amount
	);
	const delta = computed(
		() =>
			profit.value -
			building.curve[building.best].profit * building.amount
	);

	const condition = computed(() => {
		let sum = 0;
		for (let d = 0; d <= interval; d++) sum += repairEfficiency(d);
		return {
			atRepair: repairEfficiency(interval) * 100,
			average: (sum / (interval + 1)) * 100,
		};
	});

	const presets = computed(() => [
		{
			day: building.best,
			label: t("plan.tools.repair_analysis.detail.preset_best", {
				n: building.best,
			}),
			best: true,
		},
		...[30, 60, 90].map((day) => ({
			day,
			label: t("plan.tools.repair_analysis.n_d", { n: day }),
			best: false,
		})),
	]);

	// slider track positions, 1..180
	const pct = (day: number) => ((day - 1) / (REPAIR_DAY_MAX - 1)) * 100;
	// centred on the range, clear of the "1" and "180" end labels: half the
	// caption plus an end label
	const goodLeft = computed(
		() =>
			`clamp(76px, ${(pct(building.range[0]) + pct(building.range[1])) / 2}%, calc(100% - 76px))`
	);
	const goodLabel = computed(() =>
		building.range[0] === building.range[1]
			? t("plan.tools.repair_analysis.charts.good_one", {
					from: building.range[0],
				})
			: t("plan.tools.repair_analysis.charts.good", {
					from: building.range[0],
					to: building.range[1],
				})
	);

	function onField(value: number | null | undefined): void {
		if (value) emit("update:interval", value, "input");
	}
	function onSlider(e: Event): void {
		emit(
			"update:interval",
			Number((e.target as HTMLInputElement).value),
			"slider"
		);
	}
</script>

<template>
	<section
		:aria-label="$t('plan.tools.repair_analysis.detail.label')"
		class="flex flex-col gap-2.5 min-w-0 p-3 md:px-4.5 bg-surface border border-line rounded-panel">
		<div class="flex justify-between items-end flex-wrap gap-x-6 gap-y-2">
			<div class="flex items-center gap-3">
				<PButton
					v-if="back"
					type="ghost"
					:aria-label="$t('plan.tools.repair_analysis.detail.back')"
					@click="emit('back')">
					<template #icon>
						<ChevronLeftSharp />
					</template>
				</PButton>
				<div class="flex flex-col">
					<h2 class="text-lg font-bold text-ink-strong">
						{{ building.amount }}× {{ building.ticker }}
					</h2>
					<span class="text-xs text-muted">
						{{
							$t("plan.tools.repair_analysis.detail.subtitle", {
								name: building.name,
								n: building.amount,
							})
						}}
					</span>
				</div>
			</div>
			<div class="grid grid-cols-3 sm:flex gap-x-7 gap-y-2">
				<div class="flex flex-col">
					<span class="text-xs text-muted">
						{{
							$t(
								"plan.tools.repair_analysis.detail.profit_every",
								{
									day: interval,
								}
							)
						}}
					</span>
					<span>
						<b class="text-lg text-positive">{{
							signed(profit, 0)
						}}</b>
						<span class="text-xs text-muted">
							{{ $t("plan.tools.repair_analysis.per_day") }}
						</span>
					</span>
					<span
						class="text-xs"
						:class="
							inRange
								? 'text-muted-strong'
								: 'text-warning font-medium'
						"
						data-testid="repair-detail-delta">
						{{
							interval === building.best
								? $t(
										"plan.tools.repair_analysis.detail.is_best"
									)
								: inRange
									? $t(
											"plan.tools.repair_analysis.detail.in_range",
											{ delta: signed(delta, 0) }
										)
									: $t(
											"plan.tools.repair_analysis.detail.vs_best",
											{
												delta: signed(delta, 0),
												best: building.best,
											}
										)
						}}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted">
						{{ $t("plan.tools.repair_analysis.detail.bill") }}
					</span>
					<span>
						<b class="text-lg text-ink-strong">
							{{ formatNumber(materials.cost, 0) }}
						</b>
						<span class="text-xs text-muted"> ȼ</span>
					</span>
					<span class="text-xs text-muted-strong">
						{{ formatNumber(materials.weight, 1) }} t ·
						{{ formatNumber(materials.volume, 1) }} m³
					</span>
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted">
						{{ $t("plan.tools.repair_analysis.detail.condition") }}
					</span>
					<b class="text-lg text-ink-strong">
						{{ formatNumber(condition.atRepair, 1) }} %
					</b>
					<span class="text-xs text-muted-strong">
						{{
							$t("plan.tools.repair_analysis.detail.avg_output", {
								pct: formatNumber(condition.average, 1),
							})
						}}
					</span>
				</div>
			</div>
		</div>

		<div
			class="flex items-center flex-wrap gap-x-4 gap-y-2 py-2 px-3 border border-line rounded-panel">
			<div class="flex items-center gap-2">
				<span class="font-bold text-ink-strong text-nowrap">
					{{ $t("plan.tools.repair_analysis.detail.repair_every") }}
				</span>
				<PInputNumber
					:value="interval"
					:min="1"
					:max="REPAIR_DAY_MAX"
					show-buttons
					class="w-26"
					:status="inRange ? undefined : 'warning'"
					:aria-label="
						$t('plan.tools.repair_analysis.detail.interval_label')
					"
					@update:value="onField" />
				<span class="text-muted-strong">
					{{ $t("plan.tools.repair_analysis.detail.days") }}
				</span>
			</div>
			<div class="flex flex-col grow basis-56 min-w-45">
				<div class="relative h-7 pointer-coarse:h-11">
					<div
						class="absolute inset-x-2.25 top-1/2 -translate-y-1/2 h-1.5"
						aria-hidden="true">
						<div
							class="absolute inset-0 rounded-full bg-white/12" />
						<div
							class="absolute inset-y-0 rounded-full bg-positive/55"
							:style="{
								left: `${pct(building.range[0])}%`,
								width: `${pct(building.range[1]) - pct(building.range[0])}%`,
							}" />
						<div
							class="absolute -top-1.5 w-0.5 h-4.5 bg-positive"
							:style="{ left: `${pct(building.best)}%` }" />
					</div>
					<input
						class="repair-slider"
						type="range"
						min="1"
						:max="REPAIR_DAY_MAX"
						step="1"
						:value="interval"
						:aria-label="
							$t(
								'plan.tools.repair_analysis.detail.interval_label'
							)
						"
						:aria-valuetext="
							$t('plan.tools.repair_analysis.detail.n_days', {
								n: interval,
							})
						"
						@input="onSlider" />
				</div>
				<div
					class="relative h-3.5 mx-2.25 text-xs text-muted"
					aria-hidden="true">
					<span class="absolute left-0">1</span>
					<span
						class="absolute -translate-x-1/2 text-nowrap text-positive"
						:style="{
							left: goodLeft,
						}">
						{{ goodLabel }}
					</span>
					<span class="absolute right-0">{{ REPAIR_DAY_MAX }}</span>
				</div>
			</div>
			<div
				role="group"
				:aria-label="$t('plan.tools.repair_analysis.detail.presets')"
				class="flex flex-wrap gap-1.5 max-sm:w-full max-sm:justify-between">
				<PButton
					v-for="p in presets"
					:key="`${p.best}-${p.day}`"
					:pressed="interval === p.day"
					@click="emit('update:interval', p.day, 'preset')">
					{{ p.label }}
				</PButton>
			</div>
		</div>

		<RepairIntervalCharts
			:building="building"
			:interval="interval"
			:ages="ages" />

		<div class="flex flex-wrap gap-x-5 gap-y-3 pt-2.5 border-t border-line">
			<div class="flex-[1_1_280px] min-w-0">
				<slot name="fio" />
			</div>
			<RepairMaterialList
				class="flex-[1_1_280px]"
				:list="materials"
				:limit="back ? 6 : undefined"
				:title="
					$t('plan.tools.repair_analysis.detail.materials_title', {
						n: building.amount,
						day: interval,
					})
				" />
		</div>
	</section>
</template>

<style scoped>
	.repair-slider {
		appearance: none;
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}
	.repair-slider::-webkit-slider-runnable-track {
		height: 6px;
		background: transparent;
	}
	.repair-slider::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		margin-top: -6px;
		border-radius: 50%;
		background: var(--color-positive);
		border: 3px solid var(--color-surface);
		box-shadow: 0 0 0 1px var(--color-positive);
	}
	.repair-slider::-moz-range-track {
		height: 6px;
		background: transparent;
	}
	.repair-slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-positive);
		border: 3px solid var(--color-surface);
	}
</style>
