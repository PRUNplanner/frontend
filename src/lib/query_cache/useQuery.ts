import { computed } from "vue";
import { useQueryStore } from "./queryStore";
import type {
	QueryArgs,
	QueryData,
	QueryName,
	QueryParams,
} from "./queryRepository.types";
import type { IMutationDefinition, IQueryDefinition } from "./queryCache.types";
import { getQueryDefinition } from "./queryRepository";

export function useQuery<K extends QueryName>(
	definitionName: K,
	...args: QueryArgs<K>
) {
	const queryStore = useQueryStore();
	const params = args[0] as QueryParams<K>;
	const definition:
		| IQueryDefinition<[QueryParams<K>], QueryData<K>>
		| IMutationDefinition<[QueryParams<K>], QueryData<K>> =
		getQueryDefinition(definitionName);

	// a mutation has no cache entry, so no state
	const state = computed(() =>
		"mutation" in definition
			? undefined
			: queryStore.peekQueryState<QueryParams<K>, QueryData<K>>(
					definition.key(params)
				)
	);

	/**
	 * Triggers the query execution
	 *
	 * @param {{ forceRefetch?: boolean }} [options] forceRefetch skips the cache
	 */
	async function execute(options?: {
		forceRefetch?: boolean;
	}): Promise<QueryData<K>> {
		return queryStore.execute(definitionName, params, options);
	}

	return { state, execute };
}
