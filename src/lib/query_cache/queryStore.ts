import { shallowReactive } from "vue";
import { defineStore } from "pinia";

import { userActivity } from "@/features/user_activity/userActivityStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";
import {
	batchRefresh,
	type IBatchRefresh,
} from "@/lib/query_cache/queryBatches";
import { isSubset, toCacheKey } from "@/lib/query_cache/cacheKeys";
import { onSessionReset } from "@/lib/sessionReset";
import { reportClientError } from "@/lib/clientErrors";

import type {
	IMutationDefinition,
	IQueryDefinition,
	IQueryState,
	JSONValue,
} from "@/lib/query_cache/queryCache.types";
import type {
	QueryData,
	QueryName,
	QueryParams,
} from "@/lib/query_cache/queryRepository.types";

/**
 * Network failure, server error or 429 (status set by apiService's
 * normalizeError), worth retrying; validation errors and QueryLoopError
 * carry no status
 *
 * @param {Error} err Error
 * @returns {boolean} Transient error
 */
function isTransientError(err: Error): boolean {
	if (!("status" in err)) return false;
	const status = (err as { status?: number }).status;
	return status === undefined || status === 429 || status >= 500;
}

/**
 * Fetch budget per cache key, the guard against request loops: more than
 * `fetches` network fetches of one key within `windowMs` block its fetches
 * for `blockMs`. Changed by tests only.
 */
export const queryLoopGuard = {
	fetches: 5,
	windowMs: 10_000,
	blockMs: 30_000,
};

/**
 * A fetch the budget blocked while the key has no data. No status, so the
 * status watcher doesn't retry it.
 */
export class QueryLoopError extends Error {
	constructor(definitionName: string) {
		super(`${definitionName} fetched too often, paused`);
		this.name = "QueryLoopError";
	}
}

/**
 * The one freshness rule: an entry without expireTime never expires, else
 * it is fresh for expireTime after its last successful fetch
 *
 * @param {Pick<IQueryState<unknown, unknown>, "timestamp" | "expireTime">} entry Cache entry
 * @param {number} [now=Date.now()] Current time
 * @returns {boolean} Fresh
 */
export function isFresh(
	entry: Pick<IQueryState<unknown, unknown>, "timestamp" | "expireTime">,
	now: number = Date.now()
): boolean {
	return !entry.expireTime || now - entry.timestamp <= entry.expireTime;
}

/**
 * Untyped fetch of any definition, for the batch refresh
 *
 * @param {QueryName} name Query name
 * @returns {(params: unknown) => Promise<unknown>} Its fetchFn
 */
function fetchOf(name: QueryName): (params: unknown) => Promise<unknown> {
	return getQueryDefinition(name).fetchFn as (
		params: unknown
	) => Promise<unknown>;
}

export const useQueryStore = defineStore(
	"prunplanner_query_store",
	() => {
		const inFlight = new Map<string, Promise<unknown>>();
		// fetch budget: recent network fetches and block end per key, and
		// the keys this tab reported a loop of
		const fetchTimes = new Map<string, number[]>();
		const blockedUntil = new Map<string, number>();
		const loopReported = new Set<string>();
		// one fetch per blocked key when its block ends
		const blockTimers = new Map<string, ReturnType<typeof setTimeout>>();

		// shallow, and so is each entry (updateState): their fields are
		// tracked, but a cache hit returns the raw data a fresh fetch
		// returned, not a deep proxy of it
		const cacheState = shallowReactive<
			Record<string, IQueryState<unknown, unknown>>
		>({});

		function deleteState(key: string) {
			delete cacheState[key];
		}

		function $reset(): void {
			Object.keys(cacheState).forEach((key) => delete cacheState[key]);
			inFlight.clear();
			fetchTimes.clear();
			blockedUntil.clear();
			blockTimers.forEach(clearTimeout);
			blockTimers.clear();
		}

		/**
		 * Counts a network fetch of a key against its budget
		 * (queryLoopGuard). The fetch that overspends blocks the key and
		 * reports the loop, once per key and tab. When the block ends, a key
		 * still in the cache is fetched once, so it doesn't keep the data
		 * (or the QueryLoopError) of the block.
		 *
		 * @param {string} keyHash Cache key
		 * @param {QueryName} definitionName Query name, for the report
		 * @param {unknown} params Query params, for the fetch after the block
		 * @returns {boolean} Fetch allowed
		 */
		function allowFetch(
			keyHash: string,
			definitionName: QueryName,
			params: unknown
		): boolean {
			const now = Date.now();
			if (now < (blockedUntil.get(keyHash) ?? 0)) return false;

			const recent = (fetchTimes.get(keyHash) ?? []).filter(
				(at) => now - at < queryLoopGuard.windowMs
			);
			if (recent.length < queryLoopGuard.fetches) {
				recent.push(now);
				fetchTimes.set(keyHash, recent);
				return true;
			}

			blockedUntil.set(keyHash, now + queryLoopGuard.blockMs);
			fetchTimes.delete(keyHash);
			clearTimeout(blockTimers.get(keyHash));
			blockTimers.set(
				keyHash,
				setTimeout(() => {
					blockTimers.delete(keyHash);
					if (!cacheState[keyHash]) return;
					// logged and reported in execute already
					execute(definitionName, params as QueryParams<QueryName>, {
						forceRefetch: true,
					}).catch(() => {});
				}, queryLoopGuard.blockMs)
			);
			if (!loopReported.has(keyHash)) {
				loopReported.add(keyHash);
				reportClientError({
					kind: "query_loop",
					query: definitionName,
					// the blocked one included
					fetches: recent.length + 1,
				});
			}
			return false;
		}

		function updateState<TParams, TData>(
			cacheKey: string,
			updateData: Partial<IQueryState<unknown, unknown>>
		): void {
			const existing = cacheState[cacheKey] as
				IQueryState<TParams, TData> | undefined;
			// update existing
			if (existing)
				cacheState[cacheKey] = shallowReactive({
					...existing,
					...updateData,
				});
			// set new with data
			else
				cacheState[cacheKey] = shallowReactive({
					definitionName: "",
					params: null,
					data: null,
					loading: false,
					error: null,
					timestamp: 0,
					autoRefetch: false,
					...updateData,
				});
		}

		async function execute<K extends QueryName>(
			definitionName: K,
			params: QueryParams<K>,
			options?: { forceRefetch?: boolean }
		): Promise<QueryData<K>> {
			const definition:
				| IQueryDefinition<[QueryParams<K>], QueryData<K>>
				| IMutationDefinition<[QueryParams<K>], QueryData<K>> =
				getQueryDefinition(definitionName);

			// writes run outside the cache: no entry, no dedupe, nothing an
			// invalidation could see or re-run
			if ("mutation" in definition) {
				try {
					return await definition.fetchFn(params);
				} catch (err) {
					console.error(err);
					throw err;
				}
			}

			const keyHash = toCacheKey(definition.key(params));
			const shouldCache = definition.cache !== false;
			const state = cacheState[keyHash];
			// an entry's first read may come from its persisted copy
			const initialData =
				!options?.forceRefetch && !state?.data
					? definition.initialData
					: undefined;

			// a hit returns without writing, so it triggers nothing
			if (
				state !== undefined &&
				state.data !== null &&
				!options?.forceRefetch &&
				isFresh(state)
			) {
				return state.data as QueryData<K>;
			}

			if (!state)
				updateState(keyHash, {
					definitionName,
					expireTime: definition.expireTime,
				});

			// return in-flight promise if exists
			if (inFlight.has(keyHash) && !options?.forceRefetch) {
				return inFlight.get(keyHash)! as Promise<QueryData<K>>;
			}

			// mark as loading
			updateState(keyHash, {
				params: params ?? undefined,
				loading: true,
				error: null,
				autoRefetch: definition.autoRefetch,
			});

			// $reset (logout), invalidateKey or a forced refetch replace or
			// drop this request; it must then not write into the cache.
			// let, not const: a fetchFn throwing synchronously would read
			// a const promise before its initialization
			// eslint-disable-next-line prefer-const
			let promise: Promise<QueryData<K>>;
			const isCurrent = () => inFlight.get(keyHash) === promise;
			// the persisted copy was already expired: refetch once settled
			let refresh = false;

			promise = (async (): Promise<QueryData<K>> => {
				try {
					const cached = initialData ? await initialData() : null;
					if (cached) {
						if (shouldCache && isCurrent())
							updateState(keyHash, {
								data: cached.data,
								timestamp: cached.fetchedAt,
							});
						refresh = !isFresh({
							timestamp: cached.fetchedAt,
							expireTime: definition.expireTime,
						});
						return cached.data;
					}

					if (!allowFetch(keyHash, definitionName, params)) {
						const last = cacheState[keyHash]?.data;
						if (last != null) return last as QueryData<K>;
						throw new QueryLoopError(definitionName);
					}

					const result = await definition.fetchFn(params);

					if (shouldCache && isCurrent()) {
						updateState(keyHash, {
							data: result,
							timestamp: Date.now(),
						});
					}

					return result;
				} catch (err) {
					if (isCurrent())
						updateState(keyHash, {
							error:
								err instanceof Error
									? err
									: new Error(String(err)),
							errorAt: Date.now(),
						});
					console.error(err);
					throw err;
				} finally {
					if (isCurrent()) {
						updateState(keyHash, { loading: false });
						inFlight.delete(keyHash);
						if (!shouldCache) deleteState(keyHash);
						// logged and reported in execute already
						if (refresh)
							execute(definitionName, params, {
								forceRefetch: true,
							}).catch(() => {});
					}
				}
			})();

			inFlight.set(keyHash, promise);

			return promise;
		}

		/**
		 * Peeks a query's state without creating it: the entry if it exists
		 * and is fresh (isFresh), else undefined. Reactive to the entry.
		 *
		 * @author jplacht
		 *
		 * @readonly
		 * @template TParams Query Params Type
		 * @template TData Query Data Type
		 * @param {JSONValue} key Query Key
		 * @returns {(QueryState<TParams, TData> | undefined)} QueryState or Undefined
		 */
		function peekQueryState<TParams, TData>(
			key: JSONValue
		): IQueryState<TParams, TData> | undefined {
			const entry = cacheState[toCacheKey(key)];
			return entry && isFresh(entry)
				? (entry as IQueryState<TParams, TData>)
				: undefined;
		}

		/**
		 * Invalidates given key in the store
		 *
		 * @author jplacht
		 *
		 * @async
		 * @param {JSONValue} key Query Key
		 * @param {{ exact?: boolean; forceRefetch?: boolean; skipRefetch?: boolean }} [options={
		 * 			exact: true,
		 * 			forceRefetch: false,
		 * 			skipRefetch: false,
		 * 		}] Options, by default will check for exact matches and doesn't force refresh
		 * @returns {Promise<void>}
		 */
		async function invalidateKey(
			key: JSONValue,
			options: {
				exact?: boolean;
				forceRefetch?: boolean;
				skipRefetch?: boolean;
			} = {
				exact: true,
				forceRefetch: false,
				skipRefetch: false,
			}
		): Promise<void> {
			const keyHash: string = toCacheKey(key);

			const toRefetch: IQueryState<unknown, unknown>[] = [];

			if (options.exact) {
				const existingEntry = cacheState[keyHash];
				if (existingEntry) {
					toRefetch.push(existingEntry);
				}

				// delete exact matched key and inflight
				deleteState(keyHash);
				inFlight.delete(keyHash);
			} else {
				for (const existingKey of Object.keys(cacheState)) {
					// Note: as keys are strings, need to parse them to JSONValue
					if (isSubset(key, JSON.parse(existingKey) as JSONValue)) {
						// add subset query
						const existingEntry = cacheState[existingKey];
						toRefetch.push(existingEntry);

						// delete non-exact matched key and inflight
						deleteState(existingKey);
						inFlight.delete(existingKey);
					}
				}
			}

			// check and trigger refetches if defined or forced
			toRefetch.forEach((entry) => {
				const name = entry.definitionName as QueryName;
				// refetch can be forced from invalidate options or set
				// in the query definition itself
				if (
					!options.skipRefetch &&
					(options.forceRefetch ||
						getQueryDefinition(name)?.autoRefetch)
				) {
					execute(name, entry.params as QueryParams<QueryName>);
				}
			});
		}

		/**
		 * Seeds a query's cache state, e.g. each plan from a plan list.
		 * Never overwrites an existing state.
		 *
		 * @author jplacht
		 *
		 * @param {K} definitionName Query name
		 * @param {QueryParams<K>} params Query params, also build the key
		 * @param {QueryData<K>} data Result data
		 */
		function addCacheState<K extends QueryName>(
			definitionName: K,
			params: QueryParams<K>,
			data: QueryData<K>
		): void {
			const definition:
				| IQueryDefinition<[QueryParams<K>], QueryData<K>>
				| IMutationDefinition<[QueryParams<K>], QueryData<K>> =
				getQueryDefinition(definitionName);
			if ("mutation" in definition) return;
			const keyHash: string = toCacheKey(definition.key(params));

			// do not overwrite existing state for key
			if (!cacheState[keyHash]) {
				updateState(keyHash, {
					definitionName,
					params: params,
					data: data,
					loading: false,
					error: null,
					timestamp: Date.now(),
					expireTime: definition.expireTime,
				});
			}
		}

		// Regular status watcher
		let intervalId: ReturnType<typeof setInterval> | null = null;

		/**
		 * Iterates over cache entries and triggers refresh if
		 * marked as to be automatically refetched
		 *
		 * @author jplacht
		 */
		function checkEntryStatusAndRefresh() {
			// inactivity check, skip if true
			if (userActivity.shouldDelay()) return;

			const now = Date.now();

			// per batch link: expired single entries, id => cache key,
			// refetched in one multiple request below
			const expiredSingles = new Map<IBatchRefresh, Map<string, string>>();
			const multipleRefetches: {
				link: IBatchRefresh;
				ids: string[];
				request: Promise<unknown>;
			}[] = [];

			for (const [key, entry] of Object.entries(cacheState)) {
				const name = entry.definitionName as QueryName;
				const refreshed = !!getQueryDefinition(name)?.autoRefetch;
				// a transient failure of a refreshed entry is retried one
				// expireTime after it, a 429 once its Retry-After passed;
				// any other error stops the refresh
				const since =
					entry.error === null
						? entry.timestamp
						: refreshed && isTransientError(entry.error)
							? entry.errorAt
							: undefined;
				const retryAfter = (entry.error as { retryAfter?: number } | null)
					?.retryAfter;
				const wait =
					retryAfter === undefined ? entry.expireTime : retryAfter * 1000;

				if (
					entry.expireTime &&
					!entry.loading &&
					since &&
					now - since > wait!
				) {
					const single = batchRefresh.find((b) => b.single === name);
					if (single) {
						if (!expiredSingles.has(single))
							expiredSingles.set(single, new Map());
						expiredSingles
							.get(single)!
							.set(single.idOf(entry.params), key);
					} else if (refreshed) {
						const request = execute(
							name,
							entry.params as QueryParams<QueryName>
						);
						// logged and reported in execute already
						request.catch(() => {});
						const multiple = batchRefresh.find(
							(b) => b.multiple === name
						);
						if (multiple)
							multipleRefetches.push({
								link: multiple,
								ids: multiple.idsOf(entry.params),
								request,
							});
					} else {
						// delete as stale and should not refetch
						invalidateKey(JSON.parse(key) as JSONValue);
					}
				}
			}

			// singles an expiring multiple query refetches anyway take its result
			for (const { link, ids, request } of multipleRefetches) {
				const expired = expiredSingles.get(link);
				if (!expired) continue;
				const covered = new Map<string, string>();
				ids.forEach((id) => {
					const key = expired.get(id);
					if (key === undefined) return;
					covered.set(id, key);
					expired.delete(id);
				});
				if (covered.size) refreshBatch(link, covered, request);
			}

			expiredSingles.forEach((expired, link) => {
				if (expired.size)
					refreshBatch(
						link,
						expired,
						fetchOf(link.multiple)(link.request([...expired.keys()]))
					);
			});
		}

		/**
		 * Refreshes a batch link's single entries from one multiple request
		 * instead of one request per entry. Ids missing from the result get
		 * an error, so the watcher stops refetching them.
		 *
		 * @author jplacht
		 *
		 * @param {IBatchRefresh} link Batch link
		 * @param {Map<string, string>} keys Id => cache key
		 * @param {Promise<unknown>} request Multiple request, resolves to rows
		 */
		function refreshBatch(
			link: IBatchRefresh,
			keys: Map<string, string>,
			request: Promise<unknown>
		): void {
			keys.forEach((key) => updateState(key, { loading: true }));

			const settle = (
				update: (id: string) => Partial<IQueryState<unknown, unknown>>
			) =>
				keys.forEach((key, id) => {
					// dropped meanwhile, e.g. by $reset on logout
					if (!cacheState[key]) return;
					updateState(key, { loading: false, ...update(id) });
				});

			request.then(
				(rows) => {
					const byId = new Map(
						(rows as unknown[]).map((row) => [link.rowId(row), row])
					);
					settle((id) =>
						byId.has(id)
							? {
									data: byId.get(id),
									error: null,
									timestamp: Date.now(),
								}
							: {
									error: new Error(link.missing(id)),
									errorAt: Date.now(),
								}
					);
				},
				(err) =>
					settle(() => ({
						error: err instanceof Error ? err : new Error(String(err)),
						errorAt: Date.now(),
					}))
			);
		}

		/**
		 * Starts the entry status watcher, prevents multiple watchers
		 * to be running in parallel.
		 *
		 * @author jplacht
		 */
		function startStatusWatcher() {
			// prevent multiple invervals running
			if (intervalId !== null) return;

			intervalId = setInterval(
				() => checkEntryStatusAndRefresh(),
				10_000
			);
		}

		// start the status watcher
		startStatusWatcher();

		return {
			$reset,
			cacheState,
			peekQueryState,
			execute,
			invalidateKey,
			addCacheState,
			// only exposed for testing
			checkEntryStatusAndRefresh,
			startStatusWatcher,
		};
	}
);

// a logout (userStore.resetSession) clears the cache
onSessionReset(() => useQueryStore().$reset());
