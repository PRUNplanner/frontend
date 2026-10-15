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
  - `PlanCOGM` / `PlanCOGMTable`: cost of goods manufactured, also
    without a CX (Universe prices); input price sources link to the rule
    in Exchanges, and the prices panel sets the all-planets buy price to
    the COGM ("Use as buy price", "Update to <COGM>") with the shared
    `CXFixedPriceTable` and save bar;
  - `PlanConstructionCart` and `PlanSupplyCart`: shopping lists, with
    XIT/FIO integration;
  - `PlanPOPR`: population report;
  - `PlanProfitBreakdown`: waterfall from output value to daily profit
    (`util/profitBreakdown.util.ts`, drawn by `ui/charts/PWaterfall`);
  - `PlanRepairAnalysis`: uses `repair_analysis`;
  - `PlanVisitationFrequency`;
  - `PlanCheck` (tool key `plan-check`, called What-if before 2026-10-14):
    three views, kept per tab in `usePlanCheckView`. The plan's Material
    I/O opens it on Market check.
    - `PlanCheckMarket` (default): market flags per material
      (`cx/marketCheck.util.ts`, see [cx.md](cx.md)), the plan at real
      ask/bid prices (`whatIf.util.realisticPlan`) and a summary.
    - Price sensitivity: how far profit moves per material price and each
      break-even price change (`util/whatIf.util.ts`, one recalculation per
      material with `cx/priceBook.scaledPriceBook`, drawn by
      `ui/charts/PDivergingBar`). `PlanCheckTarget` solves the price for a
      target profit (`targetFactor`) and fetches the exchange's 30-day
      range (`GetExplorationData`) once it is used.
    - Logged in, `PlanCheckCompare` compares the open plan with another of
      the user's plans (`GetAllPlans`): key figures, the payback of the
      difference (`paybackOfDifference`), material changes with the flags
      the other plan pushes them into, and a verdict (`compareRows`,
      `materialChanges`, `compareVerdict`). The other plan is calculated as
      its own plan view does: its first empire and that empire's CX
      preference.
- `PlanMaterialIO` shows a market flag button after a flagged material
  (`cx/components/MarketFlagButton`) and a one-line count under the table;
  `PlanView` computes the checks with the plan's price book.

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
- **A shared plan is the viewer's working copy** (`shared`): editable like
  a new plan, never saved over the owner's. See
  [sharing.md](sharing.md). Optional props compare it with the shared
  version: `compare` on `PlanStatusBar` and `PlanOverview`, `changes` on
  `PlanProduction` (marks per building and recipe row, removed buildings
  struck through).
- **Recipe rows show their inputs** when another recipe of the building has
  the same outputs (`hasOutputTwin`, `recipeOutputs.util.ts`). The recipe
  popover always opens; read-only, a click on an option does nothing.
- **`disabled` means read-only**. Panels hide what only
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
