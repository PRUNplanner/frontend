import { describe, expect, it } from "vitest";
import { apiService } from "@/lib/apiService";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";

// test data
import exploration_7d_dw from "@/tests/test_data/api_data_exploration_7d_dw.json";
import { ref, Ref } from "vue";
import { useMarketExplorationChart } from "@/features/market_exploration/useMarketExplorationChart";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("useMarketExplorationChart", async () => {
	setActivePinia(createPinia());

	const exchangeTicker: Ref<string> = ref("NC1");
	const materialTicker: Ref<string> = ref("DW");

	it("initial status", async () => {
		const { isLoading, hasError, dataChart } = useMarketExplorationChart(
			exchangeTicker,
			materialTicker
		);

		expect(isLoading.value).toBeFalsy();
		expect(hasError.value).toBeFalsy();
		expect(dataChart.value).toStrictEqual([]);
	});

	it("fetch data with error and check error flag", async () => {
		const { fetchData, hasError, dataChart } = useMarketExplorationChart(
			exchangeTicker,
			materialTicker
		);
		mock.onGet("/data/cxpc/DW/NC1").reply(500);

		await fetchData();

		expect(dataChart.value.length).toBe(0);
		expect(hasError.value).toBeTruthy();
	});

	it("fetch data and check it", async () => {
		const {
			fetchData,
			hasError,
			dataChart,
			dataCandlestick,
			dataVolume,
			chartOptions,
		} = useMarketExplorationChart(exchangeTicker, materialTicker);
		mock.onGet("/data/cxpc/DW/NC1").reply(200, exploration_7d_dw);

		await fetchData();

		expect(dataChart.value.length).toBe(778);
		expect(hasError.value).toBeFalsy();
		expect(dataCandlestick.value.length).toBe(778);
		expect(dataVolume.value.length).toBe(778);

		// @ts-expect-error access data directly thats not exposed
		expect(chartOptions.value.series[0].data.length).toBe(778);

		expect(dataCandlestick.value[0].length).toBe(5);
	});
});
