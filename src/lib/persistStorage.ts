import type { StorageLike } from "pinia-plugin-persistedstate";

// no imports from the stores: they read this while their module loads

let stopped: boolean = false;

/**
 * localStorage for the persisted user and planning stores. Once another
 * tab started a new session (another user logged in), this tab stops
 * writing, so its old tokens and data never replace the new session's,
 * even if it stays open on the leave-page prompt.
 */
export const persistStorage: StorageLike = {
	getItem: (key) => localStorage.getItem(key),
	setItem: (key, value) => {
		if (!stopped) localStorage.setItem(key, value);
	},
};

/** Stops all further writes of this tab's persisted stores */
export function stopPersisting(): void {
	stopped = true;
}
