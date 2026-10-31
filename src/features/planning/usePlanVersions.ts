import { computed, ref, type Ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";

// UI
import { useToast } from "@/ui";

/**
 * The plan's saved versions, newest first. Refetched
 * after every save of the plan (its key is under the plan's).
 *
 * @author jplacht
 *
 * @param {() => string | undefined} planUuid The plan's uuid
 * @param {() => boolean} enabled Own, created plan
 */
export function usePlanVersions(
	planUuid: () => string | undefined,
	enabled: () => boolean
) {
	const { t } = useI18n();
	const toast = useToast();

	// the last list, kept while an invalidated one refetches
	const refVersions: Ref<PlanVersionListItem[]> = ref([]);

	const query = computed(() => {
		const uuid: string | undefined = planUuid();
		return uuid && enabled()
			? useQuery("GetPlanVersions", { planUuid: uuid })
			: undefined;
	});

	watch(
		() => query.value?.state.value?.data,
		(data) => {
			if (data) refVersions.value = data;
		},
		{ immediate: true }
	);

	/** Loads the list, from the cache if it's there */
	async function load(): Promise<void> {
		const uuid: string | undefined = planUuid();
		if (!uuid || !enabled()) return;
		try {
			refVersions.value = await useQuery("GetPlanVersions", {
				planUuid: uuid,
			}).execute();
		} catch (err) {
			reportError(err);
		}
	}

	/**
	 * Names a version, "" unnames it
	 *
	 * @param {string} versionUuid Version
	 * @param {string} name New name
	 */
	async function rename(versionUuid: string, name: string): Promise<void> {
		const uuid: string | undefined = planUuid();
		if (!uuid) return;
		try {
			const renamed: PlanVersionListItem = await useQuery(
				"RenamePlanVersion",
				{ planUuid: uuid, versionUuid, name: name.trim() }
			).execute();
			refVersions.value = refVersions.value.map((v) =>
				v.uuid === versionUuid ? renamed : v
			);
			if (renamed.name)
				trackEvent("plan:version_name", { from: "history" });
		} catch (err) {
			reportError(err);
			toast(t("common.ui.save_failed"), { type: "error" });
		}
	}

	return { refVersions, load, rename };
}
