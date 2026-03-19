<script setup lang="ts">
	import { computed } from "vue";
	import {
		Chart as ChartJS,
		Tooltip,
		Legend,
		LinearScale,
		type ChartData,
		type ChartOptions,
		ChartDataset,
	} from "chart.js";
	import { Chart } from "vue-chartjs";
	import { TreemapController, TreemapElement } from "chartjs-chart-treemap";
	import { IChartEmpireTreeElement } from "./charts.types";

	ChartJS.register(
		Tooltip,
		Legend,
		LinearScale,
		TreemapController,
		TreemapElement
	);

	interface TreemapProps {
		tree: IChartEmpireTreeElement[];
		key: string;
		groups: string[];
		spacing?: number;
		labels?: unknown;
	}

	type TreemapDataset = ChartDataset<"treemap"> & TreemapProps;

	const props = defineProps<{
		data: IChartEmpireTreeElement[];
	}>();

	const chartData = computed<ChartData<"treemap">>(() => ({
		datasets: [
			{
				label: "Profitable Plans",
				tree: props.data as unknown,
				key: "value",
				groups: ["cogc", "name"],
				data: [],
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				backgroundColor: (ctx: any) => {
					const item = ctx.raw?._data;

					if (item && item.cogc == item.label) return "#888";

					return item && item.children[0]
						? item.children[0].color
						: "#333";
				},
				labels: {
					display: true,
					color: "#fff",
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					formatter: (ctx: any) => {
						const item = ctx.raw?._data;

						return [item.label, `${item.value} ȼ`];
					},
				},
			} as TreemapDataset,
		],
	}));

	const chartOptions: ChartOptions<"treemap"> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			datalabels: {
				display: false,
			},
			legend: { display: false },
			tooltip: {
				callbacks: {
					title: () => "",
					label: (ctx) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const value = ctx.raw as any;
						return `${value._data.label}: ${value._data.value} ȼ`;
					},
				},
			},
		},
	};
</script>

<template>
	<div class="w-full h-[500px]">
		<Chart type="treemap" :data="chartData" :options="chartOptions" />
	</div>
</template>
