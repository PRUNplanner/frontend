# planet_search

**Purpose.** This folder powers planet search: a basic search by name or ID,
and an advanced search by resources, COGC program, environment, facilities
and distance to a system. Results can be turned into a new plan.

**Used by.** `views/PlanetSearchView.vue` (`/search`) and
`ResourceROIOverviewView`.

## Key files

| File | Role |
| --- | --- |
| `components/PlanetSearchBasic.vue` | `GetPlanetSearchSingle` query |
| `components/PlanetSearchAdvanced.vue` | Builds `IPlanetSearchAdvanced` → `PostPlanetSearch` query |
| `components/PlanetSearchResults.vue` | Results table: POPR button, jump distances, "create plan" link |
| `usePlanetSearchResults.ts` | `usePlanetSearchResults(planets, materials, richness, system, distance)` → table rows with fertility, COGC, environment, resource richness, and jumps to each exchange |
| `searchConstants.ts` | Select options: materials, infrastructure, COGC programs, systems |

## Data

- The search payload schema is `PlanetSearchAdvancedPayloadSchema` in
  `features/api/schemas/gameData.schemas.ts`.
- Jump distances come from [pathfinding](pathfinding.md).

## Tests

`src/tests/features/planet_search/usePlanetSearchResult.test.ts` and
`searchConstants.test.ts`.
