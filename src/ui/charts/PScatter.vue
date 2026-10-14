<script setup lang="ts">
	import {
		computed,
		nextTick,
		onBeforeUnmount,
		onMounted,
		ref,
		shallowRef,
		useId,
	} from "vue";

	// Util
	import { createFloating } from "@/ui/popper";
	import { formatNumber } from "@/util/numbers";
	import { tooltipConfig } from "@/ui/styles";
	import { Z_TOOLTIP } from "@/ui/zIndex";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import {
		belowLabelX,
		niceTicks,
		placeLabels,
	} from "@/ui/charts/scatter.util";

	// Types & Interfaces
	import type {
		IScatterDot,
		IScatterPoint,
		IScatterSegment,
	} from "@/ui/charts/scatter.types";

	// x/y scatter in SVG, px = viewBox so text stays 12 px. The frontier keys
	// get a step line with the beaten area (right, below) shaded. A click
	// emits select, a double-click open (the click waits for it).
	const {
		points,
		xTitle,
		yTitle,
		label,
		frontier = [],
		maxLabels = 40,
		yBetter = "high",
		xZero = true,
	} = defineProps<{
		points: IScatterPoint[];
		xTitle: string;
		yTitle: string;
		/** accessible name of the chart */
		label: string;
		/** keys of the best trade-off points */
		frontier?: string[];
		/** above this many points only emphasised and ringed dots get labels */
		maxLabels?: number;
		/** which way Y is better, e.g. "low" for jumps; sets the frontier's side */
		yBetter?: "high" | "low";
		/** x axis from 0 (default), else fitted to the data, e.g. ROI days */
		xZero?: boolean;
	}>();

	/** hovered or focused point, shared with e.g. a list beside the chart */
	const active = defineModel<string | null>("active", { default: null });

	const emit = defineEmits<{
		(e: "select", key: string): void;
		(e: "open", key: string): void;
	}>();

	defineSlots<{
		tooltip(props: { point: IScatterPoint }): unknown;
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

	// plot area inside the svg: room for y ticks left, x ticks and title below
	const M = { top: 24, right: 16, bottom: 44, left: 48 };
	const CHAR_PX = 7;
	const coarse =
		typeof window.matchMedia === "function" &&
		window.matchMedia("(pointer: coarse)").matches;

	const xTicks = computed(() => {
		const xs = points.map((p) => p.x);
		return !xZero && xs.length
			? niceTicks(Math.min(...xs), Math.max(...xs))
			: niceTicks(0, Math.max(...xs, 1));
	});
	const yTicks = computed(() => {
		const ys = points.map((p) => p.y);
		return ys.length ? niceTicks(Math.min(...ys), Math.max(...ys)) : [0, 1];
	});
	const plot = computed(() => ({
		x: M.left,
		y: M.top,
		w: Math.max(width.value - M.left - M.right, 0),
		h: Math.max(height.value - M.top - M.bottom, 0),
	}));

	function scale(ticks: number[], from: number, length: number, flip: boolean) {
		const lo = ticks[0];
		const span = ticks.at(-1)! - lo || 1;
		return (v: number) =>
			flip
				? from + length - ((v - lo) / span) * length
				: from + ((v - lo) / span) * length;
	}
	const sx = computed(() =>
		scale(xTicks.value, plot.value.x, plot.value.w, false)
	);
	const sy = computed(() =>
		scale(yTicks.value, plot.value.y, plot.value.h, true)
	);

	const dots = computed(() =>
		points.map((p) => ({
			point: p,
			cx: sx.value(p.x),
			cy: sy.value(p.y),
			r: p.size === undefined ? 6 : 5 + 6 * p.size,
		}))
	);
	// emphasised dots on top; the order never follows the active dot or a
	// pin, as moving a focused element blurs it (rings get their own layer)
	const drawn = computed(() =>
		[...dots.value].sort(
			(a, b) => Number(!!a.point.emphasis) - Number(!!b.point.emphasis)
		)
	);
	const ringed = computed(() => dots.value.filter((d) => d.point.ring));
	const activeDot = computed(() =>
		dots.value.find((d) => d.point.key === active.value)
	);

	const frontierPx = computed(() => {
		const byKey = new Map(dots.value.map((d) => [d.point.key, d]));
		return frontier
			.map((k) => byKey.get(k))
			.filter((d) => d !== undefined)
			.sort((a, b) => a.cx - b.cx);
	});
	// the beaten side's edge: the floor, or the top when lower Y is better
	const edge = computed(() =>
		yBetter === "low" ? plot.value.y : plot.value.y + plot.value.h
	);
	// from the first frontier dot to the floor (the top when lower Y is
	// better), then step right and on through the others to the right edge
	const steps = computed((): IScatterSegment[] => {
		const f = frontierPx.value;
		if (!f.length) return [];
		const floor = edge.value;
		const right = plot.value.x + plot.value.w;
		const segs: IScatterSegment[] = [[f[0].cx, floor, f[0].cx, f[0].cy]];
		f.forEach((d, i) => {
			const next = f[i + 1];
			if (!next) segs.push([d.cx, d.cy, right, d.cy]);
			else
				segs.push(
					[d.cx, d.cy, next.cx, d.cy],
					[next.cx, d.cy, next.cx, next.cy]
				);
		});
		return segs;
	});
	const stepPath = computed(() =>
		steps.value
			.map(([x1, y1, x2, y2], i) =>
				i === 0 ? `M${x1},${y1} L${x2},${y2}` : `L${x2},${y2}`
			)
			.join(" ")
	);
	const shadePath = computed(() =>
		steps.value.length
			? `${stepPath.value} L${plot.value.x + plot.value.w},${edge.value} Z`
			: ""
	);

	const labels = computed(() => {
		const wanted = dots.value
			.filter(
				(d) =>
					points.length <= maxLabels ||
					d.point.emphasis ||
					d.point.ring
			)
			.sort(
				(a, b) =>
					Number(!!b.point.emphasis || !!b.point.ring) -
					Number(!!a.point.emphasis || !!a.point.ring)
			);
		const px: IScatterDot[] = dots.value.map((d) => ({
			key: d.point.key,
			cx: d.cx,
			cy: d.cy,
			r: d.r,
		}));
		// ponytail: width estimated per character, measure if labels clip
		// inside the plot, clear of the tick labels and titles
		const area = {
			x: plot.value.x + 2,
			y: plot.value.y,
			w: plot.value.w - 2,
			h: plot.value.h,
		};
		const textWidth = (d: (typeof wanted)[number]) =>
			d.point.label.length * CHAR_PX;
		const sides = placeLabels(
			px,
			wanted.map((d) => ({
				key: d.point.key,
				width: textWidth(d),
				// a frontier label may sit on the step line rather than hide
				crossLines: !!d.point.emphasis,
			})),
			steps.value,
			area
		);
		return wanted.flatMap((d) => {
			const side = sides[d.point.key];
			if (!side) return [];
			const gap = d.r + 4;
			return [
				{
					key: d.point.key,
					text: d.point.label,
					bold: !!d.point.emphasis || !!d.point.ring,
					x:
						side === "right"
							? d.cx + gap
							: side === "left"
								? d.cx - gap
								: belowLabelX(d.cx, textWidth(d), area) +
									textWidth(d) / 2,
					y:
						side === "below"
							? d.cy + d.r + 13
							: side === "above"
								? d.cy - d.r - 5
								: d.cy + 4,
					anchor:
						side === "right"
							? "start"
							: side === "left"
								? "end"
								: "middle",
				},
			];
		});
	});

	const tick = (v: number) => formatNumber(v, 1, true);

	/*
	 * Tooltip: hover and focus show it, a tap toggles it
	 */
	const tipId = useId();
	const shown = ref<string | null>(null);
	const shownPoint = computed(() =>
		points.find((p) => p.key === shown.value)
	);
	const tooltipRef = ref<HTMLElement | null>(null);
	const anchor = shallowRef<Element | null>(null);
	let floating: { destroy: () => void } | null = null;

	async function show(key: string, event: Event) {
		if (shown.value === key) return;
		hide();
		active.value = key;
		shown.value = key;
		anchor.value = event.currentTarget as Element;
		await nextTick();
		if (anchor.value && tooltipRef.value)
			floating = createFloating(anchor.value, tooltipRef.value, "top", 8);
	}

	function hide() {
		floating?.destroy();
		floating = null;
		shown.value = null;
		active.value = null;
		document.removeEventListener("pointerdown", outside, true);
	}

	function outside(event: Event) {
		if (!(event.target as Element).closest?.(".scatter-dot")) hide();
	}

	let clickTimer: ReturnType<typeof setTimeout> | undefined;
	function click(key: string, event: MouseEvent) {
		if (event.detail > 1) return;
		// a tap fires mouseenter first, so it only ever shows; a tap
		// elsewhere closes it
		const touch = (event as PointerEvent).pointerType === "touch" || coarse;
		if (touch) {
			show(key, event);
			document.addEventListener("pointerdown", outside, true);
		}
		clearTimeout(clickTimer);
		// a keyboard click (detail 0) can't become a double-click
		if (event.detail === 0) return emit("select", key);
		clickTimer = setTimeout(() => emit("select", key), 250);
	}

	function dblclick(key: string) {
		clearTimeout(clickTimer);
		emit("open", key);
	}

	onBeforeUnmount(() => {
		resize?.disconnect();
		clearTimeout(clickTimer);
		hide();
	});
</script>

<template>
	<div ref="box" class="relative w-full h-full min-h-0">
		<svg
			v-if="width && height"
			:width="width"
			:height="height"
			role="group"
			:aria-label="label"
			class="block select-none overflow-visible">
			<!-- grid and ticks -->
			<g class="text-xs" :fill="theme.muted">
				<g v-for="v in yTicks" :key="`y${v}`">
					<line
						:x1="plot.x"
						:x2="plot.x + plot.w"
						:y1="sy(v)"
						:y2="sy(v)"
						:stroke="theme.grid" />
					<text :x="plot.x - 8" :y="sy(v) + 4" text-anchor="end">
						{{ tick(v) }}
					</text>
				</g>
				<g v-for="v in xTicks" :key="`x${v}`">
					<line
						:x1="sx(v)"
						:x2="sx(v)"
						:y1="plot.y"
						:y2="plot.y + plot.h"
						:stroke="theme.grid" />
					<text
						:x="sx(v)"
						:y="plot.y + plot.h + 18"
						text-anchor="middle">
						{{ tick(v) }}
					</text>
				</g>
				<line
					:x1="plot.x"
					:x2="plot.x + plot.w"
					:y1="plot.y + plot.h"
					:y2="plot.y + plot.h"
					:stroke="theme.axis" />
				<line
					:x1="plot.x"
					:x2="plot.x"
					:y1="plot.y"
					:y2="plot.y + plot.h"
					:stroke="theme.axis" />
				<text :x="plot.x" :y="12">{{ yTitle }}</text>
				<text
					:x="plot.x + plot.w"
					:y="plot.y + plot.h + 36"
					text-anchor="end">
					{{ xTitle }}
				</text>
			</g>

			<!-- best trade-off: shade the beaten area, dashed step line -->
			<g v-if="steps.length" class="scatter-frontier">
				<path :d="shadePath" :fill="theme.ink" fill-opacity="0.03" />
				<path
					:d="stepPath"
					fill="none"
					:stroke="theme.positive"
					stroke-width="1.5"
					stroke-dasharray="5 4" />
			</g>

			<!-- dots -->
			<g
				v-for="d in drawn"
				:key="d.point.key"
				role="button"
				tabindex="0"
				class="scatter-dot cursor-pointer outline-none"
				:aria-label="d.point.label"
				:aria-describedby="shown === d.point.key ? tipId : undefined"
				@mouseenter="show(d.point.key, $event)"
				@mouseleave="hide"
				@focus="show(d.point.key, $event)"
				@blur="hide"
				@click="click(d.point.key, $event)"
				@dblclick="dblclick(d.point.key)"
				@keydown.enter.prevent="emit('select', d.point.key)"
				@keydown.space.prevent="emit('select', d.point.key)"
				@keydown.esc="hide">
				<!-- a finger needs 44 px, a mouse 24; half a px over, as the svg may scale -->
				<circle
					:cx="d.cx"
					:cy="d.cy"
					:r="coarse ? 22.5 : Math.max(d.r + 3, 12.5)"
					fill="transparent" />
				<circle
					:cx="d.cx"
					:cy="d.cy"
					:r="d.r"
					:fill="d.point.color ?? theme.muted"
					stroke="none" />
			</g>

			<!-- pin rings and the active dot's highlight, above the dots -->
			<circle
				v-for="d in ringed"
				:key="`ring${d.point.key}`"
				class="scatter-ring pointer-events-none"
				:cx="d.cx"
				:cy="d.cy"
				:r="d.r + 3"
				fill="none"
				:stroke="theme.ink"
				stroke-width="2" />
			<circle
				v-if="activeDot"
				class="scatter-active pointer-events-none"
				:cx="activeDot.cx"
				:cy="activeDot.cy"
				:r="activeDot.r"
				fill="none"
				:stroke="theme.ink"
				stroke-width="2" />

			<!-- labels, placed around the dots -->
			<g class="text-xs pointer-events-none" :fill="theme.ink">
				<text
					v-for="l in labels"
					:key="l.key"
					:x="l.x"
					:y="l.y"
					:text-anchor="l.anchor"
					:font-weight="l.bold ? 700 : 400">
					{{ l.text }}
				</text>
			</g>
		</svg>
	</div>

	<Teleport v-if="shownPoint" to="body">
		<div
			:id="tipId"
			ref="tooltipRef"
			role="tooltip"
			class="pointer-events-none"
			:style="{ zIndex: Z_TOOLTIP }"
			:class="tooltipConfig.tooltip">
			<slot name="tooltip" :point="shownPoint" />
		</div>
	</Teleport>
</template>
