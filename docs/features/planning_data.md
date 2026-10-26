# planning_data

**Purpose.** This folder handles the plan lifecycle outside the calculation:
blank plan creation, save, reload, the COGC mapping and plan diffs.

**Used by.** `PlanView.vue`, `usePlanningDataLoader` and
`useResourceROIOverview` (`usePlan`); `PlanBase`, `EmpirePlanList` and
`save_conflict/changeLineText.ts` (`cogcTextMapping`);
`sharing/sharedPlan.util.ts` and `PlanView` (`diffPlan`).

## Key files

- **`usePlan.ts`**:
  - `createBlankDefinition(planetNaturalId, cogc)` builds a new `IPlanDefinition` for a planet (no uuid or name until saved).
  - `mapPlanetToPlanType` translates the planet's COGC program to the
    plan's `PlanCOGCProgram`.
  - `createNewPlan` and `saveExistingPlan` go through `useQuery`
    (`CreatePlan`, `PatchPlan`, then `GetPlan`); `reloadExistingPlan` reads
    `planningStore.getPlan`. `createNewPlan` returns the uuid
    and save version (`IPlanSaved`, `undefined` on failure);
    `saveExistingPlan(uuid, data, baseModifiedAt)`
    returns that or `{ error: "conflict" | "deleted" | "failed" }`.
  - `getPlanNamePlanet(uuid)` looks a plan's name and planet up from the
    store (it lives in `planningStore`, so `usePreferences` uses it there).
  - `cogcTextMapping` holds display names for COGC programs.
- **`planDiff.ts`**: `diffPlan(from, to)` lists what changed between two
  plan versions for the save conflict dialog and a shared plan's change
  summary, matched by building, hab, expert and workforce type.
- **`usePlan.types.ts`**: `IPlanDefinition`, the plan
  as the editor holds it, and the save results (`IPlanSaved`,
  `IPlanSaveFailed`, `IPlanSaveResult`). The save/create payloads are
  `PlanCreateData` and `PlanSaveData` (`api/schemas/planningData.schemas.ts`).

## Data

- The save payload is `usePlanCalculation().backendData`.
- `CreatePlan` and `PatchPlan` invalidate the `["planningdata", "plan"]` and
  `["planningdata", "empire"]` keys and tell the user's other tabs; the
  following `GetPlan` updates `planningStore`.

## Gotchas

- `saveExistingPlan` without `baseModifiedAt` saves over any newer version
  (the conflict dialog's Overwrite). Otherwise pass the version the edit
  started from, see [save_conflict.md](save_conflict.md).

## Tests

`src/tests/features/planning_data/usePlan.test.ts`, `planDiff.test.ts`
