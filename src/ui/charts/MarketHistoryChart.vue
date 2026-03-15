<script setup lang="ts">
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale,
		type ChartData,
		type ChartOptions,
	} from "chart.js";
	import { Bar } from "vue-chartjs";
	import { computed } from "vue";

	ChartJS.register(
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale
	);

	interface DataPoint {
		date: string;
		AI1: number;
		CI1: number;
		NC1: number;
		IC1: number;
	}

	const props = defineProps<{
		data: DataPoint[];
	}>();

	const PALETTE = {
		AI1: "#60a5fa", // Blue
		CI1: "#4ade80", // Green
		NC1: "#fbbf24", // Amber
		IC1: "#f87171", // Red
	};

	const chartData = computed<ChartData<"bar">>(() => ({
		labels: props.data.map((d) => d.date),
		datasets: [
			{
				label: "AI1",
				data: props.data.map((d) => d.AI1),
				backgroundColor: PALETTE.AI1 + "B3", // 70% opacity
				borderColor: PALETTE.AI1,
				borderWidth: 1,
				borderRadius: 2,
			},
			{
				label: "CI1",
				data: props.data.map((d) => d.CI1),
				backgroundColor: PALETTE.CI1 + "B3",
				borderColor: PALETTE.CI1,
				borderWidth: 1,
				borderRadius: 2,
			},
			{
				label: "NC1",
				data: props.data.map((d) => d.NC1),
				backgroundColor: PALETTE.NC1 + "B3",
				borderColor: PALETTE.NC1,
				borderWidth: 1,
				borderRadius: 2,
			},
			{
				label: "IC1",
				data: props.data.map((d) => d.IC1),
				backgroundColor: PALETTE.IC1 + "B3",
				borderColor: PALETTE.IC1,
				borderWidth: 1,
				borderRadius: 2,
			},
		],
	}));

	const chartOptions: ChartOptions<"bar"> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "bottom",
				labels: {
					color: "#999999",
				},
			},
			tooltip: {
				mode: "index",
				intersect: false,
				backgroundColor: "rgba(15, 23, 42, 0.9)",
				titleFont: { size: 14, weight: "bold" },
				padding: 12,
				borderColor: "rgba(255, 255, 255, 0.1)",
				borderWidth: 1,
			},
			datalabels: { display: false },
		},
		scales: {
			x: {
				stacked: false,
				grid: { display: false },
				ticks: { color: "#999999", font: { size: 11 } },
			},
			y: {
				beginAtZero: true,
				grid: { color: "rgba(255, 255, 255, 0.05)" },
				ticks: {
					color: "#999999",
					callback: function (value) {
						const numericValue = value as number;
						if (Math.abs(numericValue) >= 1000000) {
							return (numericValue / 1000000).toFixed(1) + "M";
						}
						if (Math.abs(numericValue) >= 1000) {
							return (numericValue / 1000).toFixed(0) + "k";
						}
						return numericValue;
					},
				},
			},
		},
	};
</script>

<template>
	<div class="h-full w-full relative h-[300px]!">
		<Bar :data="chartData" :options="chartOptions" />
	</div>
</template>
