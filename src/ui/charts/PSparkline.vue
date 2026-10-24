<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { sparklineLayout } from "@/ui/charts/charts.util";

	// a line of recent values, 24 px high, with its own y-scale (direction
	// only) or a shared domain; gaps break the line, lone values are dots,
	// the end dot shows the trend's sign or the line's colour
	const {
		points,
		trend,
		label,
		domain = undefined,
		color = undefined,
		width = 100,
	} = defineProps<{
		points: (number | null)[];
		/** trend in %, neutral when it rounds to 0 % (as the Trend columns) */
		trend: number;
		/** accessible name, e.g. "RAT, 30 days" */
		label: string;
		/** y-range shared with other sparklines, so heights compare */
		domain?: [number, number];
		/** line and dot colour, e.g. an exchange's; ink and trend otherwise */
		color?: string;
		width?: number;
	}>();

	const HEIGHT = 24;

	const theme = useChartTheme();
	const layout = computed(() =>
		sparklineLayout(points, width, HEIGHT, 3, domain)
	);
	const dotColor = computed(() => {
		if (color) return color;
		const rounded = Math.round(trend);
		if (!rounded) return theme.value.muted;
		return rounded > 0 ? theme.value.positive : theme.value.negative;
	});
</script>

<template>
	<svg
		role="img"
		:aria-label="label"
		:width="width"
		:height="HEIGHT"
		:viewBox="`0 0 ${width} ${HEIGHT}`"
		class="block">
		<polyline
			v-for="(line, i) in layout.lines"
			:key="i"
			:points="line"
			fill="none"
			:stroke="color ?? theme.ink"
			:stroke-opacity="color ? 1 : 0.72"
			stroke-width="1.5"
			stroke-linejoin="round"
			stroke-linecap="round" />
		<circle
			v-for="(dot, i) in layout.dots"
			:key="`dot${i}`"
			:cx="dot.x"
			:cy="dot.y"
			r="1.5"
			:fill="color ?? theme.ink"
			:fill-opacity="color ? 1 : 0.72" />
		<circle
			v-if="layout.end"
			:cx="layout.end.x"
			:cy="layout.end.y"
			r="2.5"
			:fill="dotColor" />
	</svg>
</template>
