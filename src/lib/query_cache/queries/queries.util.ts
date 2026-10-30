import { useDB } from "@/database/composables/useDB";
import {
	dropDB,
	getDB,
	type useIndexedDBStore,
} from "@/database/composables/useIndexedDBStore";
import { gamedataMetaStore } from "@/database/stores";
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Types & Interfaces
import type { IGameDataMeta } from "@/database/stores.types";
import type {
	IMutationDefinition,
	IQueryDefinition,
	JSONValue,
} from "@/lib/query_cache/queryCache.types";

// function declarations, not consts: the query modules call these at load
// time, inside an import cycle with the query store

/**
 * Identity helper that infers a definition's params and data from its
 * `fetchFn` and checks `key` against the same params.
 *
 * @param {IQueryDefinition<A, D>} definition Query definition
 * @returns {IQueryDefinition<A, D>} The same definition
 */
export function defineQuery<A extends [] | [unknown], D>(
	definition: IQueryDefinition<A, D>
): IQueryDefinition<A, D> {
	return definition;
}

/**
 * Marks a write, see `IMutationDefinition`. Params and data are inferred
 * from `fetchFn` as with `defineQuery`.
 *
 * @param {{ fetchFn: (...args: A) => Promise<D> }} definition Mutation
 * @returns {IMutationDefinition<A, D>} The mutation definition
 */
export function defineMutation<A extends [] | [unknown], D>(definition: {
	fetchFn: (...args: A) => Promise<D>;
}): IMutationDefinition<A, D> {
	return { fetchFn: definition.fetchFn, mutation: true };
}

/**
 * @param {number} minutes Minutes
 * @returns {number} Milliseconds, as used by `expireTime`
 */
export function staleMinutes(minutes: number): number {
	return 60_000 * minutes;
}

/**
 * Runs `fn` and records it as a performance measure `name`.
 *
 * @param {string} name Measure name, e.g. "gamedata:materials:fetch"
 * @param {() => Promise<T>} fn Work to time
 * @returns {Promise<[T, number]>} Its result and duration in ms
 */
export async function measured<T>(
	name: string,
	fn: () => Promise<T>
): Promise<[T, number]> {
	const start = performance.now();
	const result = await fn();
	const end = performance.now();
	performance.measure(name, { start, end });
	return [result, Math.round(end - start)];
}

/**
 * Writes game data into IndexedDB and reloads the in-memory layer, so
 * synchronous readers (`getLoaded`) see the new rows. If IndexedDB fails
 * (connection closed, quota exceeded), the rows go into the in-memory layer
 * only, so the query still succeeds with the API data.
 *
 * @param store IndexedDB store
 * @param {T[]} data Rows to write
 * @param {boolean} [wipe=false] Clear the store first
 */
export async function storeAndPreload<
	T extends object,
	K extends keyof T & string,
>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>,
	data: T[],
	wipe: boolean = false
): Promise<void> {
	const db = useDB(store);
	try {
		await store.setMany(data, wipe);
		await db.preload(true);
	} catch (err) {
		onDBError(store.storeName, err);
		db.fill(data, wipe);
	}
}

/**
 * IndexedDB failures keep the data in memory; a dead connection that never
 * fired `close` (WebKit reports a lost connection as UnknownError) is
 * reopened on the next call.
 *
 * @param {string} storeName Store that failed
 * @param {unknown} err Error
 */
function onDBError(storeName: string, err: unknown): void {
	if (import.meta.env.DEV)
		console.warn(
			`IndexedDB cache for '${storeName}' failed, keeping data in memory.`,
			err
		);
	if (
		err instanceof DOMException &&
		(err.name === "InvalidStateError" || err.name === "UnknownError")
	)
		dropDB();
}

/**
 * Runs `fn` `delay` ms from now, once the main thread is idle (Safari has
 * no `requestIdleCallback`: right after the delay). Idle alone is too
 * early: idle gaps open while the page still waits on the network.
 *
 * @param {() => unknown} fn Background work
 * @param {number} delay Minimum wait in ms
 */
export function whenIdle(fn: () => unknown, delay: number): void {
	setTimeout(() => {
		if (typeof requestIdleCallback === "function")
			requestIdleCallback(() => fn(), { timeout: 5000 });
		else fn();
	}, delay);
}

/**
 * Replaces a game data store and its `gamedata_meta` row in one
 * transaction: meta deleted, rows replaced, meta written last. A write cut
 * off (tab closed) rolls back, and a store without meta is never read.
 * Failures are logged, the caller keeps its in-memory data.
 *
 * @param store IndexedDB store
 * @param {T[]} data All rows
 * @param {number} fetchedAt When the rows were fetched
 */
export async function persistGameData<
	T extends object,
	K extends keyof T & string,
>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>,
	data: T[],
	fetchedAt: number
): Promise<void> {
	try {
		const db = await getDB();
		const tx = db.transaction(
			[store.storeName, gamedataMetaStore.storeName],
			"readwrite"
		);
		const rows = tx.objectStore(store.storeName);
		const meta = tx.objectStore(gamedataMetaStore.storeName);
		const row: IGameDataMeta = {
			store: store.storeName,
			fetchedAt,
			rows: data.length,
		};

		// requests run in order; await all of them, as in setMany
		await Promise.all([
			meta.delete(store.storeName),
			rows.clear(),
			...data.map((i) => rows.put(i)),
			meta.put(row),
			tx.done,
		]);
	} catch (err) {
		onDBError(store.storeName, err);
	}
}

/**
 * Reads a game data store's IndexedDB copy into the in-memory layer, if
 * its `gamedata_meta` row says it is complete and at most `maxAge` old.
 *
 * @param store IndexedDB store
 * @param {number} maxAge Oldest copy to use, in ms
 * @returns {Promise<{ fetchedAt: number | null; data: T[] | null }>} When
 * the copy was fetched (null: none), its rows (null: none or too old)
 */
export async function readGameData<
	T extends object,
	K extends keyof T & string,
>(
	store: ReturnType<typeof useIndexedDBStore<T, K>>,
	maxAge: number
): Promise<{ fetchedAt: number | null; data: T[] | null }> {
	try {
		const meta = await gamedataMetaStore.get(store.storeName);
		if (!meta) return { fetchedAt: null, data: null };
		if (Date.now() - meta.fetchedAt > maxAge)
			return { fetchedAt: meta.fetchedAt, data: null };

		const db = useDB(store);
		await db.preload(true);
		const data = db.allData.value;
		return {
			fetchedAt: meta.fetchedAt,
			data: data.length === meta.rows ? data : null,
		};
	} catch (err) {
		onDBError(store.storeName, err);
		return { fetchedAt: null, data: null };
	}
}

/**
 * Invalidates every cache entry under each key prefix, in order.
 *
 * @param {JSONValue[]} prefixes Key prefixes, e.g. ["planningdata", "plan"]
 */
export async function invalidate(...prefixes: JSONValue[]): Promise<void> {
	const queryStore = useQueryStore();
	for (const prefix of prefixes)
		await queryStore.invalidateKey(prefix, { exact: false });
}
