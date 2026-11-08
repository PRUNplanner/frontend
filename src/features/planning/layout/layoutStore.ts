// Stores
import { useUserStore } from "@/stores/userStore";

// Types & Interfaces
import {
	type StoredLayout,
	StoredLayoutSchema,
} from "@/features/planning/layout/planLayout.schemas";

// Util
import { readStorage, writeStorage } from "@/lib/storage";
import { deepClone } from "@/util/data";
import { STORAGE_KEY } from "@/features/planning/layout/planLayout.constants";

/** Where the player's layout is kept */
export interface LayoutStore {
	load(): StoredLayout | null;
	save(v: StoredLayout): void;
	// false until load() gives the latest (the account's preferences arrived)
	ready?(): boolean;
}

/**
 * A logged out visitor's: Standard, nothing kept (a fold lasts until the
 * page reloads)
 * @author jplacht
 */
export const standardLayoutStore: LayoutStore = {
	load: () => null,
	save: () => {},
};

/**
 * The account's layout, the `planLayout` preference: the preference sync
 * sends it (whole, debounced) and other tabs' changes arrive in it. load()
 * is reactive.
 * @author jplacht
 */
export const preferencesLayoutStore: LayoutStore = {
	load() {
		return useUserStore().preferences.planLayout;
	},
	save(v) {
		useUserStore().setPreference("planLayout", deepClone(v));
	},
	ready() {
		return useUserStore().preferencesLoaded;
	},
};

/**
 * The Custom Layout this tab kept (plan-layouts-01 kept it in sessionStorage,
 * before layouts were saved to the account), read once: the key is cleared either way
 * @author jplacht
 *
 * @returns {StoredLayout | null} The tab's layout, when it has a Custom Layout
 */
export function takeTabLayout(): StoredLayout | null {
	const raw = readStorage(STORAGE_KEY, "session");
	if (raw === null) return null;
	writeStorage(STORAGE_KEY, null, "session");
	try {
		const parsed = StoredLayoutSchema.safeParse(JSON.parse(raw));
		return parsed.success && parsed.data.custom ? parsed.data : null;
	} catch {
		return null;
	}
}
