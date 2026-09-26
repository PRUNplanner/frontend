# Review findings (at `2134823`)

Scope: `src/features/planning/usePlanCalculation.ts` and its helpers
(`usePlanCalculationPreComputes.ts`, `usePlanCalculationHandlers.ts`,
`calculations/*`, `util/materialIO.util.ts`, `features/cx/usePrice.ts`,
`database/composables/useDB.ts`), `PlanView.vue`, and the batch callers
(`EmpireView.vue`, `FIOBurnView.vue`, `useROIOverview.ts`,
`useResourceROIOverview.ts`).

Line numbers refer to `usePlanCalculation.ts` unless stated otherwise.

## Root cause

The composable factories are synchronous since #487, but the data lookups
are not: `getPrice`, `getMaterialIOTotalPrice`, `enhanceMaterialIOMaterial`,
`calculateInfrastructureCosts` (`usePrice.ts`), `getBuilding`
(`useBuildingData.ts`), `getPlanet` (`usePlanetData.ts`). They read from
in-memory Maps after preload, but every call is an `await`, so `calculate()`
is async end to end. Most of the issues below follow from that.

## Structural issues

| # | Where | Finding |
| --- | --- | --- |
| S1 | l.538 | COGM is computed in `activeRecipes.forEach(async ...)`, never awaited. It only lands because of later awaits; errors become unhandled rejections. |
| S2 | l.978-987 | The deep watcher runs `result.value = await calculate()` with no stale check. A slower older run can overwrite a newer one. |
| S3 | l.383, `PreComputes.ts` l.94 | `computeBuildingInformation()` runs inside the per-building loop, so all buildings are rebuilt once per building. Since #487 it also calls `getPlanet` each time. The planet is loaded 3+ times per calculation plus once per building. |
| S4 | batch callers | `watch(..., { immediate: true })` starts `calculate()` inside `scope.run(...)`. `scope.stop()` does not cancel that run, so each batch plan is still calculated twice (one result discarded). |
| S5 | l.707-808, l.811-869 | Profit is computed in `calculate()` and again in `calculateOverview()` with different sign handling. `calculateConstructionMaterials` runs twice. |
| S6 | l.774 | `overviewData` is set as a side effect inside `calculate()`. Batch callers call `calculateOverview()` again. |
| S7 | l.680 | `inf.map(...)` is used to mutate `amount` on the precomputed objects. |
| S8 | `PlanView.vue` l.~547 | Hab auto-optimise is a feedback loop through reactivity: result -> watch -> `handleUpdateInfrastructure` -> plan change -> recalculation. |
| S9 | `PlanProductionBuilding.vue` l.94 | `v-model:value="localBuildingData.amount"` writes into `result.production.buildings[i]` (a derived value) before the emit updates the plan. |
| S11 | l.~440-510, batch callers | Every calculation builds `recipeOptions` for *all* recipes of every building, with price lookups for each. Batch callers mostly don't use them: the ROI overview runs one plan per recipe, so a building with k recipes costs k plans x k options (x2 because of S4). Resource ROI only uses them to check which building can output a material. |
| S12 | `useResourceROIOverview.ts` l.48, l.330 | `pLimit(128)` gives no parallelism on one thread; it only interleaves up to 128 async calculations, which raises memory use and delays the first results. |
| S10 | l.1-1008 | Costs are negative numbers by convention, handled with scattered `* -1` and `- -1 *`. |

## Suspected bugs (confirm with a failing test before fixing)

| # | Where | Finding |
| --- | --- | --- |
| B1 | `bonusCalculations.ts` l.173, l.247 | `building.Expertise` (capital E) is always `undefined`; TypeScript misses it because `IBuilding` has a `[key: string]` index signature. The "has expertise" guard never works. For a building with `expertise: null`, l.257 would read `experts[undefined].amount` and throw. |
| B2 | l.650-654 | `building.dailyRevenue` adds `constructionCost / 180` once, while workforce cost is multiplied by `amount`. Degradation is undercounted for `amount > 1`. |
| B3 | `PreComputes.ts` l.104 | Workforce materials per building always assume lux1 and lux2 on, whatever the plan's luxury settings. May be intentional; confirm with Jan. |

## Assessment of the proposed "Calculation Engine" notes

- Pure, synchronous `(input) => output` engine with no Vue imports: **agree**.
- Plain serializable data in and out: agree.
- Request sequencing: agree, and needed today (S2).
- Web Worker by default: **not yet**. Measure first; likely useful only for
  batch views.
- Event -> stage invalidation table: **reject**. It is a hand-written
  reactivity system where one missed mapping gives silently stale numbers,
  and the proposed mapping is already wrong for this code (prices also feed
  recipe options, COGM and construction cost; luxuries are missing; a plan's
  planet never changes). Full recompute first; memoize by input reference
  only if measured.
- 7-stage linear pipeline: the real dependencies form a graph, and it leaves
  out area, storage/visitation, construction, COGM, recipe options and the
  hab optimiser.
- `efficiency.toFixed(4)` cache keys: rounding can return wrong cached
  results.
- Zod on every worker message: only at system boundaries (API, IndexedDB).
- Batch calculation (Empire ~30 plans, ROI overview and resource ROI with
  100+ plans) is the valid reason for a worker. But the proposed design
  targets the wrong case: a stateful per-plan stage cache helps interactive
  editing of one plan, while in batch every plan is different and the cache
  would rarely hit. For batch, what helps is (1) removing waste (S4, S11,
  per-plan data/price resolution), (2) one shared context (game data +
  PriceBook) per batch, (3) then, if still slow, a pool of stateless workers
  running the same pure engine in parallel.
