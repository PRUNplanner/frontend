import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { memoryStorage } from "@/tests/memoryStorage";

// __BUILD_ID__ is "dev" in vitest
const THIS_BUILD = "dev";

// module-level state: a fresh module per test, like a new tab
async function freshTab() {
	vi.resetModules();
	const { useVersionCheck } = await import("@/lib/useVersionCheck");
	return useVersionCheck();
}

describe("useVersionCheck", () => {
	let deployed: unknown = { version: THIS_BUILD };
	const fetchMock = vi.fn(async () => ({ json: async () => deployed }));
	let visibility: DocumentVisibilityState = "visible";
	const listeners: [EventTarget, string, EventListener][] = [];

	function setVisibility(value: DocumentVisibilityState): void {
		visibility = value;
		document.dispatchEvent(new Event("visibilitychange"));
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubEnv("DEV", false);
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockClear();
		deployed = { version: THIS_BUILD };
		visibility = "visible";
		// one storage for all tabs, like the browser
		vi.stubGlobal("localStorage", memoryStorage());
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => visibility,
		});
		// startWatch adds listeners per module instance
		for (const target of [document, window]) {
			const add = target.addEventListener.bind(target);
			vi.spyOn(target, "addEventListener").mockImplementation(
				(type: string, listener: EventListenerOrEventListenerObject) => {
					listeners.push([target, type, listener as EventListener]);
					add(type, listener);
				}
			);
		}
	});

	afterEach(() => {
		listeners
			.splice(0)
			.forEach(([target, type, l]) =>
				target.removeEventListener(type, l)
			);
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("shows nothing while the server runs this build, whatever is stored", async () => {
		localStorage.setItem("prunplanner_version", "something-else");
		const { updateAvailable, showNotice, startWatch } = await freshTab();

		startWatch();
		await vi.advanceTimersByTimeAsync(0);

		expect(fetchMock).toHaveBeenCalledWith("/version.json", {
			cache: "no-cache",
		});
		expect(updateAvailable.value).toBe(false);
		expect(showNotice.value).toBe(false);
		// the old shared key is gone
		expect(localStorage.getItem("prunplanner_version")).toBeNull();
	});

	it("tells every tab on its own, one reloading doesn't hide it in the other", async () => {
		const tabA = await freshTab();
		const tabB = await freshTab();
		deployed = { version: "new-build" };

		await tabA.checkVersion();
		await tabB.checkVersion();
		expect(tabA.showNotice.value).toBe(true);
		expect(tabB.showNotice.value).toBe(true);

		// tab A reloads onto the new build: nothing it does reaches tab B
		const reloadedA = await freshTab();
		await reloadedA.checkVersion();
		await tabB.checkVersion();
		expect(tabB.showNotice.value).toBe(true);
		expect(localStorage.length).toBe(0);
	});

	it("ignores failed checks and non-JSON answers", async () => {
		const { updateAvailable, checkVersion } = await freshTab();

		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await checkVersion();
		expect(updateAvailable.value).toBe(false);

		// the SPA fallback during a deploy
		fetchMock.mockResolvedValueOnce({
			json: async () => {
				throw new SyntaxError("Unexpected token <");
			},
		});
		await checkVersion();
		deployed = { other: 1 };
		await checkVersion();

		expect(updateAvailable.value).toBe(false);
	});

	it("is off in dev mode", async () => {
		vi.stubEnv("DEV", true);
		const { startWatch, checkVersion } = await freshTab();

		startWatch();
		await checkVersion();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("polls every 5 minutes, only while visible", async () => {
		const { startWatch } = await freshTab();
		startWatch();
		startWatch(); // once per tab
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		setVisibility("hidden");
		await vi.advanceTimersByTimeAsync(30 * 60_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// back in view: one check right away
		setVisibility("visible");
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("checks on focus and online at most once a minute", async () => {
		const { startWatch } = await freshTab();
		startWatch();
		await vi.advanceTimersByTimeAsync(0);

		setVisibility("hidden");
		setVisibility("visible");
		window.dispatchEvent(new Event("online"));
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(60_000);
		window.dispatchEvent(new Event("online"));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("doesn't check at start in a hidden tab", async () => {
		visibility = "hidden";
		const { startWatch } = await freshTab();

		startWatch();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("stops polling once an update was found, until Later", async () => {
		deployed = { version: "new-build" };
		const { startWatch, showNotice, showChip, later } = await freshTab();
		startWatch();
		await vi.advanceTimersByTimeAsync(0);
		expect(showNotice.value).toBe(true);

		await vi.advanceTimersByTimeAsync(30 * 60_000);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		later();
		expect(showNotice.value).toBe(false);
		expect(showChip.value).toBe(true);

		// still the same build: stays dismissed
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(showNotice.value).toBe(false);

		// an even newer build shows the notice again
		deployed = { version: "newer-build" };
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(showNotice.value).toBe(true);
		expect(showChip.value).toBe(false);
	});

	it("markOutdated shows the notice, Later doesn't hide it", async () => {
		const { markOutdated, later, outdated, showNotice } = await freshTab();

		markOutdated();
		later();

		expect(outdated.value).toBe(true);
		expect(showNotice.value).toBe(true);
	});
});
