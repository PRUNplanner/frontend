# planning_data

**Purpose.** This folder handles the plan lifecycle outside the calculation:
blank plan creation, save, reload, and the COGC mapping.

**Used by.** `PlanView.vue`, `PlanStatusBar`, `EmpirePlanList`,
`usePreferences` (plan names for preference cleanup),
`usePlanningDataLoader` and `useResourceROIOverview`.

## Key files

- **`usePlan.ts`**:
  - `createBlankDefinition(planet…)` builds a new `IPlanDefinition` for a planet (no uuid or name until saved).
  - `mapPlanetToPlanType` translates the planet's COGC program to the
    plan's `PlanCOGCProgram`.
  - `createNewPlan`, `saveExistingPlan` and `reloadExistingPlan` go
    through `useQuery` (`CreatePlan`, `PatchPlan`, `GetPlan`).
    `createNewPlan` returns the uuid
    and save version (`IPlanSaved`); `saveExistingPlan(uuid, data, base)`
    returns that or `{ error: "conflict" | "deleted" | "failed" }`.
- **`planDiff.ts`**: `diffPlan(from, to)` lists what changed between two
  plan versions for the save conflict dialog and a shared plan's change
  summary, matched by building, hab, expert and workforce type.
  - `getPlanNamePlanet(uuid)` looks a plan's name and planet up from the
    store.
  - `cogcTextMapping` holds display names for COGC programs.
- **`usePlan.types.ts`**: `IPlanDefinition`, the plan
  as the editor holds it. The save/create payloads are `PlanCreateData` and
  `PlanSaveData` (`api/schemas/planningData.schemas.ts`).

## Data

- The save payload is `usePlanCalculation().backendData`.
- The queries update `planningStore.plans` and invalidate the
  `["planningdata", "plan"]` keys.

## Tests

`src/tests/features/planning_data/usePlan.test.ts`
