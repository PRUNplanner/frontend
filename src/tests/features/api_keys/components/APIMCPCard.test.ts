import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";

import APIMCPCard from "@/features/api_keys/components/APIMCPCard.vue";
import { mountComponent } from "@/tests/mountComponent";
import { copyToClipboard } from "@/util/data";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import {
	MCP_BUNDLE_URL,
	MCP_SERVER_URL,
} from "@/features/api_keys/apiEndpoints";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@/util/data", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/util/data")>()),
	copyToClipboard: vi.fn(async () => true),
}));

describe("APIMCPCard", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows the production server URL and the header", async () => {
		const { wrapper } = await mountComponent(APIMCPCard);
		expect(MCP_SERVER_URL).toBe("https://mcp.prunplanner.org/mcp");
		expect(wrapper.find('[data-testid="mcp-url"]').text()).toBe(
			MCP_SERVER_URL
		);
		expect(wrapper.text()).toContain("Authorization: Api-Key <YOUR_KEY>");
	});

	it("copies the URL and tracks it", async () => {
		const { wrapper } = await mountComponent(APIMCPCard);
		await wrapper.find('[data-testid="mcp-copy"]').trigger("click");
		await flushPromises();
		expect(copyToClipboard).toHaveBeenCalledWith(MCP_SERVER_URL);
		expect(trackEvent).toHaveBeenCalledWith("apikey:mcp_url_copy");
	});

	it("tracks no copy that failed", async () => {
		vi.mocked(copyToClipboard).mockResolvedValueOnce(false);
		const { wrapper } = await mountComponent(APIMCPCard);
		await wrapper.find('[data-testid="mcp-copy"]').trigger("click");
		await flushPromises();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("links the latest .mcpb and tracks the download", async () => {
		const { wrapper } = await mountComponent(APIMCPCard);
		const link = wrapper.find('[data-testid="mcp-download"]');
		expect(link.attributes("href")).toBe(MCP_BUNDLE_URL);
		expect(MCP_BUNDLE_URL).toBe(
			"https://github.com/PRUNplanner/frontend/releases/latest/download/prunplanner.mcpb"
		);
		await link.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("apikey:mcpb_download");
	});

	it("links the mcp help article", async () => {
		const { wrapper } = await mountComponent(APIMCPCard);
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/help/mcp"
		);
	});
});
