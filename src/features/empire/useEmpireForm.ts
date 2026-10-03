import { ref, type Ref, watch } from "vue";
import { isEqual } from "lodash-es";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

// Util
import { inertClone } from "@/util/data";
import {
	getSaveError,
	threeWay,
} from "@/features/save_conflict/saveConflict.util";
import { diffEmpire, type IEmpireDiffable } from "@/features/empire/empireDiff";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

/** The configuration fields a save sends */
function config(empire: PlanEmpireElement): IEmpireDiffable {
	return {
		empire_name: empire.empire_name,
		empire_faction: empire.empire_faction,
		empire_permits_used: empire.empire_permits_used,
		empire_permits_total: empire.empire_permits_total,
	};
}

/**
 * Local, editable copy of an empire's configuration (name, faction,
 * permits) that follows the given empire and saves through PatchEmpire.
 * Shared by the empire configuration and the onboarding card.
 *
 * A save sends the version the edit started from: saved in another tab
 * meanwhile opens the conflict dialog (`conflict`), deleted there sets
 * `remoteNotice`. A newer empire from another tab replaces the form
 * unless it has unsaved edits, then `remoteNotice` tells.
 * @author jplacht
 *
 * @param {() => PlanEmpireElement} data Getter of the empire to edit
 */
export function useEmpireForm(data: () => PlanEmpireElement) {
	const isLoading: Ref<boolean> = ref(false);
	const localData: Ref<PlanEmpireElement> = ref(inertClone(data()));
	// as loaded or last saved, the base of the edits
	let loaded: PlanEmpireElement = inertClone(data());

	const conflict = useSaveConflict();
	const remoteNotice: Ref<"saved" | "deleted" | null> = ref(null);

	function isDirty(): boolean {
		return !isEqual(config(localData.value), config(loaded));
	}

	function adopt(empire: PlanEmpireElement): void {
		loaded = inertClone(empire);
		localData.value = inertClone(empire);
		remoteNotice.value = null;
	}

	watch(
		data,
		(newData) => {
			const sameEmpire = newData.uuid === loaded.uuid;
			if (sameEmpire && newData.modified_at !== loaded.modified_at)
				trackEvent("app:remote_change", {
					object_type: "empire",
					has_unsaved_edits: isDirty(),
					is_deleted: false,
				});

			if (!sameEmpire || !isDirty()) adopt(newData);
			else if (newData.modified_at !== loaded.modified_at)
				remoteNotice.value = "saved";
		},
		{ deep: true }
	);

	/**
	 * Discards unsaved edits
	 * @author jplacht
	 */
	function reload(): void {
		adopt(data());
	}

	/**
	 * The empire as saved in the backend
	 *
	 * @returns {Promise<PlanEmpireElement | undefined>} Saved empire, undefined if deleted
	 */
	async function fetchSaved(): Promise<PlanEmpireElement | undefined> {
		const empires = await useQuery("GetAllEmpires").execute({
			forceRefetch: true,
		});
		return empires.find((e) => e.uuid === loaded.uuid);
	}

	/**
	 * Loads the saved empire into the form
	 *
	 * @returns {Promise<boolean>} Loaded, false if it was deleted
	 */
	async function reloadSaved(): Promise<boolean> {
		const saved = await fetchSaved();
		if (saved) adopt(saved);
		else remoteNotice.value = "deleted";
		return saved !== undefined;
	}

	/**
	 * Persists the edited configuration
	 * @author jplacht
	 *
	 * @async
	 * @param {boolean} [overwrite=false] Save over a newer version
	 * @returns {Promise<boolean>} Saved, or reloaded after a conflict
	 */
	async function save(overwrite: boolean = false): Promise<boolean> {
		isLoading.value = true;
		let saved = false;
		let failure: "conflict" | "deleted" | null = null;
		const sent = inertClone(localData.value);

		try {
			const result = await useQuery("PatchEmpire", {
				empireUuid: sent.uuid,
				data: {
					...config(sent),
					base_modified_at: overwrite
						? undefined
						: loaded.modified_at,
				},
			}).execute();
			loaded = { ...sent, modified_at: result.modified_at };
			localData.value.modified_at = result.modified_at;
			remoteNotice.value = null;
			saved = true;
		} catch (err) {
			failure = getSaveError(err);
			if (failure === "deleted") remoteNotice.value = "deleted";
			console.error("Error patching empire", err);
		} finally {
			isLoading.value = false;
			trackEvent("empire:update", { is_success: saved });
		}

		return failure === "conflict" ? resolveConflict() : saved;
	}

	/**
	 * Saved in another tab since this one loaded it: shows both sides'
	 * changes, overwrites or loads the saved version
	 *
	 * @returns {Promise<boolean>} Saved or reloaded
	 */
	async function resolveConflict(): Promise<boolean> {
		const base = config(loaded);
		const mine = config(localData.value);

		const choice = await conflict.ask({
			deleted: false,
			options: ["overwrite", "reload"],
			loadChanges: async () => {
				const saved = await fetchSaved();
				if (!saved) throw new Error("Empire deleted");
				return threeWay(base, config(saved), mine, diffEmpire);
			},
		});
		trackEvent("empire:save_conflict", { choice: choice ?? "close" });

		if (choice === "overwrite") return save(true);
		if (choice === "reload") return reloadSaved();
		return false;
	}

	return {
		localData,
		isLoading,
		conflict,
		remoteNotice,
		reload,
		reloadSaved,
		save,
	};
}
