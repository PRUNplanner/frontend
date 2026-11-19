import { computed, ref, type Ref } from "vue";

// Util
import { candles } from "@/features/market_exploration/marketExploration.util";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type {
	CandleInterval,
	CandleTuple,
} from "@/features/market_exploration/marketExploration.types";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

export function useMarketExplorationChart(
	exchangeTicker: Ref<string>,
	materialTicker: Ref<string>
) {
	const data: Ref<Exploration[]> = ref([]);
	const loading: Ref<boolean> = ref(false);
	const error: Ref<boolean> = ref(false);

	const selectedInterval = ref<CandleInterval>("daily");

	const isLoading = computed(() => loading.value);
	const hasError = computed(() => error.value);
	const dataChart = computed(() => data.value);

	const dataCandlestick = computed((): CandleTuple[] => {
		return candles(data.value, selectedInterval.value);
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
			.then((result: Exploration[]) => {
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
		selectedInterval,
		// data
		dataChart,
		dataCandlestick,
	};
}
