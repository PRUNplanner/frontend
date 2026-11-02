# roi_overview

**Purpose.** Daily profit and ROI of every production recipe, each run
through the plan engine on a precomputed optimal base layout per building.

**Used by.** `views/tools/ROIOverviewView.vue` (`/roi-overview`).
`assets/optimalProduction.ts` also feeds `resource_roi_overview`, `base_roi`
and the plan engine (`recipeOptions.ts`); `COGMButton` is reused by
`resource_roi_overview`.

## Key files

| File | Role |
| --- | --- |
| `useROIOverview.ts` | `calculate()` (a newer run supersedes a running one), `calculateItem()`, `resultData`, `progress`, `formatOptimal()` |
| `assets/optimalProduction.ts` | Each building's optimal count plus the habs and storage that fill one base |
| `components/` | `ROIOverviewTable` (runs the composable), filters, `COGMButton` (COGM breakdown) |

`calculate()` skips extractors and `FRM`; per building × recipe it sets
experts to 5, COGC to the building's expertise and the optimal layout, and
runs `calculatePlan` (`recipeOptions: false`) on one shared context,
yielding to the UI between buildings.

## Gotchas

- **`optimalProduction.ts` is hand-maintained**: update it when building
  data changes; a test pins its length (48).

## Tests

`src/tests/features/roi_overview/` (incl. a CX golden snapshot).
