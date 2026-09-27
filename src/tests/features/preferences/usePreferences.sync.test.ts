import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import { usePreferences } from "@/features/preferences/usePreferences";

const patched = vi.hoisted(() => [] as unknown[]);

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			if (name === "PatchPreferences") patched.push(params);
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
});
