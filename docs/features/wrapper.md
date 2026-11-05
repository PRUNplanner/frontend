# wrapper

**Purpose.** Data-loading gates views wrap their content in: each runs named
steps through the query cache, shows progress or an error, and renders its
slot (inside `<Suspense>`) once every step finished.

**Used by.** Most views in `src/views/` plus `PlanetSearchPage` and
`APIURLBuilder`. Landing, help, account, market report and live views load without them.

## Key files

| File | Role |
| --- | --- |
| `components/WrapperGameDataLoader.vue` + `useGameDataLoader.ts` | `load-materials`, `load-exchanges`, `load-buildings`, `load-recipes`, `load-planet`, `load-planet-multiple`, `minimal`: game data |
| `components/WrapperPlanningDataLoader.vue` + `usePlanningDataLoader.ts` | `empire-list`, `empire-uuid`, `plan-list`, `planet-natural-id`, `plan-uuid`, `shared-plan-uuid`, `load-c-x`, `cx-uuid`, `load-shared`: planning data |
| `*.types.ts`, `dataLoader.util.ts` | Props, emits, `StepConfig` / `StepState`, `step(cfg)` |
| `components/WrapperGenericError.vue`, `useDelay.ts` | Error panel; `useDelay(ms)` so fast loads skip the loading screen (400 ms) |

## Behaviour

- **Steps** have `enabled()`, `load()`, `onSuccess()`, optional `ready()`
  (false waits for another step) and `refreshKey`.
- **Data** passed to the slot is the query cache's own object: read-only,
  copy before editing ([data-layer.md §3](../data-layer.md#3-query-cache-srclibquery_cache)).
  A disabled step's slot prop is `null`.
- **Events.** `data:*` per step, `complete`; the planning loader also emits
  `update:empireUuid` / `update:cxUuid` (resolved defaults).
- **Other tabs.** Planning steps with a `refreshKey` reload on
  `remoteChange` ([data-layer.md §6](../data-layer.md#6-several-tabs-srclibcrosstabts))
  without falling back to the loading screen; `data:*` fires again, then
  `refreshed`.
- **Shared plan.** `shared-plan-uuid` excludes `plan-uuid` and
  `planet-natural-id`; the slot gets a working copy and `shared: true`. A
  404 shows "no longer available".

## Gotchas

- **Nest the gates**: planning loader outside the game-data loader when the
  planets depend on the plans (`EmpireView`).
- **`usePlanningDataLoader.ts` has no unit test**, only the component test:
  keep its logic thin.

## Tests

`src/tests/features/wrapper/` (`components/` run with `pnpm test:components`).
