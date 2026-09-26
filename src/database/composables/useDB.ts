import { Ref, ref } from "vue";

import { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";

type SharedState<T extends object> = {
	allData: ReturnType<typeof ref<T[]>>;
	cache: Map<string, T>;
	loaded: boolean;
};

const storeStateMap = new WeakMap<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ReturnType<typeof useIndexedDBStore<any, any>>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	SharedState<any>
>();

// Ensures a store is created and stored in the map
function ensureState<T extends object, K extends keyof T & string>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>
): SharedState<T> {
	let state = storeStateMap.get(store) as SharedState<T> | undefined;
	if (!state) {
		state = {
			allData: ref<T[]>([]) as Ref<T[]>,
			cache: new Map<string, T>(),
			loaded: false,
		};
		storeStateMap.set(store, state);
	}
	return state;
}

export function useDB<T extends object, K extends keyof T & string>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>
) {
	// The key prop literal type
	type KeyProp = typeof store.keyPath extends keyof T
		? typeof store.keyPath
		: never;

	// The type of the key itself
	type KeyType = T[KeyProp] extends IDBValidKey ? T[KeyProp] : never;

	const state = ensureState(store);

	async function preload(force: boolean = false) {
		// skip if already loaded
		if (!force && state.loaded) return;

		const all = await store.getAll();

		state.allData.value = all;
		state.cache.clear();

		for (const item of all) {
			// @ts-expect-error keyPath dynamically
			state.cache.set(item[store.keyPath], item);
		}

		state.loaded = true;
	}

	async function get(key: KeyType): Promise<T | undefined> {
		// return from cache
		if (state.cache.has(key as string))
			return state.cache.get(key as string)! as T;

		// check in database
		const item = await store.get(key);
		if (item) state.cache.set(key as string, item);
		return item as T;
	}

	/**
	 * Synchronous read from the in-memory cache, for code that runs after
	 * preload (the game data queries preload every store they fill).
	 * Throws if the store has not been preloaded.
	 */
	function getLoaded(key: KeyType): T | undefined {
		if (!state.loaded)
			throw new Error(
				`No data: store '${store.storeName}' is not loaded. Ensure game data has been loaded before calculating.`
			);
		return state.cache.get(key as string);
	}

	return {
		allData: state.allData,
		cacheData: state.cache,
		preload,
		get,
		getLoaded,
	};
}
