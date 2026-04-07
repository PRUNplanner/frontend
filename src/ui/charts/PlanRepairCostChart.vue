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

	const chartData = computed<ChartData<"line">>(() => {
		const maxLen = Math.max(...props.series.map((s) => s.data.length));
		const labels = Array.from({ length: maxLen }, (_, i) => i.toString());

		return {
			labels,
			datasets: props.series.map((s, index) => ({
				label: s.name,
				data: s.data,
				borderColor: `hsl(${(index * 137.5) % 360}, 60%, 40%)`,
				backgroundColor: `hsl(${(index * 137.5) % 360}, 60%, 40%)`,
				borderWidth: 2,
				pointRadius: 0,
				tension: 0,
			})),
		};
	});

	const chartOptions: ChartOptions<"line"> = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: "index",
			intersect: false,
		},
		plugins: {
			legend: {
				position: "bottom",
			},
			tooltip: {
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
				beginAtZero: true,
				offset: false,
				border: {
					display: true,
					color: "#333",
					width: 1,
				},
				grid: {
					display: true,
					color: "#333",
				},
			},
			x: {
				offset: false,
				border: {
					display: true,
					color: "#333",
					width: 1,
				},
				grid: {
					display: true,
					color: "#333",
				},
			},
		},
	};
</script>

<template>
	<div class="h-full w-full h-[300px]!">
		<Line :data="chartData" :options="chartOptions" />
	</div>
</template>
