import { computed, type ComputedRef } from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";

// Types & Interfaces
import type { Exchange } from "@/features/api/schemas/gameData.schemas";

/**
 * The market report's order books (/data/exchanges/), shared by In short,
 * the price gaps and the exchange cards. Reads the cache; `load` starts the
 * one request (the store joins a running one).
 *
 * @author jplacht
 */
export function useMarketBooks() {
	const queryStore = useQueryStore();
	const key = toCacheKey(
		getQueryDefinition("GetMarketExchanges").key(undefined)
	);

	const books: ComputedRef<Exchange[] | null> = computed(
		() => (queryStore.cacheState[key]?.data as Exchange[]) ?? null
	);
	// failed without anything to show
	const failed: ComputedRef<boolean> = computed(
		() => !books.value && !!queryStore.cacheState[key]?.error
	);

	function load(forceRefetch: boolean = false): void {
		// the store logs it, `failed` shows it
		useQuery("GetMarketExchanges")
			.execute({ forceRefetch })
			.catch(() => {});
	}

	return { books, failed, load };
}
