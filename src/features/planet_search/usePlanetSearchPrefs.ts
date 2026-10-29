import { computed, ref, watch, type Ref, type WritableComputedRef } from "vue";

// Schemas
import {
	OPT_IN_COLUMNS,
	PlanetSearchPrefsSchema,
	type PlanetSearchColumn,
	type PlanetSearchPrefs,
} from "@/features/planet_search/planetSearch.schemas";
import { readStorage, writeStorage } from "@/lib/storage";

const STORAGE_KEY = "prunplanner_planet_search";

/**
 * Stored view prefs, defaults when storage is unavailable or invalid
 * @author jplacht
 */
function readPlanetSearchPrefs(): PlanetSearchPrefs {
	let stored: unknown = {};
	try {
		stored = JSON.parse(readStorage(STORAGE_KEY) ?? "{}");
	} catch {
		// corrupt: defaults
	}
	const parsed = PlanetSearchPrefsSchema.safeParse(stored);
	return parsed.success ? parsed.data : PlanetSearchPrefsSchema.parse({});
}

/**
 * Planet search view prefs in this browser: saved searches, hidden columns
 * and materials, the collapsed filter panel and the last view. Not a
 * UserPreference, which would sync to the backend.
 * @author jplacht
 */
export function usePlanetSearchPrefs(): {
	prefs: Ref<PlanetSearchPrefs>;
	hiddenColumns: WritableComputedRef<PlanetSearchColumn[]>;
} {
	const prefs: Ref<PlanetSearchPrefs> = ref(readPlanetSearchPrefs());

	watch(
		prefs,
		(value) => writeStorage(STORAGE_KEY, JSON.stringify(value)),
		{ deep: true }
	);

	// every hidden column: the ones hidden by the user and the opt-in ones not turned on
	const hiddenColumns = computed({
		get: (): PlanetSearchColumn[] => [
			...prefs.value.hiddenColumns,
			...OPT_IN_COLUMNS.filter((c) => !prefs.value.shownColumns.includes(c)),
		],
		set: (hidden: PlanetSearchColumn[]) => {
			prefs.value.hiddenColumns = hidden.filter(
				(c) => !OPT_IN_COLUMNS.includes(c)
			);
			prefs.value.shownColumns = OPT_IN_COLUMNS.filter(
				(c) => !hidden.includes(c)
			);
		},
	});

	return { prefs, hiddenColumns };
}
