<script setup lang="ts">
	import { computed } from "vue";

	import { IChartEmpirePieElement } from "@/ui/charts/charts.types";

	import {
		Chart as ChartJS,
		ArcElement,
		Tooltip,
		Legend,
		type ChartData,
		type ChartOptions,
	} from "chart.js";
	import { Doughnut } from "vue-chartjs";
	import ChartDataLabels from "chartjs-plugin-datalabels";

	ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

	const props = defineProps<{
		data: IChartEmpirePieElement[];
	}>();

	const chartData = computed<ChartData<"doughnut">>(() => ({
		labels: props.data.map((d) => d.name),
		datasets: [
			{
				data: props.data.map((d) => d.value),
				backgroundColor: props.data.map((d) => d.color),
				borderColor: "#fff",
				borderWidth: 1,
				hoverOffset: 15,
			},
		],
	}));

	const chartOptions: ChartOptions<"doughnut"> = {
		responsive: true,
		maintainAspectRatio: false,
		layout: {
			padding: 70,
		},
		cutout: 0,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				callbacks: {
					label: (ctx) => {
						const value = ctx.raw as number;
						const label = ctx.label || "";
						return ` ${label}: ${value.toFixed(2)}`;
					},
				},
			},
			datalabels: {
				display: "auto",
				clamp: true,
				color: "#ffffff",
				anchor: "end",
				align: "end",
				offset: 15,
				formatter: (value, ctx) => {
					const label = ctx.chart.data.labels?.[ctx.dataIndex];
					return `${label}: ${value.toLocaleString()}`;
				},
				font: {
					family: "monospace",
				},
			},
		},
	};
</script>

<template>
	<div class="h-full w-full h-[400px]!">
		<Doughnut :data="chartData" :options="chartOptions" />
	</div>
</template>
