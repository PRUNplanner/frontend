# planning_data

**Purpose.** Plan lifecycle outside the calculation: blank plans, create and
save calls, the COGC mapping and plan diffs.

**Used by.** `planning` (save, drafts, versions, shared copy),
`wrapper/usePlanningDataLoader`, `resource_roi_overview`, `sharing`,
`save_conflict`, `empire` and `PlanView`.

## Key files

- `usePlan.ts`: `usePlan()` returns `createBlankDefinition(planet, cogc)`
  (no uuid or name until saved), `mapPlanetToPlanType` (planet COGC →
  `PlanCOGCProgram`), `createNewPlan(data)` (`CreatePlan` then `GetPlan`;
  `IPlanSaved` or `undefined`), `saveExistingPlan(uuid, data,
  baseModifiedAt?, version?)` (`PatchPlan`; `IPlanSaved` or `{ error:
  "conflict" | "deleted" | "restored_from" | "failed" }`) and
  `getPlanNamePlanet`. Module export `cogcTextMapping`: COGC display names.
- `planDiff.ts`: `diffPlan(from, to)` → change lines (name, permits, COGC,
  CorpHQ, buildings, infrastructure, experts, workforce) for save conflicts,
  drafts, version preview and shared-plan summaries.
- `usePlan.types.ts`: `IPlanDefinition` (the plan as the editor holds it)
  and the save result types. Payload schemas are in
  `api/schemas/planningData.schemas.ts`.

## Gotchas

- The save payload is `usePlanCalculation().backendData`.
- `PatchPlan`'s response seeds `planningStore` and the `GetPlan` cache, so
  there is no refetch after a save (see [data-layer.md](../data-layer.md)).
- `saveExistingPlan` without `baseModifiedAt` overwrites any newer version
  (the conflict dialog's Overwrite); otherwise pass the version the edit
  started from ([save_conflict.md](save_conflict.md)).

## Tests

`src/tests/features/planning_data/`.
