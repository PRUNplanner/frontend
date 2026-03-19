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
			.map(
				(d) =>
					[
						d.date_epoch,
						d.open_p,
						d.high_p,
						d.low_p,
						d.close_p,
						d.traded,
					] as [number, number, number, number, number, number]
			) // Force Tuple type
			.sort((a, b) => a[0] - b[0]);
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
	};
}
