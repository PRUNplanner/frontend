# pathfinding

**Purpose.** This folder computes jump paths and distances between star
systems. It is used to show how far a planet is from each exchange.

**Used by.** `planet_search` (`planetSearchContext.util.ts`, jumps from
exchanges and plans via `getJumpsFrom`) and `resource_roi_overview`.

## Key files

- **`usePathfinder.ts`**: `usePathfinder()` returns `ready`,
  `getPathBetween(a, b)`, `getPathBetweenLength(a, b)`, `getJumpsFrom(id)`
  (BFS jumps to every system, cached per source), `getSystemName(id)`,
  and the exchange system IDs (`systemidAI1`, `systemidCI1`, `systemidIC1`,
  `systemidNC1`).
- **`usePathfinder.types.ts`**: the system JSON and adjacency types.
- **Data:** `src/assets/static/fio_systemstars.json`, a static FIO export of
  every system and its connections (about 470 KB).

## Gotchas

- **State is module-level and built once per session.** This covers the
  adjacency list, the id↔index maps, and a BFS parent cache per source.
  Treat it as read-only.
- **The system data is static.** Refresh the JSON if the game map changes.

## Tests

`src/tests/features/pathfinding/usePathfinder.test.ts`
