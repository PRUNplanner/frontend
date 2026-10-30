import { getCurrentScope, onScopeDispose, type Ref, ref } from "vue";

import { yieldToBrowser } from "@/util/yieldToBrowser";

export interface IRunProgress {
	current: number;
	total: number;
}

export interface IRun {
	/** false once a newer run started or the owner was disposed */
	isCurrent: () => boolean;
	/** counts finished items while the run is current */
	step: (n?: number) => void;
	/** gives the browser a turn, then tells whether the run is current */
	yield: () => Promise<boolean>;
}

/**
 * Runs that replace each other: each `start()` supersedes the runs before
 * it, so a slower older run drops its results. Holds one shared progress
 * and stops every run when the owning scope (component) is disposed.
 *
 * @author jplacht
 */
export function useRunProgress() {
	const progress: Ref<IRunProgress> = ref({ current: 0, total: 0 });
	let latest: number = 0;

	function cancel(): void {
		latest++;
	}
	if (getCurrentScope()) onScopeDispose(cancel);

	/**
	 * Starts a run, superseding every older one
	 *
	 * @param {number} [total] Items to do, resets the progress when given
	 * @returns {IRun} The run
	 */
	function start(total?: number): IRun {
		const id: number = ++latest;
		if (total !== undefined) progress.value = { current: 0, total };
		const isCurrent = () => id === latest;

		return {
			isCurrent,
			step: (n = 1) => {
				if (isCurrent()) progress.value.current += n;
			},
			yield: async () => {
				await yieldToBrowser();
				return isCurrent();
			},
		};
	}

	return { progress, start, cancel };
}
