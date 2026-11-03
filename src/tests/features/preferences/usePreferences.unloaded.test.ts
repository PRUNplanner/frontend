import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import { startPreferenceSync } from "@/features/preferences/usePreferences";

const patched = vi.hoisted(() => [] as unknown[]);

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			if (name === "PatchPreferences") patched.push(params);
		},
	}),
}));
// the user API never finishes loading
vi.mock("@/features/api/userData.api", () => new Promise(() => {}));

describe("usePreferences: leaving before the user API loaded", () => {
	it("falls back to the debounced sync, no keepalive", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		setActivePinia(createPinia());
		const userStore = useUserStore();
		const stopSync = startPreferenceSync();
		userStore.setToken("access-a", "refresh-a");

		userStore.setPreference("burnDaysRed", 6);
		await nextTick();
		window.dispatchEvent(new Event("pagehide"));
		await vi.waitFor(() => expect(patched).toHaveLength(1));

		expect(patched[0]).toStrictEqual({ burnDaysRed: 6 });
		expect(fetchMock).not.toHaveBeenCalled();
		stopSync();
		vi.unstubAllGlobals();
	});
});
