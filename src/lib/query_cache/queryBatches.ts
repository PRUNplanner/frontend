import type {
	QueryData,
	QueryName,
	QueryParams,
} from "@/lib/query_cache/queryRepository.types";

/**
 * A query family the status watcher refreshes in one request: expired
 * `single` entries are refetched together through `multiple`, and each takes
 * its row from the result. Rows missing from it get the `missing` error, so
 * the watcher stops refetching them.
 */
export interface IBatchRefresh {
	single: QueryName;
	multiple: QueryName;
	/** Id of a `single` entry, from its params */
	idOf: (params: unknown) => string;
	/** Ids a `multiple` entry covers, from its params */
	idsOf: (params: unknown) => string[];
	/** `multiple` params for the given ids */
	request: (ids: string[]) => unknown;
	/** Id of a row in the `multiple` result */
	rowId: (row: unknown) => string;
	/** Error message for an id missing from the result */
	missing: (id: string) => string;
}

/**
 * Checks a batch link against the names' params and data, so a wrong name
 * or field is a type error, and erases it to `IBatchRefresh` for the store.
 */
function defineBatch<S extends QueryName, M extends QueryName>(link: {
	single: S;
	multiple: M;
	idOf: (params: QueryParams<S>) => string;
	idsOf: (params: QueryParams<M>) => string[];
	request: (ids: string[]) => QueryParams<M>;
	rowId: (row: QueryData<M> extends (infer R)[] ? R : never) => string;
	missing: (id: string) => string;
}): IBatchRefresh {
	return link as unknown as IBatchRefresh;
}

export const batchRefresh: IBatchRefresh[] = [
	defineBatch({
		single: "GetPlanet",
		multiple: "GetMultiplePlanets",
		idOf: (params) => params.planetNaturalId,
		idsOf: (params) => params.planetNaturalIds,
		request: (ids) => ({ planetNaturalIds: ids }),
		rowId: (row) => row.planet_natural_id,
		missing: (id) => `Planet ${id} not found`,
	}),
];
