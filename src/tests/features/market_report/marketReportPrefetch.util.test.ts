import { describe, expect, it, vi } from "vitest";

import router from "@/router";
import { useQuery } from "@/lib/query_cache/useQuery";
import { prefetchMarketReport } from "@/features/market_report/marketReportPrefetch.util";

const execute = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: vi.fn(() => ({ execute })),
}));

describe("prefetchMarketReport", () => {
	it("loads the route chunk and starts the summary", async () => {
		const chunk = vi.fn().mockResolvedValue({});
		vi.spyOn(router, "resolve").mockReturnValue({
			matched: [{ components: { default: chunk } }],
		} as unknown as ReturnType<typeof router.resolve>);

		prefetchMarketReport();

		expect(chunk).toHaveBeenCalledOnce();
		await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
		expect(useQuery).toHaveBeenCalledWith("GetMarketSummary");
	});
});
