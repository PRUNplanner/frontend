import { ref, type Ref, watch } from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

/**
 * Local, editable copy of an empire's configuration (name, faction,
 * permits) that follows the given empire and saves through PatchEmpire.
 * Shared by the empire configuration and the onboarding card.
 * @author jplacht
 *
 * @param {() => PlanEmpireElement} data Getter of the empire to edit
 */
export function useEmpireForm(data: () => PlanEmpireElement) {
	const isLoading: Ref<boolean> = ref(false);
	const localData: Ref<PlanEmpireElement> = ref(inertClone(data()));

	watch(data, (newData) => (localData.value = inertClone(newData)), {
		deep: true,
	});

	/**
	 * Discards unsaved edits
	 * @author jplacht
	 */
	function reload(): void {
		localData.value = inertClone(data());
	}

	/**
	 * Persists the edited configuration
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<boolean>} Saved
	 */
	async function save(): Promise<boolean> {
		isLoading.value = true;
		trackEvent("empire_patch");

		try {
			await useQuery("PatchEmpire", {
				empireUuid: localData.value.uuid,
				data: {
					empire_name: localData.value.empire_name,
					empire_faction: localData.value.empire_faction,
					empire_permits_used: localData.value.empire_permits_used,
					empire_permits_total: localData.value.empire_permits_total,
				},
			}).execute();
			return true;
		} catch (err) {
			console.error("Error patching empire", err);
			return false;
		} finally {
			isLoading.value = false;
		}
	}

	return { localData, isLoading, reload, save };
}
