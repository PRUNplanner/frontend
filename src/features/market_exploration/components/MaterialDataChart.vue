<script setup lang="ts">
	import { computed, ComputedRef, onMounted, ref, Ref } from "vue";

	// Types & Interfaces
	import { Options, SeriesOptionsType } from "highcharts";
	import { IMaterialExplorationRecord } from "@/features/market_exploration/marketExploration.types";
	import { IMaterialDataSeries } from "@/features/market_exploration/components/MaterialDataChart.types";

	// Composables
	import { useMarketExploration } from "@/features/market_exploration/useMarketExploration";

	// Components
	import { Chart } from "highcharts-vue";

	// UI
	import { NSpin } from "naive-ui";

	// Util
	import { timestampFromString } from "@/util/date";

	const { getMaterialExplorationData } = useMarketExploration();

	// Props
	const props = defineProps({
		materialTicker: {
			type: String,
			required: true,
		},
		displayValue: {
			type: String,
			required: false,
			default: "volume_max",
		},
	});

	onMounted(async () => {
		await getMaterialExplorationData(props.materialTicker).then(
			(result: IMaterialExplorationRecord) => {
				chartData.value = result;
			}
		);
	});

	const chartData: Ref<IMaterialExplorationRecord | undefined> =
		ref(undefined);
	const chartSeriesData: ComputedRef<IMaterialDataSeries[]> = computed(() => {
		if (chartData.value) {
			return Object.keys(chartData.value).map((exchange) => ({
				name: exchange,
				data: chartData.value![exchange].map((e) => [
					timestampFromString(e.Datetime),
					e[props.displayValue] as number,
				]),
			}));
		} else {
			return [];
		}
	});

	const chartOptions: ComputedRef<Options> = computed(() => {
		return {
			chart: {
				type: "column",
				height: "300px",
			},
			yAxis: {
				title: {
					text: "",
				},
				type: "logarithmic",
			},
			xAxis: {
				type: "datetime",
			},
			series: chartSeriesData.value as SeriesOptionsType[],
			title: {
				text: "",
			},
		};
	});
</script>

<template>
	<div
		v-if="!chartData"
		class="w-full h-[300px] flex items-center justify-center">
		<div class="text-white text-center">
			<n-spin :size="20" />
			<div class="text-white/60">Loading Data...</div>
		</div>
	</div>
	<chart v-else ref="chart" class="hc" :options="chartOptions" />
</template>
