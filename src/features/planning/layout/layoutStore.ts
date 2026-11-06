// Types & Interfaces
import {
	type StoredLayout,
	StoredLayoutSchema,
} from "@/features/planning/layout/planLayout.schemas";

// Util
import { readStorage, writeStorage } from "@/lib/storage";
import { STORAGE_KEY } from "@/features/planning/layout/planLayout.constants";

/** Where the player's layout is kept; plan-layouts-03 swaps it for the account */
export interface LayoutStore {
	load(): StoredLayout | null;
	save(v: StoredLayout): void;
}

/**
 * The layout of this browser tab: survives a reload, gone when the tab
 * closes, not shared with other tabs. Blocked storage, broken JSON or an
 * older shape read as nothing stored.
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
