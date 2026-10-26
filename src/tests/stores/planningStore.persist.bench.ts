import { createApp, nextTick } from "vue";
import { describe, vi } from "vitest";
import { bench } from "@/tests/bench";
import { createPinia, setActivePinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { FIOStorage } from "@/features/api/schemas/gameData.schemas";

// test data
import plan_etherwind from "@/tests/test_data/api_data_plan_etherwind.json";
import fio_storage from "@/tests/test_data/api_data_fio_storage.json";

/**
 * Baseline: one plan save with 100 plans and FIO storage in the store,
 * including the full persist write to localStorage the plugin makes on
 * every change (an in-memory localStorage, so serialisation only)
 */

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
	getItem: (key: string) => stored.get(key) ?? null,
	setItem: (key: string, value: string) => stored.set(key, value),
	removeItem: (key: string) => stored.delete(key),
});

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
createApp({}).use(pinia);
setActivePinia(pinia);
const store = usePlanningStore();

const plan = plan_etherwind as unknown as Plan;
for (let i = 0; i < 100; i++) store.setPlan({ ...plan, uuid: `plan-${i}` });
store.setFIOStorageData(fio_storage as unknown as FIOStorage);
await new Promise((r) => setTimeout(r, 0));
console.log(
	`[size] prunplanner_planning: ${Math.round(
		(stored.get("prunplanner_planning")?.length ?? 0) / 1024
	)} KB`
);

let n = 0;
describe("planning store persist", () => {
	bench("setPlan + persist, 100 plans and FIO storage", async () => {
		store.setPlan({ ...plan, uuid: "plan-0", plan_name: `edit ${n++}` });
		// the plugin writes from a pre-flush $subscribe
		await nextTick();
	});
});
