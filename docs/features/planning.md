# planning

**Purpose.** This folder holds the plan calculation engine and the plan
editor UI. The engine is documented in depth in
[../planning-engine.md](../planning-engine.md).

**Used by.**
- `views/PlanView.vue`, the editor at `/plan/:planetNaturalId/:planUuid?`
  and `/shared/:sharedPlanUuid`.
- The batch calculation callers: `EmpireView`, `FIOBurnView`,
  `roi_overview` and `resource_roi_overview`.

## Key files

| File | Role |
| --- | --- |
| `engine/*.ts` | The pure calculation engine, `calculatePlan(input, ctx)`. See [planning-engine.md](../planning-engine.md) |
| `usePlanContext.ts` | Builds the engine context: game data maps, planet, price book; `getActiveEmpire` |
| `usePlanCalculation.ts` / `.types.ts` | Vue adapter for the plan editor (synchronous `computed` result), `IPlanResult` and its sub-records. The domain unions (`WorkforceType`, `InfrastructureType`, `ExpertType`, `StorageType`) derive from the enums in `api/schemas/planningData.schemas.ts` |
| `usePlanCalculationHandlers.ts` | Every edit operation (`handleUpdate*`, `handleCreate*`, `handleDelete*`). Each one mutates `plan.plan_data` |
| `usePlanHistory.ts` | Undo/redo for the editor: wraps the handlers so each edit is one step, and owns `modified` (differs from the last save) and `savedAt` |
| `calculations/*.ts` | Wrappers around the engine (bonus, workforce, building), infrastructure lists, extraction, hab LP optimisation |
| `util/materialIO.util.ts` | Combine and enrich material I/O. Also combines empire I/O (`combineEmpireMaterialIO`, `empireMaterialIOState`) |

## Components

- **Editor panels** (`components/`) are wired together by `PlanView.vue`:
  `PlanConfiguration`, `PlanBonuses`, `PlanArea`, `PlanWorkforce`,
  `PlanInfrastructure`, `PlanExperts`, `PlanSaveButton`, `PlanProduction` (→
  `PlanProductionBuilding` → `PlanProductionRecipe`), `PlanMaterialIO`,
  `PlanOverview` and `PlanStatusBar`.
- **Tools** (`components/tools/`) are extra panels on the plan page:
  - `PlanCOGM` / `PlanCOGMTable`: cost of goods manufactured;
  - `PlanConstructionCart` and `PlanSupplyCart`: shopping lists, with
    XIT/FIO integration;
  - `PlanPOPR`: population report;
  - `PlanRepairAnalysis`: uses `repair_analysis`;
  - `PlanVisitationFrequency`.

## Data

- The engine reads game data, the planet and prices from its context
  (`usePlanContext`: preloaded `useDB` caches, `usePlanetData`, a
  `PriceBook`). Components still use `useBuildingData`, `useMaterialData`
  and `usePrice`.
- The result is a `computed`: plan, empire, CX and `planningStore.cxs`
  changes recalculate it synchronously.

## Gotchas

- **Panels don't compute anything.** They receive `result` slices as props
  and emit events, and `PlanView` routes those events to `handle*`
  functions. Keep new panels the same way.
- **`disabled` means read-only** (a shared plan). Panels hide what only
  makes sense while editing (add building, add or delete recipe, recipe
  picker, empire, amount steppers) instead of greying it out. Inputs that
  show a value stay, disabled.
- **Put new math in `engine/`** as exported plain functions with tests in
  `src/tests/features/planning/engine/`. Components never write into
  `result`: bind `:value` and emit.
- **Hab auto-optimisation** (`optimizeHabs`) is controlled by the per-plan
  preference `autoOptimizeHabs`.

## Tests

`src/tests/features/planning/` covers the engine, handlers, precomputes,
`calculations/*` and `util/`.
