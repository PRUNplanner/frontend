import { computed, type ComputedRef } from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import router from "@/router";

// Types & Interfaces
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

/**
 * The market report's summary. Starts the request in setup; a summary
 * stored by an earlier visit shows at once while it refreshes (the cache
 * entry is read whether fresh or not).
 *
 * @author jplacht
 */
export function useMarketReport() {
	const queryStore = useQueryStore();
	const { execute } = useQuery("GetMarketSummary");
	const key = toCacheKey(
		getQueryDefinition("GetMarketSummary").key(undefined)
	);

	const summary: ComputedRef<MarketSummary | null> = computed(
		() => (queryStore.cacheState[key]?.data as MarketSummary) ?? null
	);
	// failed without anything to show
	const failed: ComputedRef<boolean> = computed(
		() => !summary.value && !!queryStore.cacheState[key]?.error
	);

	function load(forceRefetch: boolean = false): void {
		// the store logs it, `failed` shows it
		execute({ forceRefetch }).catch(() => {});
	}
	load();

	return { summary, failed, retry: () => load(true) };
}

/**
 * Hover or focus on a link to the market report: its route chunk and the
 * summary start loading, so the page opens with its data
 */
export function prefetchMarketReport(): void {
	const component = router.resolve("/market").matched[0]?.components?.default;
	if (typeof component === "function")
		void (component as () => Promise<unknown>)().catch(() => {});
	// the store logs a failure, the page retries
	void useQuery("GetMarketSummary")
		.execute()
		.catch(() => {});
}
