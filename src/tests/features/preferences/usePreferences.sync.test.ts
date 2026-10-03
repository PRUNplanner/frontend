import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import { usePreferences } from "@/features/preferences/usePreferences";

const patched = vi.hoisted(() => [] as unknown[]);
// number of upcoming PatchPreferences calls that fail
const failures = vi.hoisted(() => ({ left: 0 }));

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

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		userStore = useUserStore();
		patched.length = 0;
		failures.left = 0;
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("sends a change after the debounce", async () => {
		userStore.setToken("access-a", "refresh-a");
		const { defaultEmpireUuid } = usePreferences();

		defaultEmpireUuid.value = "empire-a";
		await nextTick();
		await vi.advanceTimersByTimeAsync(5000);

		expect(patched).toHaveLength(1);
		expect(patched[0]).toMatchObject({ defaultEmpireUuid: "empire-a" });
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
});
