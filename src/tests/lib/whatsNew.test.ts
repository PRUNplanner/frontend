import { describe, it, expect, vi, beforeEach } from "vitest";
import { memoryStorage } from "@/tests/memoryStorage";

const { toast, trackEvent } = vi.hoisted(() => ({
	toast: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@/ui/useToast", () => ({ toast }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));

import { announceRelease } from "@/lib/whatsNew";

const KEY = "prunplanner_seen_release";

describe("announceRelease", () => {
	const open = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
		toast.mockReset();
		trackEvent.mockReset();
		open.mockReset();
	});

	it("only remembers the release on the first visit", () => {
		announceRelease(open);

		expect(toast).not.toHaveBeenCalled();
		expect(localStorage.getItem(KEY)).toBe(__APP_VERSION__);
	});

	it("stays quiet on the same release", () => {
		localStorage.setItem(KEY, __APP_VERSION__);
		announceRelease(open);

		expect(toast).not.toHaveBeenCalled();
	});

	it("shows one toast after a bump, its action opens the changelog", () => {
		localStorage.setItem(KEY, "0.0.1");
		announceRelease(open);
		announceRelease(open);

		expect(toast).toHaveBeenCalledOnce();
		const [text, options] = toast.mock.calls[0];
		expect(text).toBe(`PRUNplanner ${__APP_VERSION__} is here`);
		expect(options.duration).toBe(10_000);
		expect(localStorage.getItem(KEY)).toBe(__APP_VERSION__);

		options.action.onClick();
		expect(trackEvent).toHaveBeenCalledWith("app:whats_new_click");
		expect(open).toHaveBeenCalledOnce();
	});

	it("stays quiet when storage is blocked", () => {
		const blocked = () => {
			throw new DOMException("blocked", "SecurityError");
		};
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });

		expect(() => announceRelease(open)).not.toThrow();
		expect(toast).not.toHaveBeenCalled();
	});
});
