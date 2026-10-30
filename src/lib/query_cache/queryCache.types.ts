export interface JSONObject {
	[key: string]: JSONValue;
}
/** A cache key: JSON only, so it stringifies and compares as it is */
export type JSONValue =
	null | boolean | number | string | JSONValue[] | JSONObject;

export interface IQueryState<TParams, TData> {
	definitionName: string;
	params: TParams | null;
	data: TData | null;
	loading: boolean;
	error: Error | null;
	// when the last fetch failed; timestamp stays the last success
	errorAt?: number;
	timestamp: number;
	autoRefetch?: boolean;
	expireTime?: number;
}

/**
 * A query definition, typed by its fetchFn: it takes no argument or one
 * params argument, and `key` receives the same params. Build one with
 * `defineQuery` so both are inferred from `fetchFn`.
 */
export interface IQueryDefinition<A extends [] | [unknown], D> {
	key: (...args: NoInfer<A>) => JSONValue;
	fetchFn: (...args: A) => Promise<D>;
	autoRefetch?: boolean;
	expireTime?: number;
	// false: the result is dropped after the call (still deduped in flight)
	cache?: false;
	// a persisted copy for the entry's first read, fetched at `fetchedAt`;
	// null: fetch. Refetched in the background when already expired.
	initialData?: () => Promise<{ data: D; fetchedAt: number } | null>;
}

/**
 * A write. It runs its `fetchFn` outside the cache: no key, no entry, no
 * dedupe, nothing to invalidate or refetch. Build one with `defineMutation`.
 */
export interface IMutationDefinition<A extends [] | [unknown], D> {
	fetchFn: (...args: A) => Promise<D>;
	mutation: true;
}
