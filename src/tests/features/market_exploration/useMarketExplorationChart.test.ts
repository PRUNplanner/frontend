import { beforeEach, describe, expect, it } from "vitest";
import { apiService } from "@/lib/apiService";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";

// test data
import exploration_7d_dw from "@/tests/test_data/api_data_exploration_7d_dw.json";
import { ref, type Ref } from "vue";
import { useMarketExplorationChart } from "@/features/market_exploration/useMarketExplorationChart";
import type { CandleInterval } from "@/features/market_exploration/marketExploration.types";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("useMarketExplorationChart", async () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mock.reset();
	});

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
		mock.onGet("/data/cxpc/DW/NC1/").reply(500);

		await fetchData();

		expect(dataChart.value.length).toBe(0);
		expect(hasError.value).toBeTruthy();
	});

	it("fetch data and check it", async () => {
		const { fetchData, hasError, dataChart, dataCandlestick } =
			useMarketExplorationChart(exchangeTicker, materialTicker);
		mock.onGet("/data/cxpc/DW/NC1/").reply(200, exploration_7d_dw);

		await fetchData();

		expect(dataChart.value.length).toBe(778);
		expect(hasError.value).toBeFalsy();
		expect(dataCandlestick.value.length).toBe(952);

		expect(dataCandlestick.value[0].length).toBe(6);
	});

	describe("candles", () => {
		const day = (month: number, d: number, hours = 0) =>
			Date.UTC(2026, month - 1, d, hours);

		const row = (
			epoch: number,
			open: number,
			high: number,
			low: number,
			close: number,
			traded: number
		) => ({
			ticker: "RAT",
			exchange_code: "NC1",
			date_epoch: epoch,
			open_p: open,
			high_p: high,
			low_p: low,
			close_p: close,
			volume: 0,
			traded,
		});

		// Mon 5 Jan, a gap on Tue, Wed (not at midnight), Sun, Mon, then Sun
		// 1 Feb; given out of order
		const rows = [
			row(day(1, 12), 13, 16, 12, 15, 30),
			row(day(1, 5), 10, 12, 9, 11, 100),
			row(day(2, 1), 15, 15, 15, 15, 5),
			row(day(1, 7, 5), 11, 15, 10, 14, 50),
			row(day(1, 11), 14, 14, 13, 13, 20),
		];

		async function load(material: string, interval?: CandleInterval) {
			const chart = useMarketExplorationChart(ref("NC1"), ref(material));
			if (interval) chart.selectedInterval.value = interval;
			mock.onGet(`/data/cxpc/${material}/NC1/`).reply(200, rows);
			await chart.fetchData();
			return chart;
		}

		it("has no candles without data", () => {
			const { dataCandlestick } = useMarketExplorationChart(
				exchangeTicker,
				materialTicker
			);

			expect(dataCandlestick.value).toEqual([]);
		});

		it("fills missing days with the last close and no volume", async () => {
			const { dataCandlestick } = await load("C1");

			// Jan 5 to Feb 1
			expect(dataCandlestick.value).toHaveLength(28);
			expect(dataCandlestick.value.slice(0, 4)).toEqual([
				[day(1, 5), 10, 12, 9, 11, 100],
				[day(1, 6), 11, 11, 11, 11, 0],
				// 05:00 is normalized to midnight UTC
				[day(1, 7), 11, 15, 10, 14, 50],
				[day(1, 8), 14, 14, 14, 14, 0],
			]);
			expect(dataCandlestick.value.at(-1)).toEqual([
				day(2, 1),
				15,
				15,
				15,
				15,
				5,
			]);
		});

		it("aggregates weeks from Monday, Sunday belongs to the week before", async () => {
			const { dataCandlestick } = await load("C2", "weekly");

			expect(dataCandlestick.value).toEqual([
				// open of Monday, extremes over the week, close of Sunday
				[day(1, 5), 10, 15, 9, 13, 170],
				[day(1, 12), 13, 16, 12, 15, 30],
				[day(1, 19), 15, 15, 15, 15, 0],
				// Sunday 1 Feb closes the week of 26 Jan
				[day(1, 26), 15, 15, 15, 15, 5],
			]);
		});

		it("aggregates months from the first", async () => {
			const { dataCandlestick } = await load("C3", "monthly");

			expect(dataCandlestick.value).toEqual([
				[day(1, 1), 10, 16, 9, 15, 200],
				[day(2, 1), 15, 15, 15, 15, 5],
			]);
		});

		it("reports loading while fetching and clears a previous error", async () => {
			const { fetchData, isLoading, hasError, dataChart } =
				useMarketExplorationChart(ref("NC1"), ref("C4"));
			mock.onGet("/data/cxpc/C4/NC1/").replyOnce(500);
			await fetchData();
			expect(hasError.value).toBe(true);

			mock.onGet("/data/cxpc/C4/NC1/").reply(200, rows);
			const pending = fetchData();
			expect(isLoading.value).toBe(true);
			expect(hasError.value).toBe(false);
			expect(dataChart.value).toEqual([]);

			await pending;
			expect(isLoading.value).toBe(false);
			expect(dataChart.value).toHaveLength(5);
		});
	});
});
