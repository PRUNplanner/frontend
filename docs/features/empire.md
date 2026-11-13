# empire

**Purpose.** The empire dashboard (`/empire/:empireUuid?`): every plan of an
empire aggregated into cost overview, plan list, analysis charts, material
I/O and production opportunities.

**Used by.** `views/EmpireView.vue`; `useEmpireCalculation` also by
`views/fio/FIOBurnView.vue`; `useEmpireProfits` by `PlanView` and
`MobileNavBar`. See [../planning-engine.md](../planning-engine.md#empires).

## Key files

- `useEmpireCalculation.ts`: calculates every plan with its empire and CX,
  one at a time with yields; results cached by `planResultCacheKey`
  (`empire.util.ts`, also used by `useFIORepair`).
- `useEmpireProfits.ts`: the profits `EmpireView` last calculated, for views
  that don't calculate (phone plans sheet, plan results bar). Valid only
  while the empire's `GetEmpirePlans` entry is cached, so a save drops them.
- `useEmpireForm.ts`: edits an empire's configuration, saved with
  `PatchEmpire` and its base version; conflicts per
  [save_conflict](save_conflict.md) (diff in `empireDiff.ts`).
- `useProductionOpportunities.ts`: recipes that could use the empire's
  surplus, priced at SELL.
- `empireAnalysis.util.ts` (revenue split, butterfly), `util/` (Material I/O
  and shipping demand helpers), `empire.types.ts` (frontend-only shapes; wire
  shapes in `api/schemas/empireData.schemas.ts`), `empire.constants.ts`.
- `components/`: `EmpireCostOverview`, `EmpirePlanList`,
  `EmpireConfiguration(Form)`, `EmpireOnboarding` (0 plans), `EmpireEmpty`
  (no empires), `EmpireAnalysis` (+ `EmpireRevenueSplit`,
  `EmpireMaterialButterfly`), `EmpireOpportunities`, and `EmpireMaterialIO*`
  (`Filtered` runs the market check on the empire's net flow with one price
  book for the empire's CX and no planet).

## Gotchas

- Results depend on empire and CX (cache keys, see planning-engine.md).
- `EmpireView` loads the CX list (`load-c-x`) and derives the empire's CX
  from it (`findEmpireCXUuid`), so a CX deleted or reassigned elsewhere
  drops out with the list's next load and the empire recalculates quietly.
  Don't keep a copy of the CX uuid: after a logout clears the planning
  store, the still-mounted page re-renders and a stale uuid makes every
  price lookup fail ([#745](https://github.com/PRUNplanner/frontend/issues/745)).
- Only the latest calculation run writes: each run uses the plans, empire,
  CX and empire list it started with; an older run stops at its next yield
  (no results, progress or `PatchEmpireState`). Results keep the plan list
  they came from, so a refresh never mixes old results with new plans.
- After calculating, `EmpireView` sends the aggregated material I/O with
  `PatchEmpireState`.
- `EmpireView` checks onboarding (no plans) before the calculation progress,
  so the card stays mounted while a save recalculates.
- Heavy components use `defineAsyncComponent`; keep additions lazy.

## Tests

`src/tests/features/empire/` and `src/tests/views/EmpireView.test.ts`.
