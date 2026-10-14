<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, ref } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { tooltipConfig } from "@/ui/styles";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import {
		compactNumber,
		lineLabelLayout,
		tooltipRows,
	} from "@/ui/charts/charts.util";
	import { niceTicks } from "@/ui/charts/scatter.util";

	// Types & Interfaces
	import type { ILineSeries } from "@/ui/charts/charts.types";

	// lines over days in SVG, px = viewBox so text stays 12 px. Direct labels
	// at the line ends (no legend), a crosshair tooltip with the series
	// sorted by value, and an optional volume panel on its own axis below.
	const {
		days,
		series,
		label,
		volume = [],
		volumeTitle = "",
		volumeUnit = "",
		volumeLabel = "",
	} = defineProps<{
		/** UTC midnight epochs (ms), one per value */
		days: number[];
		series: ILineSeries[];
		/** accessible name of the chart */
		label: string;
		/** one bar per day; empty hides the panel */
		volume?: number[];
		volumeTitle?: string;
		volumeUnit?: string;
		/** tooltip name of the volume */
		volumeLabel?: string;
	}>();

	const theme = useChartTheme();

	const box = ref<HTMLElement | null>(null);
	const width = ref(0);
	const height = ref(0);
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (!box.value) return;
		width.value = box.value.clientWidth;
		height.value = box.value.clientHeight;
		if (typeof ResizeObserver === "undefined") return;
		resize = new ResizeObserver(([entry]) => {
			width.value = entry.contentRect.width;
			height.value = entry.contentRect.height;
		});
		resize.observe(box.value);
	});

	const CHAR_PX = 7;
	const LABEL_GAP = 18;
	const SWATCH = 10;
	const hasVolume = computed(() => volume.some((v) => v > 0));

	// prices from 100 up and counts read as whole numbers, cheaper prices
	// keep the cents
	const endValue = (v: number) =>
		formatNumber(v, Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 2);

	/** the last value of every series, for its end label */
	const ends = computed(() =>
		series
			.map((s) => {
				const index = s.values.findLastIndex((v) => v != null);
				return index < 0
					? null
					: {
							series: s,
							index,
							text: `${s.label} ${endValue(s.values[index]!)}`,
						};
			})
			.filter((e) => e !== null)
	);

	// room for y ticks left, the widest end label right (never clipped),
	// x ticks below; the volume panel takes a fifth below the plot
	const layout = computed(() => {
		const labelWidth = Math.max(
			0,
			...ends.value.map((e) => e.text.length * CHAR_PX + SWATCH + 10)
		);
		const left = Math.max(
			36,
			...yTicks.value.map((v) => tickText.value(v).length * CHAR_PX + 12)
		);
		const right = labelWidth + 8;
		const bottom = 22;
		const volumeH = hasVolume.value
			? Math.max(40, Math.round(height.value * 0.18))
			: 0;
		const volumeGap = hasVolume.value ? 30 : 0;
		const top = 12;
		const plotH = Math.max(
			height.value - top - bottom - volumeH - volumeGap,
			0
		);
		return {
			x: left,
			w: Math.max(width.value - left - right, 0),
			y: top,
			h: plotH,
			volumeY: top + plotH + volumeGap,
			volumeH,
		};
	});

	const yTicks = computed(() => {
		const values = series.flatMap((s) =>
			s.values.filter((v): v is number => v != null)
		);
		return values.length
			? niceTicks(Math.min(...values), Math.max(...values))
			: [0, 1];
	});

	// as many decimals as the tick step needs, so ticks never repeat; k / M
	// once the step reaches a thousand
	const tickText = computed(() => {
		const [a, b] = yTicks.value;
		const step = b - a || 1;
		if (step >= 1000) return compactNumber;
		const decimals = [0, 1, 2, 3, 4].find(
			(d) => Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-6
		)!;
		return (v: number) => formatNumber(v, decimals ?? 4);
	});

	const sx = computed(() => {
		const { x, w } = layout.value;
		const n = Math.max(days.length - 1, 1);
		return (i: number) => x + (i / n) * w;
	});
	const sy = computed(() => {
		const { y, h } = layout.value;
		const lo = yTicks.value[0];
		const span = yTicks.value.at(-1)! - lo || 1;
		return (v: number) => y + h - ((v - lo) / span) * h;
	});

	const paths = computed(() =>
		series.map((s) => {
			let d = "";
			let pen = false;
			s.values.forEach((v, i) => {
				if (v == null) {
					pen = false;
					return;
				}
				d += `${pen ? "L" : "M"}${sx.value(i).toFixed(1)},${sy.value(v).toFixed(1)} `;
				pen = true;
			});
			return { key: s.key, color: s.color, d: d.trim() };
		})
	);

	// a day with a value but none on either side draws no line, so a dot
	// (rarely traded materials)
	const dots = computed(() =>
		series.flatMap((s) =>
			s.values.flatMap((v, i) =>
				v != null && s.values[i - 1] == null && s.values[i + 1] == null
					? [
							{
								key: `${s.key}${i}`,
								color: s.color,
								x: sx.value(i),
								y: sy.value(v),
							},
						]
					: []
			)
		)
	);

	const labels = computed(() => {
		const byKey = new Map(ends.value.map((e) => [e.series.key, e]));
		const { y, h } = layout.value;
		return lineLabelLayout(
			ends.value.map((e) => ({
				key: e.series.key,
				y: sy.value(e.series.values[e.index]!),
			})),
			LABEL_GAP,
			y + 6,
			y + h - 6
		).map((l) => ({ ...l, ...byKey.get(l.key)! }));
	});

	// date ticks, about one per 90 px; years once the range passes one
	const xTicks = computed(() => {
		const n = days.length;
		if (n < 2) return [];
		const count = Math.min(Math.max(2, Math.floor(layout.value.w / 90)), n);
		const long = days[n - 1] - days[0] > 366 * 86400000;
		const format = new Intl.DateTimeFormat("en-US", {
			timeZone: "UTC",
			month: "short",
			...(long ? { year: "2-digit" } : { day: "numeric" }),
		});
		return Array.from({ length: count }, (_, k) => {
			const i = Math.round((k / (count - 1)) * (n - 1));
			return {
				i,
				text: format.format(days[i]),
				anchor: k === 0 ? "start" : k === count - 1 ? "end" : "middle",
			};
		});
	});

	const volumeMax = computed(() => Math.max(...volume, 1));
	// the unit only where it fits beside the title (thins out on phones)
	const showVolumeUnit = computed(
		() =>
			(volumeTitle.length + volumeUnit.length) * CHAR_PX + 16 <=
			layout.value.w
	);
	const barWidth = computed(() =>
		Math.max(1, layout.value.w / Math.max(days.length, 1) - 1)
	);

	// crosshair: the nearest day under the pointer, or set by keys / a tap
	const index = ref<number | null>(null);
	const pinned = ref(false);

	function indexAt(event: PointerEvent): number {
		const rect = (event.currentTarget as Element).getBoundingClientRect();
		const { x, w } = layout.value;
		const ratio = (event.clientX - rect.left - x) / (w || 1);
		return Math.min(
			Math.max(Math.round(ratio * (days.length - 1)), 0),
			days.length - 1
		);
	}

	function move(event: PointerEvent) {
		if (event.pointerType === "touch" || pinned.value) return;
		index.value = indexAt(event);
	}

	function leave(event: PointerEvent) {
		if (event.pointerType === "touch" || pinned.value) return;
		index.value = null;
	}

	// a tap opens the tooltip, a second tap or one outside closes it
	function tap(event: PointerEvent) {
		if (event.pointerType !== "touch") return;
		const at = indexAt(event);
		if (pinned.value && index.value === at) return close();
		index.value = at;
		pinned.value = true;
		document.addEventListener("pointerdown", outside, true);
	}

	function outside(event: Event) {
		if (!box.value?.contains(event.target as Node)) close();
	}

	function close() {
		index.value = null;
		pinned.value = false;
		document.removeEventListener("pointerdown", outside, true);
	}

	function key(event: KeyboardEvent) {
		const last = days.length - 1;
		if (event.key === "Escape") return close();
		const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
		if (!step || last < 0) return;
		event.preventDefault();
		index.value = Math.min(
			Math.max((index.value ?? (step > 0 ? -1 : last + 1)) + step, 0),
			last
		);
	}

	const rows = computed(() =>
		index.value === null ? [] : tooltipRows(series, index.value)
	);
	const tooltipDate = computed(() =>
		index.value === null
			? ""
			: new Intl.DateTimeFormat("en-US", {
					timeZone: "UTC",
					month: "short",
					day: "numeric",
					year: "numeric",
				}).format(days[index.value])
	);
	// beside the crosshair, on the side with more room
	const TOOLTIP_W = 176;
	const tooltipStyle = computed(() => {
		if (index.value === null) return {};
		const x = sx.value(index.value);
		const left =
			x + 12 + TOOLTIP_W <= layout.value.x + layout.value.w
				? x + 12
				: Math.max(x - 12 - TOOLTIP_W, 0);
		return { left: `${left}px`, top: `${layout.value.y}px`, width: `${TOOLTIP_W}px` };
	});

	onBeforeUnmount(() => {
		resize?.disconnect();
		close();
	});
</script>

<template>
	<div ref="box" class="relative w-full h-full min-h-0">
		<svg
			v-if="width && height && days.length > 1"
			:width="width"
			:height="height"
			role="group"
			:aria-label="label"
			class="block select-none">
			<!-- grid, y ticks and date ticks -->
			<g class="text-xs" :fill="theme.muted">
				<g v-for="v in yTicks" :key="`y${v}`">
					<line
						:x1="layout.x"
						:x2="layout.x + layout.w"
						:y1="sy(v)"
						:y2="sy(v)"
						:stroke="theme.grid" />
					<text :x="layout.x - 8" :y="sy(v) + 4" text-anchor="end">
						{{ tickText(v) }}
					</text>
				</g>
				<line
					:x1="layout.x"
					:x2="layout.x + layout.w"
					:y1="layout.y + layout.h"
					:y2="layout.y + layout.h"
					:stroke="theme.axis" />
				<text
					v-for="t in xTicks"
					:key="`x${t.i}`"
					class="line-x-tick"
					:x="sx(t.i)"
					:y="height - 6"
					:text-anchor="t.anchor">
					{{ t.text }}
				</text>
			</g>

			<!-- lines, broken at missing days -->
			<path
				v-for="p in paths"
				:key="p.key"
				class="line-series"
				:d="p.d"
				fill="none"
				:stroke="p.color"
				stroke-width="2"
				stroke-linejoin="round" />
			<circle
				v-for="p in dots"
				:key="p.key"
				class="line-dot"
				:cx="p.x"
				:cy="p.y"
				r="2.5"
				:fill="p.color" />

			<!-- direct end labels in the right margin -->
			<g class="text-xs pointer-events-none">
				<g v-for="l in labels" :key="l.key" class="line-label">
					<line
						:x1="layout.x + layout.w + 6"
						:x2="layout.x + layout.w + 6 + SWATCH"
						:y1="l.y"
						:y2="l.y"
						:stroke="l.series.color"
						stroke-width="2" />
					<text
						:x="layout.x + layout.w + 10 + SWATCH"
						:y="l.y + 4"
						:fill="theme.ink">
						{{ l.text }}
					</text>
				</g>
			</g>

			<!-- volume panel: own axis, no dual y-axis -->
			<g v-if="hasVolume" class="line-volume">
				<text
					:x="layout.x"
					:y="layout.volumeY - 8"
					class="text-xs"
					:fill="theme.muted">
					{{ volumeTitle }}
				</text>
				<text
					v-if="showVolumeUnit"
					:x="layout.x + layout.w"
					:y="layout.volumeY - 8"
					text-anchor="end"
					class="text-xs"
					:fill="theme.muted">
					{{ volumeUnit }}
				</text>
				<text
					:x="layout.x - 8"
					:y="layout.volumeY + 10"
					text-anchor="end"
					class="text-xs"
					:fill="theme.muted">
					{{ compactNumber(volumeMax) }}
				</text>
				<rect
					v-for="(v, i) in volume"
					:key="i"
					:x="sx(i) - barWidth / 2"
					:y="layout.volumeY + layout.volumeH * (1 - v / volumeMax)"
					:width="barWidth"
					:height="layout.volumeH * (v / volumeMax)"
					:fill="i === index ? theme.ink : theme.muted"
					:fill-opacity="i === index ? 1 : 0.55" />
			</g>

			<!-- crosshair -->
			<g v-if="index !== null" class="pointer-events-none">
				<line
					:x1="sx(index)"
					:x2="sx(index)"
					:y1="layout.y"
					:y2="layout.y + layout.h"
					:stroke="theme.axis"
					stroke-dasharray="3 3" />
				<template v-for="s in series" :key="`dot${s.key}`">
					<circle
						v-if="s.values[index] != null"
						:cx="sx(index)"
						:cy="sy(s.values[index]!)"
						r="4"
						:fill="s.color" />
				</template>
			</g>

			<!-- pointer and keyboard target over plot and volume panel -->
			<rect
				class="line-hit outline-none focus-visible:stroke-(--chart-ink) focus-visible:stroke-2"
				tabindex="0"
				role="slider"
				:aria-label="label"
				:aria-valuemin="0"
				:aria-valuemax="days.length - 1"
				:aria-valuenow="index ?? days.length - 1"
				:aria-valuetext="tooltipDate || undefined"
				:x="0"
				:y="0"
				:width="layout.x + layout.w"
				:height="height"
				fill="transparent"
				@pointermove="move"
				@pointerleave="leave"
				@pointerdown="tap"
				@keydown="key"
				@blur="pinned || close()" />
		</svg>

		<div
			v-if="index !== null && rows.length"
			role="tooltip"
			class="line-tooltip absolute pointer-events-none text-xs tabular-nums"
			:class="tooltipConfig.tooltip"
			:style="tooltipStyle">
			<div class="text-muted pb-1">{{ tooltipDate }}</div>
			<div
				v-for="r in rows"
				:key="r.key"
				class="flex items-center gap-2">
				<span
					class="inline-block w-2.5 h-0.5"
					:style="{ background: r.color }" />
				<span class="grow">{{ r.label }}</span>
				<span class="font-bold">{{ formatNumber(r.value) }}</span>
			</div>
			<div
				v-if="hasVolume"
				class="mt-1 pt-1 border-t border-white/10 flex justify-between gap-2 text-muted">
				<span>{{ volumeLabel }}</span>
				<span>{{ formatNumber(volume[index] ?? 0, 0) }}</span>
			</div>
		</div>
	</div>
</template>
