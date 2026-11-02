# planet_search

**Purpose.** Live, filter-driven planet search over a cached index
(`GET /data/planets/search-index/`): name, materials, conditions, COGC,
infrastructure and jumps to exchanges or the viewer's plans. Results show as
List, Matrix or Chart, can be compared, shared as a link, saved in the
browser and turned into a new plan.

**Used by.** `views/PlanetSearchView.vue` (`/search`, public). Helpers are
reused by `production_chain` (engine, `environmentExtras`,
`createSearchContext`, `encodeSearch`, `PlanetPlots`),
`resource_roi_overview` (`environmentExtras`) and `base_roi` (`planetPlots`,
`PlanetPlots`).

## Key files

| File | Role |
| --- | --- |
| `planetSearch.engine.ts` | Pure engine: `filterPlanets`, `facetCounts`, `activeChips`, `restrictionHints` / `nameSearchNote` (why results are missing), `sortPlanets` / `applySortClick`. Each planet gets a bitmask of failed filter dimensions; a facet only re-evaluates its own dimension on planets failing nothing else |
| `planetSearch.schemas.ts` / `.types.ts` | Zod source of truth for the filter model and saved prefs; engine types |
| `planetSearchContext.util.ts` | `createSearchContext(index, planPlanets, now)`: CX and plan references → jump maps (`usePathfinder`) |
| `planetSearchUrl.util.ts` | `encodeSearch` / `decodeSearch`: readable query params, invalid values dropped |
| `planetSearchLabels.util.ts`, `planetSearchChart.util.ts` | Chip/hint/sort texts; Chart data (first 300 results) |
| `usePlanetSearchPrefs.ts` | Saved searches, columns, panel, last view in localStorage (not `UserPreference`, so they work logged out) |
| `useIncrementalRows.ts` | Renders long lists in steps of 100 rows |
| `environmentExtras.util.ts` | Extra building materials per planet with reason; mirrors `getPlanetSpecialMaterials`, tested for all combinations |
| `planetPlots.util.ts` | Free/total plots, full, blocked; null while unknown |
| `components/PlanetSearchPage.vue` | State, URL sync (`router.replace` debounced 300 ms), data loading, layout; only the body waits in `WrapperGameDataLoader` |
| Other `components/` | Filter panel, List/Matrix/Chart views (Chart: `PScatter` with Pareto frontier), compare tray (desktop), header, menus, sortable headers (shift+click adds a tiebreaker), row actions |

## Gotchas

- The index (`GetPlanetSearchIndex`) is not written into `planetsStore`
  (different shape).
- COGC programs that ended after the backend built the index are ignored by
  comparing against the page's load time (`now`).
- Plan references only resolve for plans of the selected empire; others
  (e.g. a link from another player) are dropped.
- Public page: logged out, planning actions open the login panel
  (`useAuthPanel().open()` with `next`); after a login on the page, plan
  distances appear without a reload.

## Tests

`src/tests/features/planet_search/`: engine (property tests of facet counts
on the production-size `api_data_planet_search_index.json`), URL, prefs,
labels, chart, plots, components (`pnpm test:components`) and benches
(`planetSearch.engine.bench.ts`, budget 50 ms per recompute).
