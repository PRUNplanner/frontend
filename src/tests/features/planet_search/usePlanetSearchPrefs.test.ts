import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import { usePlanetSearchPrefs } from "@/features/planet_search/usePlanetSearchPrefs";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";

const KEY = "prunplanner_planet_search";
const DEFAULTS = {
	savedSearches: [],
	hiddenColumns: [],
	shownColumns: [],
	hiddenMaterials: [],
	filtersCollapsed: false,
	view: "list",
};

function memoryStorage(initial: Record<string, string> = {}) {
	const data = { ...initial };
	return {
		getItem: (k: string) => data[k] ?? null,
		setItem: (k: string, v: string) => {
			data[k] = v;
		},
		data,
	};
}

describe("usePlanetSearchPrefs", () => {
	beforeEach(() => vi.unstubAllGlobals());

	it("survives a reload", async () => {
		const storage = memoryStorage();
		vi.stubGlobal("localStorage", storage);

		const { prefs } = usePlanetSearchPrefs();
		expect(prefs.value).toEqual(DEFAULTS);

		prefs.value.savedSearches.push({
			id: "1",
			name: "Water",
			filter: defaultFilter(),
			view: "matrix",
		});
		prefs.value.hiddenMaterials = ["AR"];
		prefs.value.hiddenColumns = ["NC1"];
		prefs.value.filtersCollapsed = true;
		prefs.value.view = "matrix";
		await nextTick();

		const reloaded = usePlanetSearchPrefs().prefs.value;
		expect(reloaded.savedSearches[0].name).toBe("Water");
		expect(reloaded.hiddenMaterials).toEqual(["AR"]);
		expect(reloaded.hiddenColumns).toEqual(["NC1"]);
		expect(reloaded.filtersCollapsed).toBe(true);
		expect(reloaded.view).toBe("matrix");
	});

	it("falls back to defaults when storage throws", async () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
		});

		const { prefs } = usePlanetSearchPrefs();
		expect(prefs.value).toEqual(DEFAULTS);

		prefs.value.view = "matrix";
		await nextTick();
		expect(prefs.value.view).toBe("matrix");
	});

	it("keeps opt-in columns hidden until turned on, also for older prefs", async () => {
		// saved before the plots column existed: nothing hidden
		const storage = memoryStorage({
			[KEY]: JSON.stringify({ hiddenColumns: [] }),
		});
		vi.stubGlobal("localStorage", storage);
		const { prefs, hiddenColumns } = usePlanetSearchPrefs();
		expect(hiddenColumns.value).toEqual(["plots"]);

		// the columns menu shows plots and hides fert
		hiddenColumns.value = ["fert"];
		expect(prefs.value.hiddenColumns).toEqual(["fert"]);
		expect(prefs.value.shownColumns).toEqual(["plots"]);
		expect(hiddenColumns.value).toEqual(["fert"]);
		await nextTick();
		expect(usePlanetSearchPrefs().hiddenColumns.value).toEqual(["fert"]);

		// and hides it again
		hiddenColumns.value = ["fert", "plots"];
		expect(prefs.value.shownColumns).toEqual([]);
		expect(hiddenColumns.value).toEqual(["fert", "plots"]);
	});

	it("keeps valid fields of a partly invalid entry", () => {
		vi.stubGlobal(
			"localStorage",
			memoryStorage({
				[KEY]: JSON.stringify({
					savedSearches: [{ id: 1 }],
					hiddenMaterials: ["AR"],
					view: "grid",
				}),
			})
		);
		expect(usePlanetSearchPrefs().prefs.value).toEqual({
			...DEFAULTS,
			hiddenMaterials: ["AR"],
		});

		vi.stubGlobal("localStorage", memoryStorage({ [KEY]: "{not json" }));
		expect(usePlanetSearchPrefs().prefs.value).toEqual(DEFAULTS);

		vi.stubGlobal("localStorage", memoryStorage({ [KEY]: "42" }));
		expect(usePlanetSearchPrefs().prefs.value).toEqual(DEFAULTS);
	});
});
