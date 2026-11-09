import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { effectScope, nextTick, type WatchHandle } from "vue";
import { createPinia, setActivePinia } from "pinia";

import config from "@/lib/config";
import { useUserStore } from "@/stores/userStore";
import {
	startPreferenceSync,
	usePreferences,
} from "@/features/preferences/usePreferences";

const patched = vi.hoisted(() => [] as unknown[]);
// number of upcoming PatchPreferences calls that fail
const failures = vi.hoisted(() => ({ left: 0 }));
// calls of the debounced sync, one per watcher callback
const scheduled = vi.hoisted(() => ({ count: 0 }));

vi.mock("lodash-es", async (importOriginal) => {
	const lodash = await importOriginal<typeof import("lodash-es")>();
	return {
		...lodash,
		debounce: ((fn: (...args: unknown[]) => unknown, ms: number) => {
			const debounced = lodash.debounce(fn, ms);
			if (ms !== 5000) return debounced;
			return Object.assign(
				(...args: unknown[]) => {
					scheduled.count++;
					return debounced(...args);
				},
				{ flush: debounced.flush, cancel: debounced.cancel }
			);
		}) as typeof lodash.debounce,
	};
});

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			if (name !== "PatchPreferences") return;
			patched.push(params);
			if (failures.left-- > 0) throw new Error("network");
		},
	}),
}));
const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/ui/useToast", () => ({ toast: mocks.toast }));
// setToken loads the profile
vi.mock("@/features/api/userData.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/api/userData.api")>()),
	callGetProfile: vi.fn(() => new Promise(() => {})),
}));

describe("usePreferences: backend sync", () => {
	let userStore: ReturnType<typeof useUserStore>;
	let stopSync: WatchHandle;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		userStore = useUserStore();
		stopSync = startPreferenceSync();
		scheduled.count = 0;
		patched.length = 0;
		failures.left = 0;
		mocks.toast.mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => stopSync());

	it("sends a change after the debounce", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { defaultEmpireUuid } = usePreferences();

		defaultEmpireUuid.value = "empire-a";
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(patched).toHaveLength(1);
		expect(patched[0]).toMatchObject({ defaultEmpireUuid: "empire-a" });
	});

	it("sends only what changed: keys, overrides per uuid, null removals", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { burnDaysRed } = usePreferences();
		userStore.setPlanPreference("plan-a", { includeCM: true });
		userStore.setPlanPreference("plan-b", { includeCM: true });
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);
		expect(Object.keys(patched[0] as object)).toStrictEqual([
			"planOverrides",
		]);
		patched.length = 0;

		burnDaysRed.value = 2;
		userStore.setPlanPreference("plan-a", { includeCM: false });
		delete userStore.preferences.planOverrides["plan-b"];
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(patched).toStrictEqual([
			{
				burnDaysRed: 2,
				planOverrides: {
					"plan-a": expect.objectContaining({ includeCM: false }),
					"plan-b": null,
				},
			},
		]);

		// nothing left to send
		burnDaysRed.value = 2;
		await vi.advanceTimersByTimeAsync(5000);
		expect(patched).toHaveLength(1);
	});

	it("sends nothing when a change was undone before the sync", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { burnDaysRed } = usePreferences();
		const original = burnDaysRed.value;

		burnDaysRed.value = original + 1;
		await nextTick();
		burnDaysRed.value = original;
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(scheduled.count).toBeGreaterThan(0);
		expect(patched).toHaveLength(0);
	});

	describe("leaving the page", () => {
		let fetchMock: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			fetchMock = vi.fn(() => Promise.resolve(new Response("{}")));
			vi.stubGlobal("fetch", fetchMock);
		});

		afterEach(() => vi.unstubAllGlobals());

		const leave = async () => {
			await vi.dynamicImportSettled();
			window.dispatchEvent(new Event("pagehide"));
		};

		it("sends a pending change at once with a keepalive PATCH", async () => {
			userStore.setToken("access-a", "refresh-a");
			const { burnDaysRed } = usePreferences();

			burnDaysRed.value = 3;
			await nextTick();
			await leave();

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0] as [
				string,
				RequestInit,
			];
			expect(url).toBe(`${config.API_BASE_URL}/user/preferences/`);
			expect(init).toMatchObject({
				method: "PATCH",
				keepalive: true,
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					Authorization: "Bearer access-a",
				}),
			});
			expect(JSON.parse(init.body as string)).toStrictEqual({
				burnDaysRed: 3,
			});

			// sent once: the debounced sync doesn't follow
			await vi.advanceTimersByTimeAsync(5000);
			expect(patched).toHaveLength(0);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it("sends nothing without a pending change", async () => {
			userStore.setToken("access-a", "refresh-a");
			const { burnDaysRed } = usePreferences();
			burnDaysRed.value = 4;
			await nextTick();
			await vi.advanceTimersByTimeAsync(5000);
			expect(patched).toHaveLength(1);

			await leave();

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("sends nothing when logged out", async () => {
			const { burnDaysRed } = usePreferences();

			burnDaysRed.value = 5;
			await nextTick();
			await leave();

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	it("never sends a pending sync as the next logged in user", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { defaultEmpireUuid } = usePreferences();

		defaultEmpireUuid.value = "empire-a";
		await nextTick();

		// logout resets the preferences, another user logs in quickly
		userStore.logout();
		await nextTick();
		userStore.setToken("access-b", "refresh-b");
		await vi.advanceTimersByTimeAsync(5000);

		expect(patched).toHaveLength(0);
	});

	it("retries a failed sync once on the next debounce", async () => {
		failures.left = 5;
		userStore.setToken("access-a", "refresh-a");
		const { defaultEmpireUuid } = usePreferences();

		defaultEmpireUuid.value = "empire-a";
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);
		expect(patched).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(5000);
		expect(patched).toHaveLength(2);
		expect(patched[1]).toMatchObject({ defaultEmpireUuid: "empire-a" });

		// a second failure is not retried again
		await vi.advanceTimersByTimeAsync(20000);
		expect(patched).toHaveLength(2);
	});

	it("says once when a failed sync holds the layout, not for other keys", async () => {
		failures.left = 5;
		userStore.setToken("access-a", "refresh-a");
		const { defaultEmpireUuid } = usePreferences();

		defaultEmpireUuid.value = "empire-a";
		await nextTick();
		await vi.advanceTimersByTimeAsync(10000);
		expect(mocks.toast).not.toHaveBeenCalled();

		userStore.setPreference("planLayout", {
			v: 1,
			preset: "standard",
			custom: null,
			folded: { wide: ["planet"], phone: [] },
		});
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);
		expect(patched.at(-1)).toMatchObject({
			planLayout: { folded: { wide: ["planet"], phone: [] } },
		});
		// its retry fails too: no second toast, the change stays unsynced
		await vi.advanceTimersByTimeAsync(5000);
		expect(mocks.toast).toHaveBeenCalledTimes(1);
		expect(mocks.toast).toHaveBeenCalledWith(
			expect.stringContaining("Layout not saved to your account yet"),
			{ type: "error" }
		);
	});

	it("one change runs one sync and one PATCH, however many callers", async () => {
		userStore.setToken("access-a", "refresh-a");
		const scopes = Array.from({ length: 40 }, () => effectScope());
		const callers = scopes.map((s) => s.run(() => usePreferences())!);
		scheduled.count = 0;

		callers[0].burnDaysRed.value = 3;
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(scheduled.count).toBe(1);
		expect(patched).toStrictEqual([{ burnDaysRed: 3 }]);
		scopes.forEach((s) => s.stop());
	});

	it("syncs a store change without any caller", async () => {
		userStore.setToken("access-a", "refresh-a");

		userStore.setPreference("burnDaysRed", 4);
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(patched).toStrictEqual([{ burnDaysRed: 4 }]);
	});
});
