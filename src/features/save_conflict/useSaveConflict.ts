import { type Ref, ref, shallowRef, type ShallowRef } from "vue";
import { reportError } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type {
	IChanges,
	ISaveConflictRequest,
	SaveConflictOption,
	SaveConflictVariant,
} from "@/features/save_conflict/saveConflict.types";

/**
 * State of one save conflict dialog. `ask` opens it and resolves with the
 * option the user picked, or null when they closed it.
 *
 * @author jplacht
 */
export function useSaveConflict() {
	const show: Ref<boolean> = ref(false);
	const deleted: Ref<boolean> = ref(false);
	const variant: Ref<SaveConflictVariant> = ref("save");
	const options: Ref<SaveConflictOption[]> = ref([]);
	const changes: ShallowRef<IChanges | null> = shallowRef(null);
	const loading: Ref<boolean> = ref(false);

	let answer: ((option: SaveConflictOption | null) => void) | null = null;
	// a later dialog replaces an earlier one's late changes
	let current: ISaveConflictRequest | null = null;

	/**
	 * Opens the dialog
	 *
	 * @param {ISaveConflictRequest} request What to show and offer
	 * @returns {Promise<SaveConflictOption | null>} Chosen option, null if closed
	 */
	function ask(
		request: ISaveConflictRequest
	): Promise<SaveConflictOption | null> {
		answer?.(null);
		current = request;
		deleted.value = request.deleted;
		variant.value = request.variant ?? "save";
		options.value = request.options;
		changes.value = null;
		loading.value = !!request.loadChanges;
		show.value = true;

		request
			.loadChanges?.()
			.then((result) => {
				if (current === request) changes.value = result;
			})
			.catch(reportError)
			.finally(() => {
				if (current === request) loading.value = false;
			});

		return new Promise((resolve) => (answer = resolve));
	}

	/**
	 * Closes the dialog with the option, null keeps the edits unsaved
	 *
	 * @param {SaveConflictOption | null} option Option
	 */
	function choose(option: SaveConflictOption | null): void {
		show.value = false;
		current = null;
		const resolve = answer;
		answer = null;
		resolve?.(option);
	}

	return { show, deleted, variant, options, changes, loading, ask, choose };
}
