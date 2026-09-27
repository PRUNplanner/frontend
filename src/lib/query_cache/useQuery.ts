import { computed } from "vue";
import { useQueryStore } from "./queryStore";
import {
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
	 */
	async function execute(): Promise<QueryData<K>> {
		return queryStore.execute(definitionName, params);
	}

	return {
		state: state,
		loading: state.value?.loading ?? false,
		error: (state.value?.error ?? null) !== null,
		data: state.value?.data as QueryData<K> | null,
		execute,
	};
}
