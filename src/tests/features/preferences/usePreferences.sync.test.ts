import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { effectScope, nextTick, type WatchHandle } from "vue";
import { createPinia, setActivePinia } from "pinia";

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

	it("sends a pending change at once when the page is left", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { burnDaysRed } = usePreferences();

		burnDaysRed.value = 3;
		await nextTick();
		window.dispatchEvent(new Event("pagehide"));
		await vi.advanceTimersByTimeAsync(0);

		expect(patched).toStrictEqual([{ burnDaysRed: 3 }]);
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
