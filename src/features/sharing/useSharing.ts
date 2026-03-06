import { computed, ComputedRef } from "vue";

// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Lib
import config from "@/lib/config";

export function useSharing(planUuid: string) {
	const planningStore = usePlanningStore();

	/**
	 * Status of plan, if currently shared
	 * @author jplacht
	 *
	 * @type {ComputedRef<boolean>}
	 */
	const isShared: ComputedRef<boolean> = computed(() => {
		return planningStore.shared[planUuid] !== undefined;
	});

	/**
	 * Number of views this shared plan currently has
	 * @author jplacht
	 *
	 * @type {ComputedRef<number>}
	 */
	const viewCount: ComputedRef<number> = computed(() => {
		if (isShared.value) {
			return planningStore.shared[planUuid].view_count;
		}
		return 0;
	});

	/**
	 * Sharing URL if plan is shared
	 * @author jplacht
	 *
	 * @type {ComputedRef<string | undefined>}
	 */
	const url: ComputedRef<string | undefined> = computed(() => {
		if (isShared.value) {
			return `${config.SHARE_BASE_URL}/${planningStore.shared[planUuid].uuid}`;
		}
		return undefined;
	});

	/**
	 * Triggers refresh of sharing information in Planning Store
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function refreshStore(): Promise<void> {
		await useQuery("GetAllShared").execute();
	}

	/**
	 * Deletes active sharing
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function deleteSharing(): Promise<void> {
		if (isShared.value) {
			// call share deletion
			await useQuery("DeleteSharedPlan", {
				sharedUuid: planningStore.shared[planUuid].uuid,
			}).execute();
			await refreshStore();
		}
	}

	/**
	 * Creates a new sharing for this plan
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function createSharing(): Promise<void> {
		if (!isShared.value) {
			// call sharing creation
			await useQuery("CreateSharedPlan", {
				planUuid: planUuid,
			}).execute();
			await refreshStore();
		}
	}

	return {
		isShared,
		viewCount,
		url,
		// functions
		refreshStore,
		deleteSharing,
		createSharing,
	};
}
