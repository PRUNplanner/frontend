# wrapper

**Purpose.** This folder holds the data-loading gates that almost every view
wraps its content in. Each gate runs a list of loading steps through the
query cache, shows a progress or error screen, and renders its slot only
when every step has finished.

**Used by.** Nearly every file in `src/views/`.

## Key files

| File | Role |
| --- | --- |
| `components/WrapperGameDataLoader.vue` + `useGameDataLoader.ts` | Props `load-materials`, `load-exchanges`, `load-buildings`, `load-recipes`, `load-planet="<id>"`, `load-planet-multiple="[ids]"` and `minimal`. Runs the `Get*` game-data queries, which fill IndexedDB |
| `components/WrapperPlanningDataLoader.vue` + `usePlanningDataLoader.ts` | Props `empire-list`, `empire-uuid`, `plan-list`, `planet-natural-id`, `plan-uuid`, `shared-plan-uuid`, `load-c-x`, `cx-uuid` and `load-shared`. Runs the planning queries, which fill `planningStore` |
| `components/WrapperGenericError.vue` | Shared error panel |
| `gameDataLoader.types.ts`, `planningDataLoader.types.ts`, `dataLoader.types.ts` | Props, emits, and the `StepConfig` / `StepState` types |

## Behaviour

- **Steps.** Each step config has a `key`, a translated `name`,
  `enabled()`, `load()` and `onSuccess()`. Only enabled steps run.
- **Events.** On success a step emits `data:*` (e.g. `data:materials`,
  `data:empire:plans`), and the loader emits `complete` at the end.
  `WrapperPlanningDataLoader` also emits `update:empireUuid` and
  `update:cxUuid`, which resolve the default empire and CX.
- **Changes from other tabs.** Planning steps with a `refreshKey` reload
  when another tab changes data under it (`remoteChange`, see
  [data-layer.md §6](../data-layer.md#6-several-tabs-srclibcrosstabts)).
  The old data stays until the new arrives, so the page never falls back to
  the loading screen; the step's `data:*` event fires again and the loader
  emits `refreshed`. A refreshed CX list keeps the selected CX.
- **Rendering.** The slot renders inside `<Suspense>`, so children can
  `await` data in `<script setup>`.
- **Missing shared plan.** A 404 on the `shared-plan-uuid` step
  (`sharedPlanMissing`) shows "no longer available" with a link home instead
  of the step list. Other errors keep the loader with the failed step.
- **Shared plan.** `shared-plan-uuid` must not come with `plan-uuid` or
  `planet-natural-id`; the viewer's empires, CX and plans may load with it.
  The slot gets the shared plan as a working copy (`planDefinition`
  without uuid, empires and save version) and `shared: true`.

## Gotchas

- **Nest the gates.** Put the planning loader outside the game-data loader
  when the planet list depends on the plans. `EmpireView` passes
  `:load-planet-multiple` computed from the plans.
- **Coverage** counts this folder except `usePlanningDataLoader.ts`, which
  its component test covers. Keep its logic thin.

## Tests

`src/tests/features/wrapper/useGameDataLoader.test.ts` (`pnpm test`) and
`src/tests/features/wrapper/components/Wrapper*DataLoader.test.ts`
(`pnpm test:components`, CI runs both).
