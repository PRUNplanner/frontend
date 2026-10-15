import { computed, ref, shallowRef, type Ref } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Util
import { deepClone } from "@/util/data";
import { changedScopes } from "@/features/exchanges/cxEdit.util";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";

const EMPTY: CXData = {
	cx_empire: [],
	cx_planets: [],
	ticker_empire: [],
	ticker_planets: [],
};

/**
 * The Exchanges page's edit state: the CX as loaded (an inert clone of
 * the store's), its edited name and rules, and what changed
 * @author jplacht
 */
export function useExchangeEdit() {
	const planningStore = usePlanningStore();

	const loaded = shallowRef<CX | null>(null);
	const name: Ref<string> = ref("");
	const data: Ref<CXData> = ref(deepClone(EMPTY));

	/**
	 * Loads a CX from the store, dropping any edits
	 *
	 * @param {string} cxUuid CX Uuid
	 */
	function load(cxUuid: string): void {
		loaded.value = planningStore.getCX(cxUuid);
		discard();
	}

	/** back to the loaded CX */
	function discard(): void {
		name.value = loaded.value?.cx_name ?? "";
		data.value = deepClone(loaded.value?.cx_data ?? EMPTY);
	}

	const changed = computed(() =>
		loaded.value ? changedScopes(loaded.value.cx_data, data.value) : []
	);

	// the save bar's count: changed scopes and the name
	const changeCount = computed(
		() =>
			changed.value.length +
			(loaded.value && name.value !== loaded.value.cx_name ? 1 : 0)
	);

	return { loaded, name, data, load, discard, changeCount };
}
