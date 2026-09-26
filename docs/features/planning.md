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
| `usePlanCalculation.ts` / `.types.ts` | Engine entry point, `IPlanResult` and the domain unions (`WORKFORCE_TYPE`, `INFRASTRUCTURE_TYPE`, `EXPERT_TYPE`, …) |
| `usePlanCalculationHandlers.ts` | Every edit operation (`handleUpdate*`, `handleCreate*`, `handleDelete*`). Each one mutates `plan.plan_data` and sets `modified` |
| `usePlanCalculationPreComputes.ts` | Per-building cached data and the active empire |
| `calculations/*.ts` | Pure-ish math: bonus, workforce, building, infrastructure, extraction, hab LP optimisation |
| `util/materialIO.util.ts` | Combine and enrich material I/O. Also combines empire I/O (`combineEmpireMaterialIO`, `empireMaterialIOState`) |

## Components

- **Editor panels** (`components/`) are wired together by `PlanView.vue`:
  `PlanConfiguration`, `PlanBonuses`, `PlanArea`, `PlanWorkforce`,
  `PlanInfrastructure`, `PlanExperts`, `PlanProduction` (→
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

- Game data is read through `useBuildingData`, `useMaterialData` and
  `usePlanetData`, and prices through `usePrice`.
- `planningStore.cxs` changes trigger a recalculation.

## Gotchas

- **Panels don't compute anything.** They receive `result` slices as props
  and emit events, and `PlanView` routes those events to `handle*`
  functions. Keep new panels the same way.
- **Put new math in `calculations/`** as exported functions with tests, not
  inline in `usePlanCalculation.ts`, which is already about 1000 lines.
- **Hab auto-optimisation** (`optimizeHabs`) is controlled by the per-plan
  preference `autoOptimizeHabs`.

## Tests

`src/tests/features/planning/` covers the engine, handlers, precomputes,
`calculations/*` and `util/`.
