import { computed, ref, Ref } from "vue";

// Util

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import { IExploration } from "@/features/market_exploration/marketExploration.types";

export function useMarketExplorationChart(
	exchangeTicker: Ref<string>,
	materialTicker: Ref<string>
) {
	const data: Ref<IExploration[]> = ref([]);
	const loading: Ref<boolean> = ref(false);
	const error: Ref<boolean> = ref(false);

	const isLoading = computed(() => loading.value);
	const hasError = computed(() => error.value);
	const dataChart = computed(() => data.value);

	const dataCandlestick = computed(() => {
		return data.value
			.map((d) => [d.date_epoch, d.open_p, d.high_p, d.low_p, d.close_p])
			.sort((a, b) => a[0] - b[0]);
	});

	const dataVolume = computed(() => {
		return data.value
			.map((d) => [d.date_epoch, d.traded])
			.sort((a, b) => a[0] - b[0]);
	});

	const chartOptions = computed(() => {
		return {
			chart: {
				height: 900,
			},
			tooltip: {
				split: true,
			},
			xAxis: {
				ordinal: false,
			},
			yAxis: [
				{
					title: {
						text: "Candlestick",
					},
					height: "80%",
					resize: {
						enabled: true,
					},
					startOnTick: false,
				},
				{
					title: {
						text: "Volume",
					},
					height: "20%",
					top: "80%",
					offset: 0,
					resize: {
						enabled: true,
					},
				},
			],
			series: [
				{
					id: "candles",
					name: `${materialTicker.value}`,
					type: "candlestick",
					data: dataCandlestick.value,
					gapSize: 1,
				} as Highcharts.SeriesOptionsType,
				{
					id: "volume",
					name: `${materialTicker.value}: Traded Volume`,
					type: "column",
					yAxis: 1,
					data: dataVolume.value,
					color: "#659bf1",
					gapSize: 1,
				} as Highcharts.SeriesOptionsType,
			],
		};
	});

	/**
	 * Fetches market exploration data from the backend and stores it in the composable
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>} Void, data stored in data property
	 */
	async function fetchData(): Promise<void> {
		loading.value = true;
		error.value = false;
		data.value = [];

		await useQuery("GetExplorationData", {
			exchangeTicker: exchangeTicker.value,
			materialTicker: materialTicker.value,
		})
			.execute()
			.then((result: IExploration[]) => {
				data.value = result;
			})
			.catch(() => {
				error.value = true;
			})
			.finally(() => {
				loading.value = false;
			});
	}

	return {
		fetchData,
		isLoading,
		hasError,
		// data
		dataChart,
		dataCandlestick,
		dataVolume,
		// chart
		chartOptions,
	};
}
