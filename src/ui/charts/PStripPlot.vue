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
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Util
	import { createFloating } from "@/ui/popper";
	import { formatNumber } from "@/util/numbers";
	import { tooltipConfig } from "@/ui/styles";
	import { chartZone, stripLayout } from "@/ui/charts/charts.util";

	// Types & Interfaces
	import type { IChartZone, IStripItem } from "@/ui/charts/charts.types";

	// one dot per value on a 0..axis line with red and yellow zones; values
	// beyond the axis are counted in "+n". The tooltip slot gets the items
	// of the hovered, focused or tapped dot (one) or of "+n" (all beyond).
	const { items, axis, red, yellow, label } = defineProps<{
		items: IStripItem[];
		axis: number;
		red: number;
		yellow: number;
		label: string;
	}>();

	defineSlots<{
		tooltip(props: { items: IStripItem[] }): unknown;
	}>();

	// lanes split by at least a dot (11 px) and a pixel, in days on this strip
	const DOT_GAP_PX = 12;
	const track = ref<HTMLElement | null>(null);
	const trackWidth = ref(0);
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (typeof ResizeObserver === "undefined" || !track.value) return;
		resize = new ResizeObserver(([entry]) => {
			trackWidth.value = entry.contentRect.width;
		});
		resize.observe(track.value);
	});

	const layout = computed(() =>
		stripLayout(
			items,
			axis,
			Math.max(
				axis / 25,
				trackWidth.value ? (DOT_GAP_PX * axis) / trackWidth.value : 0
			)
		)
	);
	const zoneWidth = (to: number) =>
		`${(Math.min(Math.max(to, 0), axis) / axis) * 100}%`;

	const DOT_CLASS: Record<IChartZone, string> = {
		red: "bg-negative",
		yellow: "bg-warning",
		none: "bg-white/70",
	};
	const LANE_TOP = { up: "30%", mid: "50%", down: "70%" } as const;

	// "+n" uses this key
	const OVER = "\u0000over";
	// a finger covers this square (px); a tap lists every dot under it
	const FINGER_PX = 45;
	const tipId = useId();
	const active = ref<string | null>(null);
	const activeKeys = ref<string[]>([]);
	const activeItems = computed<IStripItem[]>(() =>
		active.value === OVER
			? layout.value.over
			: layout.value.dots.filter((d) => activeKeys.value.includes(d.key))
	);
	const tooltipRef = ref<HTMLElement | null>(null);
	const anchor = shallowRef<HTMLElement | null>(null);
	let floating: { destroy: () => void } | null = null;

	async function show(key: string, event: Event, keys = [key]) {
		const id = keys.join("\u0000");
		if (active.value === id) return;
		hide();
		active.value = id;
		activeKeys.value = keys;
		anchor.value = event.currentTarget as HTMLElement;
		await nextTick();
		if (anchor.value && tooltipRef.value)
			floating = createFloating(anchor.value, tooltipRef.value, "top", 8);
	}

	// with a mouse or the keyboard a dot shows itself; dots sit closer than a
	// finger, so a tap shows every dot under it instead of a neighbour's
	function tap(key: string, event: MouseEvent) {
		const type = (event as PointerEvent).pointerType;
		const touch =
			type === "touch" ||
			(type === undefined &&
				window.matchMedia?.("(pointer: coarse)").matches === true);
		if (!touch || !track.value) return show(key, event);

		const near = [
			...track.value.querySelectorAll<HTMLElement>("[data-key]"),
		]
			.filter((el) => {
				const r = el.getBoundingClientRect();
				return (
					Math.abs(r.left + r.width / 2 - event.clientX) <=
						FINGER_PX / 2 &&
					Math.abs(r.top + r.height / 2 - event.clientY) <=
						FINGER_PX / 2
				);
			})
			.map((el) => el.dataset.key!);
		return show(key, event, near.includes(key) ? near : [key, ...near]);
	}

	function hide() {
		floating?.destroy();
		floating = null;
		active.value = null;
		activeKeys.value = [];
	}

	onBeforeUnmount(() => {
		resize?.disconnect();
		hide();
	});
</script>

<template>
	<div class="flex items-center gap-x-2" role="group" :aria-label="label">
		<!-- inset by half a dot, so dots at 0 and at the axis end stay inside -->
		<div class="grow min-w-28 h-7 px-1.5">
			<div ref="track" class="relative h-full">
				<div
					class="absolute inset-y-0 left-0 bg-negative/15"
					:style="{ width: zoneWidth(red) }" />
				<div
					class="absolute inset-y-0 bg-warning/15"
					:style="{
						left: zoneWidth(red),
						width: `calc(${zoneWidth(yellow)} - ${zoneWidth(red)})`,
					}" />
				<div class="absolute inset-x-0 top-1/2 h-px bg-white/20" />
				<button
					v-for="dot in layout.dots"
					:key="dot.key"
					:data-key="dot.key"
					type="button"
					class="absolute size-2.75 -translate-1/2 rounded-full pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:size-11.25 pointer-coarse:after:-translate-1/2 pointer-coarse:after:content-['']"
					:class="[
						DOT_CLASS[chartZone(dot.value, red, yellow)],
						activeKeys.includes(dot.key)
							? 'ring-2 ring-white z-10'
							: '',
					]"
					:style="{ left: `${dot.pct}%`, top: LANE_TOP[dot.lane] }"
					:aria-label="
						t('common.ui.strip.dot', {
							label: dot.key,
							value: formatNumber(dot.value, 1),
						})
					"
					:aria-describedby="
						activeKeys.includes(dot.key) ? tipId : undefined
					"
					@mouseenter="show(dot.key, $event)"
					@mouseleave="hide"
					@focus="show(dot.key, $event)"
					@blur="hide"
					@click="tap(dot.key, $event)"
					@keydown.esc="hide" />
			</div>
		</div>
		<button
			v-if="layout.over.length"
			type="button"
			class="shrink-0 min-w-7 min-h-7 pointer-coarse:min-w-11 pointer-coarse:min-h-11 text-xs text-muted text-right hover:text-white"
			:class="active === OVER ? 'text-white' : ''"
			:aria-label="t('common.ui.strip.over', { n: layout.over.length })"
			:aria-describedby="active === OVER ? tipId : undefined"
			@mouseenter="show(OVER, $event)"
			@mouseleave="hide"
			@focus="show(OVER, $event)"
			@blur="hide"
			@click="show(OVER, $event)"
			@keydown.esc="hide">
			+{{ layout.over.length }}
		</button>
		<span v-else class="shrink-0 size-7 pointer-coarse:size-11" />
	</div>

	<Teleport v-if="active" to="body">
		<div
			:id="tipId"
			ref="tooltipRef"
			role="tooltip"
			class="z-9999 pointer-events-none"
			:class="tooltipConfig.tooltip">
			<slot name="tooltip" :items="activeItems" />
		</div>
	</Teleport>
</template>
