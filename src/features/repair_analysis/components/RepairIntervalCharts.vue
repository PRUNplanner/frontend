<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		type Ref,
		useId,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { useTooltipTrigger } from "@/ui/useTooltipTrigger";

	// Util
	import {
		REPAIR_DAY_MAX,
		repairEfficiency,
	} from "@/features/repair_analysis/repairAnalysis.util";
	import { clamp, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IRepairBuilding } from "@/features/repair_analysis/useRepairAnalysis.types";

	// UI
	import { tooltipConfig } from "@/ui/styles";

	/**
	 * Three panels on one x axis (days between repairs): profit per day
	 * with the good range, the trade-off between repair cost and output
	 * lost to wear, and the building condition. `ages` are the player's
	 * buildings today (FIO), drawn as markers.
	 *
	 * @author jplacht
	 */
	const { building, interval, ages = [] } = defineProps<{
		building: IRepairBuilding;
		interval: number;
		ages?: number[];
	}>();

	const theme = useChartTheme();
	const clipId = useId();

	// the viewBox follows the element's width, text keeps its size
	const root: Ref<HTMLElement | null> = ref(null);
	const width = ref(760);
	let observer: ResizeObserver | undefined;
	onMounted(() => {
		if (typeof ResizeObserver !== "function" || !root.value) return;
		observer = new ResizeObserver(([entry]) => {
			width.value = Math.max(280, Math.round(entry.contentRect.width));
		});
		observer.observe(root.value);
	});
	onBeforeUnmount(() => observer?.disconnect());

	const compact = computed(() => width.value < 520);
	const X0 = 40;
	// room for the centred "180" tick label
	const x1 = computed(() => width.value - 14);
	const xs = (day: number) =>
		X0 + (Math.min(day, REPAIR_DAY_MAX) / REPAIR_DAY_MAX) * (x1.value - X0);

	const P = computed(() => ({ top: 6, h: compact.value ? 132 : 158 }));
	const T = computed(() => ({ top: 4, h: compact.value ? 96 : 120 }));
	const C = { top: 6, h: 52 };

	/** round axis bounds and up to n + 1 ticks */
	function nice(lo: number, hi: number, n: number) {
		if (hi - lo <= 0) hi = lo + 1;
		const raw = (hi - lo) / n;
		const p = Math.pow(10, Math.floor(Math.log10(raw)));
		const f = raw / p;
		const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
		const a = Math.floor(lo / step) * step;
		const b = Math.ceil(hi / step) * step;
		const ticks: number[] = [];
		for (let v = a; v <= b + step / 1000; v += step) ticks.push(v);
		return { a, b, ticks };
	}

	const short = (v: number) =>
		Math.abs(v) >= 1000
			? `${formatNumber(v / 1000, 1, true)}k`
			: formatNumber(v, 0);
	const signed = (v: number) => (v > 0 ? "+" : "") + formatNumber(v, 0);

	function line(values: number[], y: (v: number) => number): string {
		let d = "";
		for (let day = 1; day <= REPAIR_DAY_MAX; day++)
			d += `${day === 1 ? "M" : "L"}${xs(day).toFixed(1)} ${clamp(y(values[day]), -1000, 2000).toFixed(1)} `;
		return d;
	}

	const best = computed(() => building.best);
	const band = computed(() => ({
		x: xs(building.range[0]),
		w: Math.max(2, xs(building.range[1]) - xs(building.range[0])),
	}));
	// the range label stays inside the plot, also for a range at an end
	const goodX = computed(() =>
		clamp(band.value.x + band.value.w / 2, X0 + 50, x1.value - 50)
	);

	// profit of all buildings of the type
	const profit = computed(() =>
		building.curve.map((e) => e.profit * building.amount)
	);
	const profitAxis = computed(() => {
		const v = profit.value;
		let mn = Infinity;
		let mx = -Infinity;
		for (let d = 8; d <= REPAIR_DAY_MAX; d++) {
			mn = Math.min(mn, v[d]);
			mx = Math.max(mx, v[d]);
		}
		// zoom to the plateau, the curve may leave through the bottom
		const lo = v[best.value] > 0 ? Math.max(mn, v[best.value] * 0.55) : mn;
		return nice(lo, mx + (mx - lo) * 0.06, 3);
	});
	const ys = (v: number) => {
		const { a, b } = profitAxis.value;
		return P.value.top + P.value.h - ((v - a) / (b - a)) * P.value.h;
	};

	const tradeoff = computed(() => {
		const n = building.amount;
		const lost = building.split.map((s) => s.lostOutput * n);
		const repair = building.split.map((s) => s.repairPerDay * n);
		const total = lost.map((l, i) => l + repair[i]);
		// the total's minimum at 40 % height; the repair cost stays in view,
		// also for a building whose output is worth nothing or less
		let lo = 0;
		let hi = total[best.value] * 2.6;
		for (let d = 8; d <= REPAIR_DAY_MAX; d++) {
			lo = Math.min(lo, lost[d], total[d]);
			hi = Math.max(hi, repair[d]);
		}
		return { lost, repair, total, axis: nice(lo, hi, 2) };
	});
	const yt = (v: number) => {
		const { a, b } = tradeoff.value.axis;
		return T.value.top + T.value.h - ((v - a) / (b - a)) * T.value.h;
	};

	type Anchor = "start" | "middle" | "end";
	interface ILabel {
		x: number;
		y: number;
		anchor: Anchor;
	}
	// ponytail: fixed label width, 12 px text of about 11 characters
	const LABEL_W = 68;
	function overlaps(a: ILabel, b: ILabel): boolean {
		const left = (l: ILabel) =>
			l.anchor === "end"
				? l.x - LABEL_W
				: l.anchor === "middle"
					? l.x - LABEL_W / 2
					: l.x;
		return (
			Math.abs(left(a) - left(b)) < LABEL_W && Math.abs(a.y - b.y) < 15
		);
	}
	const inPlot = (l: ILabel) =>
		l.y > T.value.top + 12 && l.y < T.value.top + T.value.h - 2;

	// line labels next to their lines, clear of each other
	const tradeoffLabels = computed(() => {
		const { lost, repair, total } = tradeoff.value;
		let lostDay = best.value;
		while (lostDay < 179 && yt(lost[lostDay]) > T.value.top + 26) lostDay++;
		// near the right edge the label goes left of its point
		const lostLabel: ILabel =
			lostDay > 120
				? { x: xs(lostDay) - 8, y: yt(lost[lostDay]) + 4, anchor: "end" }
				: { x: xs(lostDay) + 8, y: yt(lost[lostDay]) + 4, anchor: "start" };

		const candidates = [compact.value ? 150 : 160, 100, 60].flatMap(
			(day): ILabel[] => [
				{ x: xs(day), y: yt(repair[day]) - 8, anchor: "middle" },
				{ x: xs(day), y: yt(repair[day]) + 18, anchor: "middle" },
			]
		);
		const repairLabel =
			candidates.find((c) => inPlot(c) && !overlaps(c, lostLabel)) ??
			candidates[0];

		let totalDay = 1;
		while (totalDay < best.value && yt(total[totalDay]) < T.value.top + 30)
			totalDay++;
		const totalLabel: ILabel = {
			x: xs(totalDay) + 10,
			y: yt(total[totalDay]) + 4,
			anchor: "start",
		};

		return { repair: repairLabel, lost: lostLabel, total: totalLabel };
	});

	const yc = (e: number) => C.top + C.h - ((e - 0.33) / 0.67) * C.h;
	const conditionPath = computed(() => {
		let d = "";
		for (let day = 0; day <= REPAIR_DAY_MAX; day++)
			d += `${day === 0 ? "M" : "L"}${xs(day).toFixed(1)} ${yc(repairEfficiency(day)).toFixed(1)} `;
		return d;
	});

	const markers = computed(() => [...new Set(ages)]);

	// tooltip: the day under the pointer, else the chosen interval
	const trigger: Ref<HTMLElement | null> = ref(null);
	const panel: Ref<HTMLElement | null> = ref(null);
	const { open, id, triggerEvents, panelEvents } = useTooltipTrigger(
		trigger,
		panel
	);
	const pointerDay: Ref<number | null> = ref(null);
	let pointerAt = 0;

	function onPointer(e: PointerEvent): void {
		pointerAt = Date.now();
		const rect = trigger.value?.getBoundingClientRect();
		if (!rect?.width) return;
		const x = ((e.clientX - rect.left) / rect.width) * width.value;
		const day = Math.round(((x - X0) / (x1.value - X0)) * REPAIR_DAY_MAX);
		pointerDay.value = Math.min(REPAIR_DAY_MAX, Math.max(1, day));
	}

	// keyboard focus shows the chosen interval; the focus that follows a
	// tap keeps the tapped day
	function onFocus(): void {
		if (Date.now() - pointerAt > 800) pointerDay.value = null;
	}

	const tipDay = computed(() => pointerDay.value ?? interval);

	// "good 30–45 d", or "good 30 d" for a single day
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
	const tip = computed(() => {
		const day = tipDay.value;
		const delta = profit.value[day] - profit.value[best.value];
		return {
			day,
			profit: signed(profit.value[day]),
			delta: day === best.value ? undefined : signed(delta),
			left: `${(xs(day) / width.value) * 100}%`,
			right: xs(day) / width.value < 0.6,
		};
	});

	const xLabels = [0, 30, 60, 90, 120, 150, 180];
</script>

<template>
	<div ref="root" class="flex flex-col gap-0.5 min-w-0 text-xs">
		<!-- profit per day -->
		<div class="flex justify-between flex-wrap gap-x-3">
			<span class="text-sm font-bold text-ink-strong">
				{{ $t("plan.tools.repair_analysis.charts.profit_title") }}
			</span>
			<span v-if="markers.length" class="text-muted">
				▲ {{ $t("plan.tools.repair_analysis.charts.fio_legend") }}
			</span>
		</div>
		<div
			ref="trigger"
			class="relative"
			tabindex="0"
			role="img"
			:aria-label="
				$t('plan.tools.repair_analysis.charts.profit_label', {
					best: building.best,
					from: building.range[0],
					to: building.range[1],
				})
			"
			data-testid="repair-profit-chart"
			v-on="triggerEvents"
			@pointermove="onPointer"
			@pointerdown="onPointer"
			@focusin="onFocus">
			<svg
				:viewBox="`0 0 ${width} ${P.top + P.h + 6}`"
				class="block w-full h-auto"
				aria-hidden="true">
				<defs>
					<clipPath :id="`${clipId}-p`">
						<rect :x="X0" :y="P.top" :width="x1 - X0" :height="P.h" />
					</clipPath>
					<clipPath :id="`${clipId}-t`">
						<rect :x="X0" :y="T.top" :width="x1 - X0" :height="T.h" />
					</clipPath>
				</defs>
				<rect
					:x="band.x"
					:y="P.top"
					:width="band.w"
					:height="P.h"
					:fill="theme.positive"
					fill-opacity="0.1" />
				<g :stroke="theme.grid">
					<path
						v-for="v in profitAxis.ticks"
						:key="v"
						:d="`M${X0} ${ys(v)} H${x1}`" />
				</g>
				<g :fill="theme.muted" text-anchor="end" font-size="11">
					<text
						v-for="v in profitAxis.ticks"
						:key="v"
						:x="X0 - 6"
						:y="ys(v) + 4">
						{{ short(v) }}
					</text>
				</g>
				<text
					:x="goodX"
					:y="P.top + 12"
					:fill="theme.positive"
					font-size="11"
					font-weight="500"
					text-anchor="middle">
					{{ goodLabel }}
				</text>
				<path
					:d="`M${X0} ${P.top + P.h} H${x1}`"
					:stroke="theme.axis" />
				<path
					:d="line(profit, ys)"
					fill="none"
					:stroke="theme.positive"
					stroke-width="2.5"
					stroke-linejoin="round"
					:clip-path="`url(#${clipId}-p)`" />
				<path
					v-for="age in markers"
					:key="age"
					:d="`M${xs(age) - 5} ${P.top + P.h} L${xs(age) + 5} ${P.top + P.h} L${xs(age)} ${P.top + P.h - 9} Z`"
					:fill="theme.ink"
					class="repair-fio-marker" />
				<path
					:d="`M${xs(interval)} ${P.top} V${P.top + P.h}`"
					:stroke="theme.ink"
					stroke-opacity="0.55"
					stroke-dasharray="4 4" />
				<circle
					:cx="xs(best)"
					:cy="ys(profit[best])"
					r="5"
					:fill="theme.surface"
					:stroke="theme.positive"
					stroke-width="2.5" />
				<circle
					:cx="xs(interval)"
					:cy="Math.min(Math.max(ys(profit[interval]), P.top), P.top + P.h)"
					r="5"
					:fill="theme.ink" />
			</svg>
			<div
				v-if="open"
				:id="id"
				ref="panel"
				role="tooltip"
				:class="tooltipConfig.tooltip"
				class="absolute top-2 whitespace-nowrap pointer-events-none"
				:style="{
					left: tip.left,
					transform: tip.right
						? 'translateX(12px)'
						: 'translateX(calc(-100% - 12px))',
				}"
				v-on="panelEvents">
				<b class="block">
					{{
						$t("plan.tools.repair_analysis.charts.tip_every", {
							day: tip.day,
							profit: tip.profit,
						})
					}}
				</b>
				<span class="block text-muted-strong">
					{{
						tip.delta === undefined
							? $t("plan.tools.repair_analysis.charts.tip_best")
							: $t("plan.tools.repair_analysis.charts.tip_delta", {
									delta: tip.delta,
									best: building.best,
								})
					}}
				</span>
			</div>
		</div>

		<!-- trade-off -->
		<div class="flex justify-between flex-wrap gap-x-3 mt-2">
			<span class="text-sm font-bold text-ink-strong">
				{{
					$t("plan.tools.repair_analysis.charts.tradeoff_title", {
						best: building.best,
					})
				}}
			</span>
			<span class="text-muted">
				{{ $t("plan.tools.repair_analysis.charts.tradeoff_hint") }}
			</span>
		</div>
		<svg
			:viewBox="`0 0 ${width} ${T.top + T.h + 6}`"
			class="block w-full h-auto"
			aria-hidden="true">
			<rect
				:x="band.x"
				:y="T.top"
				:width="band.w"
				:height="T.h"
				:fill="theme.positive"
				fill-opacity="0.08" />
			<g :stroke="theme.grid">
				<path
					v-for="v in tradeoff.axis.ticks"
					:key="v"
					:d="`M${X0} ${yt(v)} H${x1}`" />
			</g>
			<g :fill="theme.muted" text-anchor="end" font-size="11">
				<text
					v-for="v in tradeoff.axis.ticks"
					:key="v"
					:x="X0 - 6"
					:y="yt(v) + 4">
					{{ short(v) }}
				</text>
			</g>
			<path :d="`M${X0} ${T.top + T.h} H${x1}`" :stroke="theme.axis" />
			<g fill="none" stroke-width="2" :clip-path="`url(#${clipId}-t)`">
				<path
					:d="line(tradeoff.repair, yt)"
					:stroke="theme.exchange('CI1')" />
				<path
					:d="line(tradeoff.lost, yt)"
					:stroke="theme.exchange('AI1')" />
				<path
					:d="line(tradeoff.total, yt)"
					:stroke="theme.ink"
					stroke-width="2.5" />
			</g>
			<g font-size="12" font-weight="500">
				<text
					:x="tradeoffLabels.repair.x"
					:y="tradeoffLabels.repair.y"
					:fill="theme.exchange('CI1')"
					:text-anchor="tradeoffLabels.repair.anchor">
					{{ $t("plan.tools.repair_analysis.charts.repair_cost") }}
				</text>
				<text
					:x="tradeoffLabels.lost.x"
					:y="tradeoffLabels.lost.y"
					:text-anchor="tradeoffLabels.lost.anchor"
					:fill="theme.exchange('AI1')">
					{{ $t("plan.tools.repair_analysis.charts.lost_output") }}
				</text>
				<text
					:x="tradeoffLabels.total.x"
					:y="tradeoffLabels.total.y"
					:fill="theme.ink"
					font-weight="700">
					{{ $t("plan.tools.repair_analysis.charts.total") }}
				</text>
			</g>
			<path
				:d="`M${xs(interval)} ${T.top} V${T.top + T.h}`"
				:stroke="theme.ink"
				stroke-opacity="0.55"
				stroke-dasharray="4 4" />
			<circle
				:cx="xs(best)"
				:cy="yt(tradeoff.total[best])"
				r="4.5"
				:fill="theme.surface"
				:stroke="theme.positive"
				stroke-width="2.5" />
		</svg>

		<!-- condition -->
		<div class="flex justify-between flex-wrap gap-x-3 mt-2">
			<span class="text-sm font-bold text-ink-strong">
				{{ $t("plan.tools.repair_analysis.charts.condition_title") }}
			</span>
			<span v-if="markers.length" class="text-muted">
				● {{ $t("plan.tools.repair_analysis.charts.fio_legend") }}
			</span>
		</div>
		<svg
			:viewBox="`0 0 ${width} ${C.top + C.h + 22}`"
			class="block w-full h-auto"
			aria-hidden="true">
			<rect
				:x="band.x"
				:y="C.top"
				:width="band.w"
				:height="C.h"
				:fill="theme.positive"
				fill-opacity="0.08" />
			<path :d="`M${X0} ${C.top} H${x1}`" :stroke="theme.grid" />
			<path :d="`M${X0} ${C.top + C.h} H${x1}`" :stroke="theme.axis" />
			<g :fill="theme.muted" text-anchor="end" font-size="11">
				<text :x="X0 - 6" :y="C.top + 4">100 %</text>
				<text :x="X0 - 6" :y="C.top + C.h + 4">33 %</text>
			</g>
			<path
				:d="conditionPath"
				fill="none"
				:stroke="theme.ink"
				stroke-opacity="0.6"
				stroke-width="2" />
			<path
				:d="`M${xs(interval)} ${C.top} V${C.top + C.h}`"
				:stroke="theme.ink"
				stroke-opacity="0.55"
				stroke-dasharray="4 4" />
			<circle
				v-for="age in markers"
				:key="age"
				:cx="xs(age)"
				:cy="yc(repairEfficiency(age))"
				r="4.5"
				:fill="theme.ink"
				:stroke="theme.surface"
				stroke-width="1.5"
				class="repair-fio-dot" />
			<g :fill="theme.muted" font-size="11" text-anchor="middle">
				<text
					v-for="d in xLabels"
					:key="d"
					:x="xs(d)"
					:y="C.top + C.h + 16">
					{{ d }}
				</text>
			</g>
		</svg>
		<span class="self-end text-muted">
			{{ $t("plan.tools.repair_analysis.charts.x_axis") }}
		</span>
	</div>
</template>
