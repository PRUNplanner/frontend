# pathfinding

**Purpose.** Jump paths and distances between star systems, e.g. how far a
planet is from each exchange.

**Used by.** `planet_search` (`planetSearchContext.util.ts`),
`resource_roi_overview`, `base_roi` (`useBaseROI`) and `production_chain`
(`ChainBases`, `CheckFinding`).

## Key files

- `usePathfinder.ts`: `usePathfinder()` returns `ready`,
  `getPathBetween(a, b)`, `getPathBetweenLength(a, b)`, `getJumpsFrom(id)`
  (BFS jumps to every system, cached per source), `getSystemName(id)` and the
  exchange system ids (`systemidAI1`, `systemidCI1`, `systemidIC1`,
  `systemidNC1`).
- `usePathfinder.types.ts`: system JSON and adjacency types.
- `src/assets/static/fio_systemstars.json` (~480 KB, static FIO export of
  systems and connections), imported only here. `system_names.json` beside
  it maps named systems to names for `util/planetName.ts`.

## Gotchas

- State (adjacency list, id↔index maps, BFS caches) is **module-level** and
  built once per session. Treat it as read-only.
- The map is static. If the game map changes, run `pnpm refresh:systems`
  (`scripts/refresh-systems.mjs`: fetches FIO `/systemstars`, checks the
  shape, regenerates `system_names.json`; `--offline` only regenerates the
  names) and commit both files.

## Tests

`src/tests/features/pathfinding/usePathfinder.test.ts`
