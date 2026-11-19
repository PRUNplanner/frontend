import { describe, expect, it } from "vitest";

import { clientName } from "@/mcp/app";
import { bridgeUserAgent } from "@/mcp/bridge/userAgent";

describe("bridgeUserAgent", () => {
	it("names the host from its initialize clientInfo", () => {
		const agent = bridgeUserAgent(
			{ name: "claude-ai", version: "0.1.0" },
			"0.37.0"
		);
		expect(agent).toBe("claude-ai/0.1.0 (PRUNplanner .mcpb 0.37.0)");
		// what the server logs as client_name
		expect(clientName(agent)).toBe("claude-ai");
	});

	it("falls back before initialize and for odd values", () => {
		expect(bridgeUserAgent(undefined, "0.37.0")).toBe(
			"mcpb-host/unknown (PRUNplanner .mcpb 0.37.0)"
		);
		const agent = bridgeUserAgent(
			{ name: "Claude Desktop\r\nX: 1", version: 3 },
			"0.37.0"
		);
		expect(agent).toBe(
			"Claude-Desktop-X-1/unknown (PRUNplanner .mcpb 0.37.0)"
		);
		expect(clientName(agent)).toBe("Claude-Desktop-X-1");
	});
});
