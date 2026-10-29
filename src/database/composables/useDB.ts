import { type ShallowRef, shallowRef } from "vue";

import type { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";

interface SharedState<T extends object, K extends keyof T> {
	allData: ShallowRef<T[]>;
	cache: Map<T[K], T>;
	loaded: boolean;
}

const storeStateMap = new WeakMap<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ReturnType<typeof useIndexedDBStore<any, any>>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	SharedState<any, any>
>();

// Ensures a store is created and stored in the map
function ensureState<T extends object, K extends keyof T & string>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>
): SharedState<T, K> {
	let state = storeStateMap.get(store) as SharedState<T, K> | undefined;
	if (!state) {
		state = {
			allData: shallowRef<T[]>([]),
			cache: new Map<T[K], T>(),
			loaded: false,
		};
		storeStateMap.set(store, state);
	}
	return state;
}

export function useDB<T extends object, K extends keyof T & string>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>
) {
	// The type of the key itself
	type KeyType = T[K] extends IDBValidKey ? T[K] : never;

	const state = ensureState(store);

	async function preload(force: boolean = false) {
		// skip if already loaded
		if (!force && state.loaded) return;

		fill(await store.getAll(), true);
	}

	/**
	 * Loads rows into the in-memory layer without IndexedDB, for when the
	 * database can't be written or read.
	 *
	 * @param {T[]} rows Rows to load
	 * @param {boolean} replace Drop the rows already loaded, else upsert
	 */
	function fill(rows: T[], replace: boolean) {
		if (replace) state.cache.clear();

		for (const item of rows) {
			state.cache.set(item[store.keyPath], item);
		}

		state.allData.value = replace ? rows : [...state.cache.values()];
		state.loaded = true;
	}

	async function get(key: KeyType): Promise<T | undefined> {
		// return from cache
		if (state.cache.has(key)) return state.cache.get(key)!;

		// check in database
		const item = await store.get(key);
		if (item) state.cache.set(key, item);
		return item;
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
		return state.cache.get(key);
	}

	return {
		allData: state.allData,
		cacheData: state.cache,
		preload,
		fill,
		get,
		getLoaded,
	};
}
