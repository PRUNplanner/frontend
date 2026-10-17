import type { StorageLike } from "pinia-plugin-persistedstate";
import { trackException } from "@/lib/analytics/useAnalytics";

// no imports from the stores: they read this while their module loads

let stopped: boolean = false;
let reported: boolean = false;

/**
 * localStorage for the persisted user and planning stores. Once another
 * tab started a new session (another user logged in), this tab stops
 * writing, so its old tokens and data never replace the new session's,
 * even if it stays open on the leave-page prompt.
 *
 * A failed write (e.g. the quota is full) keeps the previously stored
 * value, the app goes on with its state in memory. Reported once per tab.
 */
export const persistStorage: StorageLike = {
	getItem: (key) => localStorage.getItem(key),
	setItem: (key, value) => {
		if (stopped) return;
		try {
			localStorage.setItem(key, value);
		} catch (err) {
			if (reported) return;
			reported = true;
			trackException(err, {
				key,
				size_kb: Math.round(value.length / 1024),
			});
		}
	},
};

/** Stops all further writes of this tab's persisted stores */
export function stopPersisting(): void {
	stopped = true;
}
