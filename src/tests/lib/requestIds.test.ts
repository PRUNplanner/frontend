import { describe, it, expect, vi, beforeEach } from "vitest";

import { memoryStorage } from "@/tests/memoryStorage";

const { getSessionId } = vi.hoisted(() => ({
	getSessionId: vi.fn<() => string | undefined>(),
}));
vi.mock("@/lib/analytics/usePostHog", () => ({ getSessionId }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// a fresh copy is a new tab
async function tab() {
	vi.resetModules();
	return (await import("@/lib/requestIds")).correlationId;
}

describe("correlationId", () => {
	beforeEach(() => {
		getSessionId.mockReturnValue(undefined);
		vi.stubGlobal("localStorage", memoryStorage());
		vi.stubGlobal("sessionStorage", memoryStorage());
	});

	it("is one id per tab without PostHog, never stored", async () => {
		const correlationId = await tab();
		const id = correlationId();

		expect(id).toMatch(UUID);
		expect(correlationId()).toBe(id);
		expect((await tab())()).not.toBe(id);
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
	});

	it("is PostHog's session id while PostHog runs", async () => {
		const correlationId = await tab();
		getSessionId.mockReturnValue("ph-session");

		expect(correlationId()).toBe("ph-session");
	});
});
