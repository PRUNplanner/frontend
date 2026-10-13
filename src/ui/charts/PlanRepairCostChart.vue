<script setup lang="ts">
	import { computed } from "vue";
	import { Line } from "vue-chartjs";
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		LineController,
		ScatterController,
		type ChartData,
		type ChartOptions,
	} from "chart.js";

	// Util
	import { chartScale, chartTooltip } from "@/ui/charts/charts.util";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	ChartJS.register(
		Title,
		Tooltip,
		Legend,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		LineController,
		ScatterController
	);

	interface SeriesData {
		name: string;
		data: number[];
	}

	const props = defineProps<{
		series: SeriesData[];
	}>();

	const theme = useChartTheme();

	/** the first series is the total cost, the rest one per material */
	function seriesColor(index: number): string {
		return index === 0
			? theme.value.negative
			: `hsl(${(index * 137.5) % 360}, 60%, 40%)`;
	}

	const chartData = computed<ChartData<"line">>(() => {
		const maxLen = Math.max(...props.series.map((s) => s.data.length));
		const labels = Array.from({ length: maxLen }, (_, i) => i.toString());

		return {
			labels,
			datasets: props.series.map((s, index) => ({
				label: s.name,
				data: s.data,
				borderColor: seriesColor(index),
				backgroundColor: seriesColor(index),
				borderWidth: 2,
				pointRadius: 0,
				tension: 0,
			})),
		};
	});

	const chartOptions = computed<ChartOptions<"line">>(() => ({
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: "index",
			intersect: false,
		},
		plugins: {
			legend: {
				position: "bottom",
				labels: { color: theme.value.muted, font: { size: 12 } },
			},
			tooltip: {
				...chartTooltip(theme.value),
				callbacks: {
					label: (context) => {
						let label = context.dataset.label || "";
						if (label) label += ": ";
						if (context.parsed.y !== null) {
							label += context.parsed.y.toFixed(2);
						}
						return label;
					},
				},
			},
			datalabels: {
				display: false,
			},
		},
		scales: {
			y: {
				...chartScale(theme.value),
				beginAtZero: true,
				offset: false,
			},
			x: {
				...chartScale(theme.value),
				offset: false,
			},
		},
	}));
</script>

<template>
	<div class="h-full w-full h-[300px]!">
		<Line :data="chartData" :options="chartOptions" />
	</div>
</template>
