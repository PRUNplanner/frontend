import type { queryRepository } from "@/lib/query_cache/queryRepository";

export type IQueryRepository = typeof queryRepository;

export type QueryName = keyof IQueryRepository;

/** A query's arguments: `[]` or `[params]`. */
export type QueryArgs<K extends QueryName> = Parameters<
	IQueryRepository[K]["fetchFn"]
>;

/** A query's params, `undefined` if it takes none. */
export type QueryParams<K extends QueryName> = K extends QueryName
	? QueryArgs<K> extends [infer P]
		? P
		: undefined
	: never;

export type QueryData<K extends QueryName> = Awaited<
	ReturnType<IQueryRepository[K]["fetchFn"]>
>;
