<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		useSlots,
	} from "vue";

	// a bar from a shared zero line: negative left, positive right. maxAbs
	// is the right half's extent, negAbs the left one's (default maxAbs), so
	// rows with the same extents share the zero line. A #center slot (e.g. a
	// ticker tile) sits between the halves instead of the zero line. text
	// sits inside the bar when it is wide enough, else beside it.
	const {
		value,
		maxAbs,
		negAbs = undefined,
		label,
		text = "",
	} = defineProps<{
		value: number;
		maxAbs: number;
		negAbs?: number;
		label: string;
		text?: string;
	}>();

	const slots = useSlots();

	// without a measured width (no ResizeObserver): text inside from this
	// share of its half
	const INSIDE_PCT = 35;
	// 12 px tabular digits plus the bar's padding
	const CHAR_PX = 7.5;
	const PAD_PX = 8;

	const leftEl = ref<HTMLElement | null>(null);
	const rightEl = ref<HTMLElement | null>(null);
	const widths = ref({ left: 0, right: 0 });
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (typeof ResizeObserver === "undefined") return;
		resize = new ResizeObserver(() => {
			widths.value = {
				left: leftEl.value?.clientWidth ?? 0,
				right: rightEl.value?.clientWidth ?? 0,
			};
		});
		if (leftEl.value) resize.observe(leftEl.value);
		if (rightEl.value) resize.observe(rightEl.value);
	});
	onBeforeUnmount(() => resize?.disconnect());

	const left = computed(() => negAbs ?? maxAbs);
	const half = computed(() => (value < 0 ? left.value : maxAbs));
	const pct = computed(() =>
		half.value > 0 ? Math.min(Math.abs(value) / half.value, 1) * 100 : 0
	);
	// text beside the bar: the bar gives way so both stay in the half
	const barWidth = computed(() =>
		text && !inside.value
			? `min(${pct.value}%, calc(100% - ${text.length * CHAR_PX + 4}px))`
			: `${pct.value}%`
	);

	// inside only when the text fits the bar's width
	const inside = computed(() => {
		const halfPx = value < 0 ? widths.value.left : widths.value.right;
		if (!halfPx) return pct.value >= INSIDE_PCT;
		return (pct.value / 100) * halfPx >= text.length * CHAR_PX + PAD_PX;
	});
</script>

<template>
	<div role="img" :aria-label="label" class="flex items-center min-w-0">
		<div
			ref="leftEl"
			class="flex justify-end items-center min-w-0"
			:style="{ flex: `${left} 1 0%` }">
			<template v-if="value < 0">
				<span
					v-if="text && !inside"
					class="pr-1 text-xs text-negative tabular-nums whitespace-nowrap">
					{{ text }}
				</span>
				<div
					data-bar
					class="flex items-center justify-end rounded-l-sm bg-negative"
					:class="text ? 'h-[18px]' : 'h-2.5'"
					:style="{ width: barWidth }">
					<span
						v-if="text && inside"
						class="px-1 text-xs text-black/90 tabular-nums whitespace-nowrap">
						{{ text }}
					</span>
				</div>
			</template>
		</div>
		<div v-if="slots.center" class="shrink-0 px-1">
			<slot name="center" />
		</div>
		<div
			ref="rightEl"
			class="flex items-center min-w-0"
			:class="slots.center ? '' : 'border-l border-(--chart-axis) py-0.5'"
			:style="{ flex: `${maxAbs} 1 0%` }">
			<template v-if="value > 0">
				<div
					data-bar
					class="flex items-center rounded-r-sm bg-positive"
					:class="text ? 'h-[18px]' : 'h-2.5'"
					:style="{ width: barWidth }">
					<span
						v-if="text && inside"
						class="px-1 text-xs text-black/90 tabular-nums whitespace-nowrap">
						{{ text }}
					</span>
				</div>
				<span
					v-if="text && !inside"
					class="pl-1 text-xs text-positive tabular-nums whitespace-nowrap">
					{{ text }}
				</span>
			</template>
		</div>
	</div>
</template>
