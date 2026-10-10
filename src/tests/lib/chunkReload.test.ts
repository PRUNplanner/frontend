import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Router } from "vue-router";

const messageError = vi.fn();
vi.mock("naive-ui", () => ({
	darkTheme: {},
	createDiscreteApi: () => ({ message: { error: messageError } }),
}));

import {
	isChunkLoadError,
	registerChunkReload,
	reloadOnce,
} from "@/lib/chunkReload";

describe("chunkReload", () => {
	const reload = vi.fn();
	const assign = vi.fn();
	// registerChunkReload adds a window listener per test
	const listeners: EventListener[] = [];
	const addEventListener = window.addEventListener.bind(window);

	beforeEach(() => {
		vi.useFakeTimers();
		sessionStorage.clear();
		reload.mockReset();
		assign.mockReset();
		messageError.mockReset();
		vi.stubGlobal("location", { reload, assign });
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(window, "addEventListener").mockImplementation(
			(type: string, listener: EventListenerOrEventListenerObject) => {
				listeners.push(listener as EventListener);
				addEventListener(type, listener);
			}
		);
	});

	afterEach(() => {
		listeners
			.splice(0)
			.forEach((l) => window.removeEventListener("vite:preloadError", l));
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("recognises failed dynamic imports", () => {
		expect(
			isChunkLoadError(
				new TypeError(
					"Failed to fetch dynamically imported module: /assets/a.js"
				)
			)
		).toBe(true);
		expect(
			isChunkLoadError(new TypeError("Importing a module script failed."))
		).toBe(true);
		expect(isChunkLoadError(new Error("Request failed"))).toBe(false);
	});

	it("reloads once, then not again within 30 s", () => {
		expect(reloadOnce()).toBe(true);
		expect(reload).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(29_000);
		expect(reloadOnce()).toBe(false);
		expect(reload).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(2_000);
		expect(reloadOnce("/help")).toBe(true);
		expect(assign).toHaveBeenCalledWith("/help");
	});

	function mockRouter() {
		const hooks = {
			before: vi.fn(),
			after: vi.fn(),
			error: vi.fn(),
		};
		registerChunkReload({
			beforeEach: hooks.before,
			afterEach: hooks.after,
			onError: hooks.error,
		} as unknown as Router);
		return {
			navigate: () => hooks.before.mock.calls[0][0](),
			arrive: () => hooks.after.mock.calls[0][0](),
			fail: (error: unknown, fullPath: string) =>
				hooks.error.mock.calls[0][0](error, { fullPath }),
		};
	}

	function preloadError(message: string): Event {
		const event = new Event("vite:preloadError", { cancelable: true });
		Object.assign(event, { payload: new TypeError(message) });
		window.dispatchEvent(event);
		return event;
	}

	const missing = "Failed to fetch dynamically imported module: /assets/b.js";

	it("reloads once on a failed chunk outside a navigation", () => {
		mockRouter();

		expect(preloadError(missing).defaultPrevented).toBe(true);
		expect(preloadError(missing).defaultPrevented).toBe(false);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("leaves posthog and other errors alone", () => {
		mockRouter();

		preloadError(
			"Failed to fetch dynamically imported module: /assets/chunks/vendor_posthog.x.js"
		);
		preloadError("something else");
		expect(reload).not.toHaveBeenCalled();
	});

	it("reloads to the target route during a navigation, then shows the error", () => {
		const router = mockRouter();
		const error = new TypeError(missing);

		router.navigate();
		// Vite reports the failed import first: the router handles it
		expect(preloadError(missing).defaultPrevented).toBe(false);
		expect(reload).not.toHaveBeenCalled();

		router.fail(error, "/help");
		expect(assign).toHaveBeenCalledWith("/help");
		expect(messageError).not.toHaveBeenCalled();

		router.navigate();
		router.fail(error, "/help");
		expect(assign).toHaveBeenCalledTimes(1);
		expect(messageError).toHaveBeenCalledTimes(1);

		// other router errors are left alone
		router.fail(new Error("guard failed"), "/x");
		expect(messageError).toHaveBeenCalledTimes(1);
	});

	it("handles chunks again after the navigation ended", () => {
		const router = mockRouter();
		router.navigate();
		router.arrive();

		expect(preloadError(missing).defaultPrevented).toBe(true);
	});
});
