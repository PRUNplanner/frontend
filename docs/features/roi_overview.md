# roi_overview

**Purpose.** This folder computes the daily profit and ROI (payback time) of
**every production recipe**. It uses a precomputed "optimal" base layout for
each building and runs each one through the real plan engine.

**Used by.** `views/tools/ROIOverviewView.vue` (`/roi-overview`).
`optimalProduction` and `COGMButton` are also reused by
`resource_roi_overview` and `usePlanCalculation`.

## Key files

| File | Role |
| --- | --- |
| `useROIOverview.ts` | `useROIOverview(definitionRef, cxUuidRef)` exposes `calculate()`, `resultData`, `progressCurrent`/`progressTotal` and `formatOptimal()` |
| `assets/optimalProduction.ts` | Static table (`IStaticOptimalProduction[]`) of each building's optimal count plus the habs and storage that fill one base |
| `useROIOverview.types.ts` | `IROIResult`, `IStaticOptimalProduction` |
| `components/ROIOverviewTable.vue`, `ROIOverviewTableFilters.vue` | Result table and filters |
| `components/COGMButton.vue` | Opens the COGM breakdown for a result |

## How it works

1. `calculate()` goes through `optimalProduction`, excluding the extractors
   (`RIG`, `EXT`, `COL`) and the fertility buildings (`FRM`).
2. For each building × recipe, it `deepClone`s the definition. The COGC is
   set to the building's expertise, the buildings and habs come from the
   optimal layout, and all experts are set to 5.
3. It runs `usePlanCalculation(...).calculate()`. The loop yields to the UI
   between buildings (`setTimeout(0)`).

## Gotchas

- **`optimalProduction.ts` is large, hand-maintained data.** Keep it in sync
  when building data changes. A test validates its shape.
- **Prices depend on the CX passed in.**

## Tests

`src/tests/features/roi_overview/useROIOverview.test.ts` and
`assets/optimalProduction.test.ts`.
