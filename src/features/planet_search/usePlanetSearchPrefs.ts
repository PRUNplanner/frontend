import { ref, watch, type Ref } from "vue";

// Schemas
import {
	PlanetSearchPrefsSchema,
	type PlanetSearchPrefs,
} from "@/features/planet_search/planetSearch.schemas";

const STORAGE_KEY = "prunplanner_planet_search";

/**
 * Stored view prefs, defaults when storage is unavailable or invalid
 * @author jplacht
 */
function readPlanetSearchPrefs(): PlanetSearchPrefs {
	let stored: unknown = {};
	try {
		stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
	} catch {
		// storage blocked or corrupt: defaults
	}
	const parsed = PlanetSearchPrefsSchema.safeParse(stored);
	return parsed.success ? parsed.data : PlanetSearchPrefsSchema.parse({});
}

function writePlanetSearchPrefs(prefs: PlanetSearchPrefs): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// storage blocked or full: prefs live for this page only
	}
}

/**
 * Planet search view prefs in this browser: saved searches, hidden columns
 * and materials, the collapsed filter panel and the last view. Not a
 * UserPreference, which would sync to the backend.
 * @author jplacht
 */
export function usePlanetSearchPrefs(): { prefs: Ref<PlanetSearchPrefs> } {
	const prefs: Ref<PlanetSearchPrefs> = ref(readPlanetSearchPrefs());

	watch(prefs, (value) => writePlanetSearchPrefs(value), { deep: true });

	return { prefs };
}
