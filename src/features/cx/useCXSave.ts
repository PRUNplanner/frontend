import { ref, type Ref } from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

// Util
import {
	getSaveError,
	threeWay,
} from "@/features/save_conflict/saveConflict.util";
import { diffCX, type ICXDiffable } from "@/features/cx/cxDiff";

// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";

/**
 * Saves a CX edited on the Exchanges page or in a plan's COGM tool. The
 * save sends the version the edit started from: saved in another tab
 * meanwhile opens the conflict dialog (`conflict`), deleted there sets
 * `remoteNotice`.
 *
 * @author jplacht
 *
 * @param {"exchanges_view" | "cogm"} location Where the CX is edited
 */
export function useCXSave(location: "exchanges_view" | "cogm") {
	const conflict = useSaveConflict();
	const remoteNotice: Ref<"saved" | "deleted" | null> = ref(null);

	async function fetchSaved(cxUuid: string): Promise<CX | undefined> {
		const cxs = await useQuery("GetAllCX").execute({ forceRefetch: true });
		return cxs.find((c) => c.uuid === cxUuid);
	}

	/**
	 * Saves the edits
	 *
	 * @param {CX} loaded CX the edits started from
	 * @param {ICXDiffable} mine Edited name and data
	 * @param {boolean} [overwrite=false] Save over a newer version
	 * @returns {Promise<boolean>} True if the store now holds the saved or
	 * reloaded CX, so the editor reads it again
	 */
	async function save(
		loaded: CX,
		mine: ICXDiffable,
		overwrite: boolean = false
	): Promise<boolean> {
		try {
			await useQuery("PatchCX", {
				cxName: mine.cx_name,
				cxUuid: loaded.uuid,
				data: mine.cx_data,
				baseModifiedAt: overwrite ? undefined : loaded.modified_at,
			}).execute();
			remoteNotice.value = null;
			return true;
		} catch (err) {
			const kind = getSaveError(err);
			if (kind === "deleted") {
				remoteNotice.value = "deleted";
				return false;
			}
			if (kind !== "conflict") throw err;
		}

		const choice = await conflict.ask({
			deleted: false,
			options: ["overwrite", "reload"],
			loadChanges: async () => {
				const saved = await fetchSaved(loaded.uuid);
				if (!saved) throw new Error("CX deleted");
				return threeWay<ICXDiffable>(loaded, saved, mine, diffCX);
			},
		});
		trackEvent("exchange:save_conflict", {
			location,
			choice: choice ?? "close",
		});

		if (choice === "overwrite") return save(loaded, mine, true);
		if (choice === "reload") {
			const saved = await fetchSaved(loaded.uuid);
			remoteNotice.value = saved ? null : "deleted";
			return saved !== undefined;
		}
		return false;
	}

	/**
	 * Unsaved edits, ignoring the order of the preferences
	 *
	 * @param {CX} loaded CX the edits started from
	 * @param {ICXDiffable} mine Edited name and data
	 * @returns {boolean} Edited
	 */
	function isEdited(loaded: CX, mine: ICXDiffable): boolean {
		return diffCX(loaded, mine).length > 0;
	}

	/**
	 * Another tab saved or deleted the CX the editor shows: says so when
	 * it has unsaved edits or is gone, else the editor reloads
	 *
	 * @param {CX | undefined} saved The CX as stored now, undefined if deleted
	 * @param {CX} loaded CX the edits started from
	 * @param {ICXDiffable} mine Edited name and data
	 * @returns {boolean} True if the editor should reload
	 */
	function onRemoteChange(
		saved: CX | undefined,
		loaded: CX,
		mine: ICXDiffable
	): boolean {
		const edited = isEdited(loaded, mine);
		trackEvent("app:remote_change", {
			object_type: "cx",
			has_unsaved_edits: edited,
			is_deleted: !saved,
		});
		if (!saved) remoteNotice.value = "deleted";
		else if (edited) remoteNotice.value = "saved";
		return !!saved && !edited;
	}

	return { conflict, remoteNotice, save, isEdited, onRemoteChange };
}
