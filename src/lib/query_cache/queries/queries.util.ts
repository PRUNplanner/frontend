import { useDB } from "@/database/composables/useDB";
import type { useIndexedDBStore } from "@/database/composables/useIndexedDBStore";
import { useQueryStore } from "@/lib/query_cache/queryStore";

// Types & Interfaces
import type {
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
 * @param {number} minutes Minutes
 * @returns {number} Milliseconds, as used by `expireTime`
 */
export function staleMinutes(minutes: number): number {
	return 60_000 * minutes;
}

/**
 * Writes game data into IndexedDB and reloads the in-memory layer, so
 * synchronous readers (`getLoaded`) see the new rows.
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
	await store.setMany(data, wipe);
	await useDB(store).preload(true);
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
