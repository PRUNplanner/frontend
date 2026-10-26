import { shallowRef } from "vue";

// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";

// daily profit by plan uuid, by empire uuid, as the empire page last
// calculated it
const profits = shallowRef<Record<string, Record<string, number>>>({});

/**
 * The empire page's plan profits for other views (the phone plans sheet),
 * which never calculate or load them themselves
 *
 * @author jplacht
 */
export function useEmpireProfits() {
	const queryStore = useQueryStore();

	function setProfits(empireUuid: string, data: Record<string, number>) {
		profits.value = { ...profits.value, [empireUuid]: data };
	}

	// only while the plans they came from are cached: a save drops them
	function cachedProfits(
		empireUuid: string
	): Record<string, number> | undefined {
		const key = getQueryDefinition("GetEmpirePlans").key({ empireUuid });
		return queryStore.peekQueryState(key)?.data
			? profits.value[empireUuid]
			: undefined;
	}

	return { setProfits, cachedProfits };
}
