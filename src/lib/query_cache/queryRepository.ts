import { gameDataQueries } from "@/lib/query_cache/queries/gameData.queries";
import { planningQueries } from "@/lib/query_cache/queries/planning.queries";
import { userQueries } from "@/lib/query_cache/queries/user.queries";

// Types & Interfaces
import type {
	IMutationDefinition,
	IQueryDefinition,
} from "@/lib/query_cache/queryCache.types";
import type {
	IQueryRepository,
	QueryData,
	QueryName,
	QueryParams,
} from "@/lib/query_cache/queryRepository.types";

/**
 * Every backend interaction by name, see `queries/*.queries.ts`: reads
 * (`defineQuery`) and writes (`defineMutation`). Its type is the source for
 * `IQueryRepository`, `QueryParams` and `QueryData`.
 */
export const queryRepository = {
	...gameDataQueries,
	...planningQueries,
	...userQueries,
};

/**
 * A name's definition: a mutation for a `defineMutation` write, else a query
 */
export type QueryDefinitionOf<K extends QueryName> =
	IQueryRepository[K] extends { mutation: true }
		? IMutationDefinition<[QueryParams<K>], QueryData<K>>
		: IQueryDefinition<[QueryParams<K>], QueryData<K>>;

/**
 * Looks up a definition for a generic query name. TS can't call a union of
 * fetchFns, so this is the single cast between names and definitions.
 *
 * @param {K} name Query name
 * @returns The definition, typed by the name's params and data
 */
export function getQueryDefinition<K extends QueryName>(
	name: K
): QueryDefinitionOf<K> {
	return queryRepository[name] as unknown as QueryDefinitionOf<K>;
}
