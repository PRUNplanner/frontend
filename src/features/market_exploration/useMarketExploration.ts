// Composables
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type { Exploration } from "@/features/market_exploration/marketExploration.schemas";

export function useMarketExploration() {
	/**
	 * Requests last 7 days of exploration data for
	 * AI1, CI1, IC1, NC1 for single material ticker
	 * @author jplacht
	 *
	 * @async
	 * @param {string} ticker Material Ticker, e.g. "DW"
	 * @returns {Promise<Record<string, Exploration[]>>} Exploration Data of last 7 days
	 */
	async function getMaterialExplorationData(
		ticker: string
	): Promise<Record<string, Exploration[]>> {
		const data: Record<string, Exploration[]> = {
			AI1: [],
			CI1: [],
			IC1: [],
			NC1: [],
		};

		// fetch multiple exploration data
		const fetchPromises: Promise<Exploration[]>[] = [
			"AI1",
			"CI1",
			"IC1",
			"NC1",
		].map((exchangeTicker) =>
			useQuery("GetExplorationData", {
				exchangeTicker: exchangeTicker,
				materialTicker: ticker,
			})
				.execute()
				.then(
					(result: Exploration[]) => (data[exchangeTicker] = result)
				)
		);

		await Promise.all(fetchPromises);

		return data;
	}

	return {
		getMaterialExplorationData,
	};
}
