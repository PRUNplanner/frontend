# Planning engine

The heart of the app is turning a **plan** (buildings, recipes, habs,
experts, workforce luxuries, COGC, HQ on one planet) into a result: workforce,
area, production, material flow, cost, revenue and profit per day.
Everything that shows those numbers goes through one composable.

## `usePlanCalculation` (`src/features/planning/usePlanCalculation.ts`)

```ts
const calc = usePlanCalculation(
  planRef,            // Ref<IPlan>, required
  empireUuidRef,      // Ref<string | undefined>, the empire context (faction, permits)
  empireOptionsRef,   // Ref<IPlanEmpireElement[] | undefined>, the list to resolve that uuid
  cxUuidRef           // Ref<string | undefined>, the exchange preference for prices
);
```

- **It is synchronous.** Planet, building and price data are loaded inside
  `calculate()`, so its watchers are registered during setup and stop with
  the component.
- **It recalculates automatically.** A deep watch on `[plan, refreshKey,
  empireUuid]` re-runs `calculate()` and writes `calc.result`.
  `refreshKey` increments whenever `planningStore.cxs` changes.
- **Batch callers stop the watchers.** Empire, FIO burn and the ROI
  overviews call it outside setup, so no component owns its watchers. They
  create it in an `effectScope()`, stop the scope straight away and call
  `calculate()` themselves.
- **Returned fields:**

  | Field | Meaning |
  | --- | --- |
  | `result: Ref<IPlanResult>` | The full result (see below). Starts as `planEmptyResult` with `done: false` |
  | `calculate()` | Runs one calculation on demand and returns it. Batch callers use this |
  | `backendData` | The `IPlanCreateData` payload for save/create |
  | `overviewData`, `visitationData` | Derived summaries for `PlanOverview` / `PlanVisitationFrequency` |
  | `existing`, `saveable`, `modified`, `planName`, `planEmpires`, `computedActiveEmpire` | Editor state |
  | `handle*` | Mutators from `usePlanCalculationHandlers` |

- **`IPlanResult`** (typed in `usePlanCalculation.types.ts`, together with
  every sub-record and the `WORKFORCE_TYPE`, `INFRASTRUCTURE_TYPE`,
  `EXPERT_TYPE` and `STORAGE_TYPE` unions) contains:
  - `workforce`, `area`, `infrastructure`, `storage` and `experts`;
  - `production.buildings` (per-building efficiency and recipe outputs) and
    `production.materialio`;
  - `materialio`: the combined input, output and delta per ticker, with
    weight, volume and price;
  - `workforceMaterialIO` and `productionMaterialIO`: the two parts of that
    flow, split out;
  - `profit`, `cost` and `revenue` (per day), `infrastructureCosts` and
    `constructionMaterials`.

### How `calculate()` works

1. Compute the base records: workforce (need vs capacity, luxuries,
   satisfaction), area/permits, infrastructure, storage and experts.
2. Run `calculateProduction`. It computes each building's efficiency with
   `calculateBuildingEfficiency` (in `calculations/bonusCalculations.ts`),
   which multiplies these factors:
   - **FERTILITY**: FRM and ORC only;
   - **HQ**: the corp HQ on the planet;
   - **COGC**: a program matching the building's expertise, or the
     workforce type;
   - **EXPERT**: expert count per expertise;
   - **WORKFORCE**: satisfaction;
   - **FACTION**: the empire's faction bonus.

   Recipe runtimes then turn into daily input and output.
3. Workforce consumption (`calculations/workforceCalculations.ts`,
   `WORKFORCE_CONSUMPTION_MAP`) plus the production I/O are combined and
   enriched by `features/planning/util/materialIO.util.ts`. Prices come from `usePrice`.
4. Compute the money:
   - revenue = the sum of prices for positive deltas;
   - cost = the sum for negative deltas + **1/180 of the total building
     construction cost per day**, which models degradation;
   - profit = revenue − cost.

### Other calculation modules (`src/features/planning/calculations/`)

| File | Purpose |
| --- | --- |
| `bonusCalculations.ts` | Building efficiency factors, expert bonus, `expertNames` |
| `workforceCalculations.ts` | Satisfaction, luxury consumption, `workforceTypeNames` |
| `buildingCalculations.ts` | Recipe → daily material I/O, `TOTALMSDAY` |
| `infrastructureCalculations.ts` | Hab/storage building lists, storage weight and volume |
| `habOptimization.ts` | `optimizeHabs` / `calculateAvailableArea`: a `yalps` LP solver for the "auto habs" feature (`HabSolverGoal`: auto, cost or area) |
| `extractionCalculations.ts` | Extractor output from planet resources (`calculateExtraction`) |

`usePlanCalculationPreComputes.ts` caches per-building data (construction
and workforce materials, recipes) and resolves the active empire.
`usePlanCalculationHandlers.ts` holds every edit operation (`handleUpdate*`,
`handleCreate*`, `handleDelete*`). Each one mutates `plan.plan_data` and
sets `modified`.

## Prices: `usePrice` (`src/features/cx/usePrice.ts`)

`usePrice(cxUuidRef, planetNaturalIdRef)` gives you `getPrice(ticker,
"BUY" | "SELL")`, `enhanceMaterialIOMaterial`, `getMaterialIOTotalPrice` and
`calculateInfrastructureCosts`.

A CX preference (`ICX.cx_data`) is resolved from the most specific level to
the least specific; the first match wins:

1. planet ticker preference;
2. empire ticker preference;
3. planet exchange preference;
4. empire exchange preference;
5. fallback: **UNIVERSE 30-day VWAP**.

A preference type of `BOTH` applies to buy and to sell. When no CX is set,
the universe VWAP is used everywhere. The full rules are in the header
comment of `usePrice.ts`.

## Empires

An empire is a named group of plans with a faction and permits
(`IPlanEmpireElement`). There is **no separate empire engine**:

- `EmpireView.calculateEmpire()` loops over the empire's plans, calls
  `usePlanCalculation(...).calculate()` for each one (yielding to the UI
  between plans), and caches results in a `Map`. It then aggregates cost,
  material I/O and plan lists for the `features/empire` components.
- The aggregated material I/O is pushed back to the backend with
  `PatchEmpireState`.
- The FIO burn view, ROI overview and resource ROI overview follow the same
  pattern: they build or load plans, then call `usePlanCalculation` on each.

## Plan lifecycle (`src/features/planning_data/usePlan.ts`)

- `createBlankDefinition` builds a new plan from planet data.
  `mapPlanetToPlanType` translates the planet's COGC program for the plan.
- `createNewPlan`, `saveExistingPlan`, `reloadExistingPlan` and
  `cloneSharedPlan` go through the query cache. The body they send is
  `calc.backendData`.
- `isEditDisabled` returns true for shared plans, which are read-only.

## Where it is used

| Caller | How |
| --- | --- |
| `views/PlanView.vue` | Interactive editor. Owns the plan ref and wires the `handle*` functions into the `features/planning/components/Plan*.vue` panels |
| `views/EmpireView.vue` | Batch `calculate()` per plan |
| `views/fio/FIOBurnView.vue` | Batch, then feeds `useFIOBurn` |
| `features/roi_overview/useROIOverview.ts` | Synthetic single-building plans per recipe |
| `features/resource_roi_overview/useResourceROIOverview.ts` | Synthetic extraction plans per planet (concurrency-limited with `p-limit`) |

## Gotchas

- **Pass a copy, never a store object.** Batch callers clone the definition
  per run (`deepClone`) because parallel calculations would otherwise
  overwrite each other.
- **Results depend on context.** Empire (faction, permits) and CX (prices)
  both change the numbers, so any cache must include both in its key.
- **Tests exist for the engine and its helpers.** New math belongs in
  `calculations/*` as a plain function with a unit test in
  `src/tests/features/planning/`.
