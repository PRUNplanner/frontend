import { computed, ref, Ref } from "vue";
import dayjs from "dayjs";

// Util
import { formatDate } from "@/util/date";

// Composables
import { useQueryRepository } from "@/lib/query_cache/queryRepository";
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import { IExploration } from "@/features/market_exploration/marketExploration.types";

export function useMarketExplorationChart(
	exchangeTicker: Ref<string>,
	materialTicker: Ref<string>
) {
	const maxDate = new Date();
	const minDate = new Date(Date.UTC(2022, 6 - 1, 1));

	const data: Ref<IExploration[]> = ref([]);
	const loading: Ref<boolean> = ref(false);
	const error: Ref<boolean> = ref(false);

	const isLoading = computed(() => loading.value);
	const hasError = computed(() => error.value);
	const dataChart = computed(() => data.value);

	const dataCandlestick = computed(() => {
		return data.value.map((d) => [
			dayjs(d.Datetime, "YYYY-MM-DD").unix() * 1000,
			d.price_first,
			d.price_max,
			d.price_min,
			d.price_last,
		]);
	});

	const dataVolume = computed(() => {
		return data.value.map((d) => [
			dayjs(d.Datetime).unix() * 1000,
			d.volume_max,
		]);
	});

	const dataDelta = computed(() => {
		return data.value.map((d) => [
			dayjs(d.Datetime).unix() * 1000,
			d.delta_supply_demand,
		]);
	});

	const chartOptions = computed(() => {
		return {
			chart: {
				height: 900,
			},
			tooltip: {
				split: true,
			},
			yAxis: [
				{
					title: {
						text: "Candlestick",
					},
					height: "55%",
					resize: {
						enabled: true,
					},
					startOnTick: false,
				},
				{
					title: {
						text: "Volume",
					},
					height: "15%",
					top: "60%",
					offset: 0,
					resize: {
						enabled: true,
					},
				},
				{
					title: {
						text: "Δ Supply/Demand",
					},
					height: "15%",
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
				} as Highcharts.SeriesOptionsType,
				{
					id: "volume",
					name: `${materialTicker.value}: Traded Volume`,
					type: "column",
					yAxis: 1,
					data: dataVolume.value,
					color: "#659bf1",
				} as Highcharts.SeriesOptionsType,
				{
					id: "delta",
					name: `${materialTicker.value}: Δ Supply/Demand`,
					type: "column",
					yAxis: 2,
					data: dataDelta.value,
					color: "green",
					negativeColor: "red",
				} as Highcharts.SeriesOptionsType,
			],
		};
	});

	async function fetchData(): Promise<void> {
		loading.value = true;
		error.value = false;
		data.value = [];

		await useQuery(useQueryRepository().repository.GetExplorationData, {
			exchangeTicker: exchangeTicker.value,
			materialTicker: materialTicker.value,
			payload: {
				start: formatDate(minDate),
				end: formatDate(maxDate),
			},
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
		dataDelta,
		// chart
		chartOptions,
	};
}
