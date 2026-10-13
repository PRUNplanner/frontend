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

	// Util
	import { chartScale, chartTooltip } from "@/ui/charts/charts.util";
	import { useChartTheme } from "@/ui/charts/chartTheme";

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

	const EXCHANGES = ["AI1", "CI1", "IC1", "NC1"] as const;

	const theme = useChartTheme();

	const chartData = computed<ChartData<"bar">>(() => ({
		labels: props.data.map((d) => d.date),
		datasets: EXCHANGES.map((code) => ({
			label: code,
			data: props.data.map((d) => d[code]),
			backgroundColor: theme.value.exchange(code),
			borderRadius: 2,
		})),
	}));

	const chartOptions = computed<ChartOptions<"bar">>(() => ({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "bottom",
				labels: {
					color: theme.value.muted,
					font: { size: 12 },
				},
			},
			tooltip: {
				...chartTooltip(theme.value),
				mode: "index",
				intersect: false,
			},
			datalabels: { display: false },
		},
		scales: {
			x: {
				...chartScale(theme.value),
				stacked: false,
				grid: { display: false },
			},
			y: {
				...chartScale(theme.value),
				beginAtZero: false,
				ticks: {
					...chartScale(theme.value).ticks,
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
	}));
</script>

<template>
	<div class="h-full w-full relative h-[300px]!">
		<Bar :data="chartData" :options="chartOptions" />
	</div>
</template>
