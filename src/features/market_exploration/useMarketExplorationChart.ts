import { computed, ref, type Ref } from "vue";

// Util

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type {
	CandleInterval,
	CandleTuple,
} from "@/features/market_exploration/marketExploration.types";
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

const MS_PER_DAY = 86400000;

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
		if (!data.value.length) return [];

		const interval = selectedInterval.value;

		const sortedRaw = [...data.value]
			.map((d) => ({
				...d,
				// Force normalization to midnight UTC
				normalized_epoch:
					Math.floor(d.date_epoch / MS_PER_DAY) * MS_PER_DAY,
			}))
			.sort((a, b) => a.normalized_epoch - b.normalized_epoch);

		// Fill Daily Gaps
		const dailyMap = new Map(sortedRaw.map((d) => [d.normalized_epoch, d]));
		const firstDay = sortedRaw[0].normalized_epoch;
		const lastDay = sortedRaw[sortedRaw.length - 1].normalized_epoch;

		const dailyFilled: CandleTuple[] = [];
		let lastClose = sortedRaw[0].close_p;

		for (let curr = firstDay; curr <= lastDay; curr += MS_PER_DAY) {
			const entry = dailyMap.get(curr);
			if (entry) {
				lastClose = entry.close_p;
				dailyFilled.push([
					curr,
					entry.open_p,
					entry.high_p,
					entry.low_p,
					entry.close_p,
					entry.traded,
				]);
			} else {
				dailyFilled.push([
					curr,
					lastClose,
					lastClose,
					lastClose,
					lastClose,
					0,
				]);
			}
		}

		if (interval === "daily") return dailyFilled;

		// Aggregate Weekly/Monthly
		const periodMap = new Map<number, CandleTuple>();

		for (const [epoch, open, high, low, close, volume] of dailyFilled) {
			const date = new Date(epoch);
			let periodKey: number;

			if (interval === "weekly") {
				// Monday
				const day = date.getUTCDay();
				// If Sunday (0), go back 6 days. Else day-1.
				const offset = day === 0 ? 6 : day - 1;
				date.setUTCDate(date.getUTCDate() - offset);
				periodKey = date.getTime();
			} else {
				// Monthly: 1st of the month
				date.setUTCDate(1);
				periodKey = date.getTime();
			}

			const existing = periodMap.get(periodKey);
			if (!existing) {
				// start of period
				periodMap.set(periodKey, [
					periodKey,
					open,
					high,
					low,
					close,
					volume,
				]);
			} else {
				// Ongoing period -> Metric update
				existing[2] = Math.max(existing[2], high); // Max High
				existing[3] = Math.min(existing[3], low); // Min Low
				existing[4] = close; // Final Close
				existing[5] += volume; // Sum Volume
			}
		}

		return Array.from(periodMap.values());
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
