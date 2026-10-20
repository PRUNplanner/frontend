import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// fresh modules per test: the navigation start is module state
async function load() {
	vi.resetModules();
	const { trackEvent } = await import("@/lib/analytics/useAnalytics");
	const nav = await import("@/lib/perf/navigationStart");
	const { useContentReady } = await import("@/lib/perf/useContentReady");

	let ready: () => Promise<void> = async () => {};
	mount(
		defineComponent({
			setup() {
				ready = useContentReady().contentReady;
				return () => h("div");
			},
		})
	);
	return { trackEvent: vi.mocked(trackEvent), nav, ready: () => ready() };
}

describe("useContentReady", () => {
	let hidden = false;

	beforeEach(() => {
		vi.clearAllMocks();
		hidden = false;
		vi.stubGlobal("requestAnimationFrame", (fn: () => void) => fn());
		vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
			hidden ? "hidden" : "visible"
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("sends perf:content_ready once, from the hard load", async () => {
		const { trackEvent, nav, ready } = await load();
		nav.markNavigationStart();

		await ready();
		await ready();
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledOnce();
		expect(trackEvent).toHaveBeenCalledWith("perf:content_ready", {
			ms: expect.any(Number),
			nav: "hard",
			loader_shown: false,
		});
	});

	it("counts an in-app navigation from its own start", async () => {
		const { trackEvent, nav, ready } = await load();
		nav.markNavigationStart();
		nav.markNavigationStart();
		expect(nav.navigationKind()).toBe("spa");
		expect(nav.navigationStartedAt()).toBeGreaterThan(0);

		await ready();
		await flushPromises();

		expect(trackEvent.mock.lastCall?.[1]).toMatchObject({ nav: "spa" });
	});

	it("sends nothing when the tab was hidden during the load", async () => {
		const { trackEvent, ready } = await load();
		hidden = true;
		document.dispatchEvent(new Event("visibilitychange"));
		hidden = false;

		await ready();
		await flushPromises();

		expect(trackEvent).not.toHaveBeenCalled();
	});
});
