import { effectScope, nextTick } from "vue";
import { describe, vi } from "vitest";
import { bench } from "@/tests/bench";
import { createPinia, setActivePinia } from "pinia";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import * as preferences from "@/features/preferences/usePreferences";

/**
 * One preference change with 40 mounted usePreferences() callers (FIO
 * Burn has one per row) and 200 plan overrides, until its watchers ran.
 * Runs unchanged on main for the before: there each caller registers its
 * own watcher, here one app-wide sync does.
 */

vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute: async () => {} }),
}));

setActivePinia(createPinia());
const userStore = useUserStore();
for (let i = 0; i < 200; i++)
	userStore.setPlanPreference(`plan-${i}`, { includeCM: i % 2 === 0 });

// before: main has no app-wide sync
(preferences as { startPreferenceSync?: () => void }).startPreferenceSync?.();
const scopes = Array.from({ length: 40 }, () => effectScope());
scopes.forEach((s) => s.run(() => preferences.usePreferences()));

let value = 1;
describe("preferences", () => {
	bench("one change, 40 callers, 200 plan overrides", async () => {
		userStore.setPreference("burnDaysRed", value++);
		await nextTick();
	});
});
