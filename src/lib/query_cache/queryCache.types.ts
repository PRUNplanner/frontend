export type JSONObject = { [key: string]: JSONValue };
export type JSONValue = null | boolean | number | string | object;

export interface IQueryState<TParams, TData> {
	definitionName: string;
	params: TParams | null;
	data: TData | null;
	loading: boolean;
	error: Error | null;
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
	persist?: boolean;
}
