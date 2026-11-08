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
 * The layout of this browser tab, for visitors (a shared plan): survives a
 * reload, gone when the tab closes. Blocked storage, broken JSON or an
 * unknown shape read as nothing stored.
 * @author jplacht
 */
export const sessionLayoutStore: LayoutStore = {
	load() {
		const raw = readStorage(STORAGE_KEY, "session");
		if (raw === null) return null;
		try {
			const parsed = StoredLayoutSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	},
	save(v) {
		writeStorage(STORAGE_KEY, JSON.stringify(v), "session");
	},
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
 * The Custom Layout this tab kept (as a visitor, or before layouts were saved
 * to the account), read once: the key is cleared either way
 * @author jplacht
 *
 * @returns {StoredLayout | null} The tab's layout, when it has a Custom Layout
 */
export function takeTabLayout(): StoredLayout | null {
	const tab = sessionLayoutStore.load();
	writeStorage(STORAGE_KEY, null, "session");
	return tab?.custom ? tab : null;
}
