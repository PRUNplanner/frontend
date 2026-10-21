import router from "@/router";

/**
 * Hover or focus on a link to the market report: its route chunk and the
 * summary start loading, so the page opens with its data. Apart from
 * useMarketReport, so the landing page's header doesn't load the query
 * layer with it.
 *
 * @author jplacht
 */
export function prefetchMarketReport(): void {
	const component = router.resolve("/market").matched[0]?.components?.default;
	if (typeof component === "function")
		void (component as () => Promise<unknown>)().catch(() => {});
	// the store logs a failure, the page retries
	import("@/lib/query_cache/useQuery")
		.then(({ useQuery }) => useQuery("GetMarketSummary").execute())
		.catch(() => {});
}
