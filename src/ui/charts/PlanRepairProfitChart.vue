<script setup lang="ts">
	import { computed } from "vue";
	import { Chart } from "vue-chartjs";
	import {
		Chart as ChartJS,
		LineElement,
		PointElement,
		LinearScale,
		Title,
		CategoryScale,
		Tooltip,
		type ChartData,
	} from "chart.js";
	import ChartDataLabels, { type Context } from "chartjs-plugin-datalabels";

	// Util
	import { chartScale, chartTooltip } from "@/ui/charts/charts.util";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	ChartJS.register(
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Title,
		Tooltip,
		ChartDataLabels
	);

	// about half the optimal point label's width, in px
	const EDGE_MARGIN = 60;

	const props = defineProps<{
		profitData: number[];
		optimalPoint: { x: number; y: number };
	}>();

	const theme = useChartTheme();

	const chartData = computed<ChartData<"line" | "scatter">>(() => ({
		labels: props.profitData.map((_, i) => i),
		datasets: [
			{
				type: "line",
				label: "Repair Analysis",
				data: props.profitData,
				borderColor: theme.value.positive,
				borderWidth: 2,
				pointRadius: 0,
				tension: 0,
				datalabels: { display: false },
			},
			{
				label: "Last Optimal Profit",
				type: "scatter",
				data: [props.optimalPoint],
				pointStyle: "star",
				pointRadius: 5,
				pointHoverRadius: 6,
				backgroundColor: theme.value.ink,
				borderColor: theme.value.positive,
				borderWidth: 2,
				datalabels: {
					display: true,
					// keep the label inside the chart at the edges
					align: (ctx: Context) => {
						// from the scale, the element's x is still animating
						const x = ctx.chart.scales.x.getPixelForValue(
							props.optimalPoint.x
						);
						const { left, right } = ctx.chart.chartArea;
						if (right - x < EDGE_MARGIN) return 135; // bottom left
						if (x - left < EDGE_MARGIN) return 45; // bottom right
						return "bottom";
					},
					anchor: "end",
					offset: 10,
					color: theme.value.ink,
					font: { family: "monospace", weight: "bold", size: 12 },
					formatter: (value: { x: number; y: number }) => {
						return [
							`Day: ${value.x}`,
							`ȼ ${value.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
						];
					},
					textAlign: "center",
					padding: 6,
					backgroundColor: theme.value.surface,
					borderRadius: 4,
				},
			},
		],
	}));

	const chartOptions = computed(() => ({
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			x: {
				...chartScale(theme.value),
				offset: false,
			},
			y: {
				...chartScale(theme.value),
				beginAtZero: true,
			},
		},
		plugins: {
			legend: { display: false },
			tooltip: chartTooltip(theme.value),
		},
	}));
</script>

<template>
	<div class="h-full w-full h-[300px]!">
		<Chart type="line" :data="chartData" :options="chartOptions" />
	</div>
</template>
