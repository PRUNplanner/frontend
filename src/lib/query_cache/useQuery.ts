import { computed } from "vue";
import { useQueryStore } from "./queryStore";
import { IQueryDefinition } from "./queryCache.types";
import {
	DataOfDefinition,
	IQueryRepository,
	ParamsOfDefinition,
} from "./queryRepository.types";
import { useQueryRepository } from "./queryRepository";

export function useQuery<K extends keyof IQueryRepository>(
	definitionName: K,
	params?: ParamsOfDefinition<IQueryRepository[K]>
) {
	const queryRepository = useQueryRepository();
	const queryStore = useQueryStore();
	const definition: IQueryRepository[K] =
		queryRepository.repository[definitionName];

	const state = computed(() =>
		queryStore.peekQueryState(
			(
				definition as IQueryDefinition<
					ParamsOfDefinition<IQueryRepository[K]>,
					DataOfDefinition<IQueryRepository[K]>
				>
			).key(params as ParamsOfDefinition<IQueryRepository[K]>)
		)
	);

	/**
	 * Triggers the query execution
	 */
	async function execute(): Promise<DataOfDefinition<IQueryRepository[K]>> {
		return queryStore.execute<K>(
			definitionName,
			params as ParamsOfDefinition<IQueryRepository[K]>
		);
	}

	return {
		state: state,
		loading: state.value?.loading ?? false,
		error: (state.value?.error ?? null) !== null,
		data: state.value?.data as DataOfDefinition<IQueryRepository[K]> | null,
		execute,
	};
}
