# planning_data

**Purpose.** This folder handles the plan lifecycle outside the calculation:
blank plan creation, save, reload, cloning shared plans, and the COGC
mapping.

**Used by.** `PlanView.vue`, `PlanStatusBar`, `EmpirePlanList`,
`usePreferences` (plan names for preference cleanup),
`usePlanningDataLoader` and `useResourceROIOverview`.

## Key files

- **`usePlan.ts`**:
  - `createBlankDefinition(planet…)` builds a new `IPlanDefinition` for a planet (no uuid or name until saved).
  - `mapPlanetToPlanType` translates the planet's COGC program to the
    plan's `PlanCOGCProgram`.
  - `createNewPlan`, `saveExistingPlan`, `reloadExistingPlan` and
    `cloneSharedPlan` go through `useQuery` (`CreatePlan`, `PatchPlan`,
    `GetPlan`, `PostCloneSharedPlan`).
  - `getPlanNamePlanet(uuid)` looks a plan's name and planet up from the
    store.
  - `isEditDisabled(routeParams)` returns true for shared plans.
  - `cogcTextMapping` holds display names for COGC programs.
- **`usePlan.types.ts`**: `IPlanRouteParams` and `IPlanDefinition`, the plan
  as the editor holds it. The save/create payloads are `PlanCreateData` and
  `PlanSaveData` (`api/schemas/planningData.schemas.ts`).

## Data

- The save payload is `usePlanCalculation().backendData`.
- The queries update `planningStore.plans` and invalidate the
  `["planningdata", "plan"]` keys.

## Tests

`src/tests/features/planning_data/usePlan.test.ts`
