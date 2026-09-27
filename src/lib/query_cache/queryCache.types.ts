export interface JSONObject {
	[key: string]: JSONValue;
}
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

export type IQueryDefinition<TParams, TData> = [TParams] extends [undefined]
	? {
			key: () => JSONValue;
			fetchFn: () => Promise<TData>;
			autoRefetch?: boolean;
			expireTime?: number;
			persist?: boolean;
		}
	: {
			key: (params: TParams) => JSONValue;
			fetchFn: (params: TParams) => Promise<TData>;
			autoRefetch?: boolean;
			expireTime?: number;
			persist?: boolean;
		};
