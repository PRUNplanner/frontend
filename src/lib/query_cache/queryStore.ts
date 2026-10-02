import { reactive, computed, type ComputedRef, type Reactive } from "vue";
import { defineStore } from "pinia";

import { userActivity } from "@/features/user_activity/userActivityStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";
import { isSubset, toCacheKey } from "@/lib/query_cache/cacheKeys";

import type {
	IQueryState,
	JSONValue,
} from "@/lib/query_cache/queryCache.types";
import type {
	QueryData,
	QueryName,
	QueryParams,
} from "@/lib/query_cache/queryRepository.types";

/**
 * Network failure or server error (status set by apiService's
 * normalizeError), worth retrying; validation errors carry no status
 *
 * @param {Error} err Error
 * @returns {boolean} Transient error
 */
function isTransientError(err: Error): boolean {
	if (!("status" in err)) return false;
	const status = (err as { status?: number }).status;
	return status === undefined || status >= 500;
}

export const useQueryStore = defineStore(
	"prunplanner_query_store",
	() => {
		const inFlight = new Map<string, Promise<unknown>>();

		const cacheState: Reactive<
			Record<string, IQueryState<unknown, unknown>>
		> = reactive({});

		function deleteState(key: string) {
			delete cacheState[key];
		}

		function $reset(): void {
			Object.keys(cacheState).forEach((key) => delete cacheState[key]);
			inFlight.clear();
		}

		function updateState<TParams, TData>(
			cacheKey: string,
			updateData: Partial<IQueryState<unknown, unknown>>
		): void {
			const existing = cacheState[cacheKey] as
				IQueryState<TParams, TData> | undefined;
			// update existing
			if (existing) cacheState[cacheKey] = { ...existing, ...updateData };
			// set new with data
			else
				cacheState[cacheKey] = {
					definitionName: "",
					params: null,
					data: null,
					loading: false,
					error: null,
					timestamp: 0,
					autoRefetch: false,
					...updateData,
				};
		}

		function getCachedData<K extends QueryName>(
			keyHash: string
		): QueryData<K> | null {
			const state = cacheState[keyHash];
			return state?.data as QueryData<K> | null;
		}

		async function execute<K extends QueryName>(
			definitionName: K,
			params: QueryParams<K>,
			options?: { forceRefetch?: boolean }
		): Promise<QueryData<K>> {
			const definition = getQueryDefinition(definitionName);

			const keyHash = toCacheKey(definition.key(params));

			// initialize entry if missing
			if (!cacheState[keyHash]) {
				updateState(keyHash, { definitionName });
			}

			const state = cacheState[keyHash]!;

			const now = Date.now();
			const ttl = definition.expireTime;
			const expired = ttl !== undefined && now - state.timestamp > ttl;
			const shouldCache = definition.persist !== false;

			updateState(keyHash, { expireTime: definition.expireTime });

			// return cached data if valid
			const cachedData = getCachedData<K>(keyHash);
			if (cachedData !== null && !options?.forceRefetch && !expired) {
				return cachedData;
			}

			// return in-flight promise if exists; mutations share static
			// keys, deduping them would drop a call with other params
			if (
				shouldCache &&
				inFlight.has(keyHash) &&
				!options?.forceRefetch
			) {
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

			promise = (async (): Promise<QueryData<K>> => {
				try {
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
					}
				}
			})();

			inFlight.set(keyHash, promise);

			return promise;
		}

		/**
		 * Peaks a queries state readonly without ever creating it on call.
		 * Will take into account existance as well as "fresh" state, will
		 * return undefined if the state is not existing or stale.
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
			return isKnownAndFresh(key).value
				? (cacheState[toCacheKey(key)] as IQueryState<TParams, TData>)
				: undefined;
		}

		/**
		 * Checks a given query key for existance and if still fresh.
		 * Freshness is given if:
		 * - Key must exist
		 * - Key does not have an expiry time, it is always fresh
		 * - Or key has an expiry time that is still valid now
		 *
		 * @author jplacht
		 *
		 * @param {JSONValue} key Query Key
		 * @returns {ComputedRef<boolean>} Existing and fresh state
		 */
		function isKnownAndFresh(key: JSONValue): ComputedRef<boolean> {
			return computed(() => {
				const keyHash: string = toCacheKey(key);
				const state = cacheState[keyHash];

				// state is undefined => false
				if (!state) return false;

				// state is known
				// if no expireTime, its fresh => true
				if (!state.expireTime) return true;

				// check the expire time

				const now = Date.now();
				const expired = now - state.timestamp > state.expireTime;

				if (expired) {
					return false;
				} else {
					return true;
				}
			});
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
			const definition = getQueryDefinition(definitionName);
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

		/**
		 * True, if any cache state is currently loading
		 * @author jplacht
		 *
		 * @type {ComputedRef<boolean>}
		 */
		const isAnythingLoading: ComputedRef<boolean> = computed(() =>
			Object.values(cacheState).some((s) => s.loading)
		);

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

			// planet natural id => cache key, refetched in one batch below
			const expiredPlanets = new Map<string, string>();
			const multipleRefetches: {
				ids: string[];
				request: Promise<QueryData<"GetMultiplePlanets">>;
			}[] = [];

			for (const [key, entry] of Object.entries(cacheState)) {
				const name = entry.definitionName as QueryName;
				const refreshed =
					name === "GetPlanet" ||
					!!getQueryDefinition(name)?.autoRefetch;
				// a transient failure of a refreshed entry is retried one
				// expireTime after it, any other error stops the refresh
				const since =
					entry.error === null
						? entry.timestamp
						: refreshed && isTransientError(entry.error)
							? entry.errorAt
							: undefined;

				if (
					entry.expireTime &&
					!entry.loading &&
					since &&
					now - since > entry.expireTime
				) {
					if (name === "GetPlanet") {
						const params = entry.params as QueryParams<"GetPlanet">;
						expiredPlanets.set(params.planetNaturalId, key);
					} else if (refreshed) {
						const request = execute(
							name,
							entry.params as QueryParams<QueryName>
						);
						// logged and reported in execute already
						request.catch(() => {});
						if (name === "GetMultiplePlanets")
							multipleRefetches.push({
								ids: (
									entry.params as QueryParams<"GetMultiplePlanets">
								).planetNaturalIds,
								request: request as Promise<
									QueryData<"GetMultiplePlanets">
								>,
							});
					} else {
						// delete as stale and should not refetch
						invalidateKey(JSON.parse(key) as JSONValue);
					}
				}
			}

			// planets an expiring multiple query refetches anyway take its result
			for (const { ids, request } of multipleRefetches) {
				const covered = new Map<string, string>();
				ids.forEach((id) => {
					const key = expiredPlanets.get(id);
					if (key === undefined) return;
					covered.set(id, key);
					expiredPlanets.delete(id);
				});
				if (covered.size) refreshPlanets(covered, request);
			}

			if (expiredPlanets.size)
				refreshPlanets(
					expiredPlanets,
					getQueryDefinition("GetMultiplePlanets").fetchFn({
						planetNaturalIds: [...expiredPlanets.keys()],
					})
				);
		}

		/**
		 * Refreshes GetPlanet entries from one multiple planets request
		 * instead of one request per planet. Planets missing from the
		 * result get an error, so the watcher stops refetching them.
		 *
		 * @author jplacht
		 *
		 * @param {Map<string, string>} keys Planet natural id => cache key
		 * @param {Promise<QueryData<"GetMultiplePlanets">>} request Planets
		 */
		function refreshPlanets(
			keys: Map<string, string>,
			request: Promise<QueryData<"GetMultiplePlanets">>
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
				(planets) => {
					const byId = new Map(
						planets.map((p) => [p.planet_natural_id, p])
					);
					settle((id) =>
						byId.has(id)
							? {
									data: byId.get(id),
									error: null,
									timestamp: Date.now(),
								}
							: {
									error: new Error(`Planet ${id} not found`),
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
			isAnythingLoading,
			// only exposed for testing
			checkEntryStatusAndRefresh,
			startStatusWatcher,
		};
	}
	// {
	// 	broadcast: {
	// 		enable: true,
	// 		persisted: false,
	// 		pick: ["cacheState"],
	// 		debounce: 1_000,
	// 		channel: "prunplanner_query_data",
	// 	},
	// }
);
