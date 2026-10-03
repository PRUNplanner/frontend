import { computed } from "vue";
import { useQueryStore } from "./queryStore";
import type {
	QueryArgs,
	QueryData,
	QueryName,
	QueryParams,
} from "./queryRepository.types";
import { getQueryDefinition } from "./queryRepository";

export function useQuery<K extends QueryName>(
	definitionName: K,
	...args: QueryArgs<K>
) {
	const queryStore = useQueryStore();
	const params = args[0] as QueryParams<K>;

	const state = computed(() =>
		queryStore.peekQueryState<QueryParams<K>, QueryData<K>>(
			getQueryDefinition(definitionName).key(params)
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

	return {
		state: state,
		loading: state.value?.loading ?? false,
		error: (state.value?.error ?? null) !== null,
		data: state.value?.data as QueryData<K> | null,
		execute,
	};
}
