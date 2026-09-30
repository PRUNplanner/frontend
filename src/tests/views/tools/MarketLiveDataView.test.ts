import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";

import MarketLiveDataView from "@/views/tools/MarketLiveDataView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, sse } = vi.hoisted(() => ({
	stub: (name: string) => ({ default: { name, render: () => null } }),
	sse: {} as {
		isConnected: { value: boolean };
		cxPointTableData: { value: unknown[] };
	},
}));

vi.mock("@/features/market_live/useExchangeSSE", () => ({
	useExchangeSSE: () => ({
		connect: vi.fn(),
		disconnect: vi.fn(),
		clearEventLog: vi.fn(),
		messageHistory: ref([]),
		eventLog: ref([]),
		detectorsActive: ref(0),
		isProcessing: ref(false),
		...sse,
	}),
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/features/market_live/components/AlertManager.vue", () =>
	stub("AlertManager")
);
vi.mock("@/features/market_live/components/AlertFeed.vue", () =>
	stub("AlertFeed")
);
vi.mock("@/features/market_live/components/CXPointTable.vue", () =>
	stub("CXPointTable")
);
vi.mock("@/features/market_live/components/MessageHistory.vue", () =>
	stub("MessageHistory")
);

describe("MarketLiveDataView", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		sse.isConnected = ref(false);
		sse.cxPointTableData = ref([]);
	});

	it("reports one use once live data arrived", async () => {
		await mountComponent(MarketLiveDataView);
		sse.isConnected.value = true;
		await nextTick();
		// connected, but nothing to show yet
		expect(trackEvent).not.toHaveBeenCalled();

		sse.cxPointTableData.value = [{ ticker: "DW.AI1" }];
		await nextTick();
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "market_live",
		});

		sse.cxPointTableData.value = [
			{ ticker: "DW.AI1" },
			{ ticker: "RAT.AI1" },
		];
		await nextTick();
		expect(trackEvent).toHaveBeenCalledTimes(1);
	});
});
