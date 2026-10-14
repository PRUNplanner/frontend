<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { sparklineLayout } from "@/ui/charts/charts.util";

	// a 100 × 24 px line of recent values with its own y-scale (direction
	// only); gaps break the line, the end dot shows the trend's sign
	const { points, trend, label } = defineProps<{
		points: (number | null)[];
		/** trend in %, neutral when it rounds to 0 % (as the Trend columns) */
		trend: number;
		/** accessible name, e.g. "RAT, 30 days" */
		label: string;
	}>();

	const WIDTH = 100;
	const HEIGHT = 24;

	const theme = useChartTheme();
	const layout = computed(() => sparklineLayout(points, WIDTH, HEIGHT));
	const dotColor = computed(() => {
		const rounded = Math.round(trend);
		if (!rounded) return theme.value.muted;
		return rounded > 0 ? theme.value.positive : theme.value.negative;
	});
</script>

<template>
	<svg
		role="img"
		:aria-label="label"
		:width="WIDTH"
		:height="HEIGHT"
		:viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
		class="block">
		<polyline
			v-for="(line, i) in layout.lines"
			:key="i"
			:points="line"
			fill="none"
			:stroke="theme.ink"
			stroke-opacity="0.72"
			stroke-width="1.5"
			stroke-linejoin="round"
			stroke-linecap="round" />
		<circle
			v-if="layout.end"
			:cx="layout.end.x"
			:cy="layout.end.y"
			r="2.5"
			:fill="dotColor" />
	</svg>
</template>
