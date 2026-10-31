import { computed, ref, type Ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import { isApiError } from "@/lib/apiError";
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";

// Util
import { versionLabel } from "@/features/planning/planVersions.util";

// UI
import { useConfirm, useToast } from "@/ui";

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
	const confirm = useConfirm();

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

	/**
	 * Loads the list, from the cache if it's there
	 *
	 * @param {boolean} [fresh] Skip the cache: the list is known to be stale
	 */
	async function load(fresh: boolean = false): Promise<void> {
		const uuid: string | undefined = planUuid();
		if (!uuid || !enabled()) return;
		try {
			refVersions.value = await useQuery("GetPlanVersions", {
				planUuid: uuid,
			}).execute({ forceRefetch: fresh });
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

	/**
	 * Deletes a version after a confirm, never the active one
	 *
	 * @param {PlanVersionListItem} version Version
	 * @returns {Promise<boolean>} Whether it is gone
	 */
	async function remove(version: PlanVersionListItem): Promise<boolean> {
		const uuid: string | undefined = planUuid();
		if (!uuid) return false;
		if (
			!(await confirm({
				title: t("plan.versions.delete"),
				content: t("plan.versions.delete_confirm", {
					name: versionLabel(version, t),
				}),
				positiveText: t("common.buttons.delete"),
				negativeText: t("common.buttons.cancel"),
			}))
		)
			return false;

		try {
			await useQuery("DeletePlanVersion", {
				planUuid: uuid,
				versionUuid: version.uuid,
			}).execute();
		} catch (err) {
			// already pruned or deleted in another tab: gone all the same
			if (!(isApiError(err) && err.status === 404)) {
				reportError(err);
				toast(t("common.ui.delete_failed"), { type: "error" });
				void load(true);
				return false;
			}
		}
		refVersions.value = refVersions.value.filter(
			(v) => v.uuid !== version.uuid
		);
		trackEvent("plan:version_delete", {
			named: version.name !== "",
			kind: version.kind,
		});
		return true;
	}

	return { refVersions, load, rename, remove };
}
