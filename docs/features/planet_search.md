# planet_search

**Purpose.** This folder powers planet search: one live, filter-driven page
over a cached planet index from the backend (`GET /data/planets/search-index/`).
Players filter by name, material groups (any/all, minimum /day), planet
conditions (surface, fertility, accepted extra building materials), active
COGC program, infrastructure and jumps to exchanges or their own plans.
Results show as a List or a Matrix, can be compared (desktop), shared as a
link and saved in the browser. A result can be turned into a new plan.

**Used by.** `views/PlanetSearchView.vue` (`/search`).
`environmentExtras.util.ts` is also used by `resource_roi_overview`.

## Key files

| File | Role |
| --- | --- |
| `planetSearch.engine.ts` | Pure engine: `filterPlanets`, `facetCounts`, `activeChips`, `zeroResultHints`, `sortPlanets` (a chain of sort keys), `applySortClick`, `defaultSort`, `rankValues` and small helpers. Each planet gets a bitmask of the filter dimensions it fails; a facet only re-evaluates its own dimension on the planets failing nothing else |
| `planetSearch.schemas.ts` | Zod source of truth for the filter model and the localStorage prefs |
| `planetSearch.types.ts` | Engine context, facets, chips, hints, sort |
| `planetSearchContext.util.ts` | `createSearchContext(index, planPlanets, now)`: resolves CX and the viewer's plans to jumps maps (`usePathfinder().getJumpsFrom`) |
| `planetSearchUrl.util.ts` | `encodeSearch` / `decodeSearch`: readable query params, invalid values dropped |
| `planetSearchLabels.util.ts` | Chip and hint texts with the actual values |
| `usePlanetSearchPrefs.ts` | Saved searches, hidden columns/materials, collapsed panel, last view in localStorage (not `UserPreference`) |
| `useIncrementalRows.ts` | Renders long result lists in steps of 100 rows |
| `environmentExtras.util.ts` | `environmentExtras(buckets)` → extra building materials with their reason; `planetBuckets(planet)` for a full `Planet`. Mirrors `getPlanetSpecialMaterials` in the plan engine (tested for all combinations) |
| `components/PlanetSearchPage.vue` | Orchestrates state, url sync, data loading and layout |
| `components/PlanetSearchFilterPanel.vue` | The filters (also used in the small-screen drawer) |
| `components/PlanetSearchList.vue` / `PlanetSearchMatrix.vue` | Result views with sticky header and planet column |
| `components/PlanetSearchCompare.vue` | Docked compare tray, desktop only |

## Data

- `GetPlanetSearchIndex` query; the index is not written into `planetsStore`
  (different shape). COGC programs that ended since the backend built the
  index are ignored by comparing against the page's load time.
- Plan references only resolve for plans of the selected empire; others (a
  link from another player) are dropped.

## Tests

`src/tests/features/planet_search/`: engine (including property tests of
the facet counts on `api_data_planet_search_index.json`, a production-size
index), url round trip, prefs, labels, and a bench
(`planetSearch.engine.bench.ts`, budget 50 ms per recompute). Component
tests in `components/` run with `pnpm test:components`.
