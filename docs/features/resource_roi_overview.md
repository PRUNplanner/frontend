# resource_roi_overview

**Purpose.** For one resource ticker, this tool finds every planet that has
it and computes the daily yield and ROI of extracting it there with the
optimal extractor layout (`RIG`, `EXT` or `COL`).

**Used by.** `views/tools/ResourceROIOverviewView.vue`
(`/resource-roi-overview`).

## Key files

| File | Role |
| --- | --- |
| `useResourceROIOverview.ts` | `useResourceROIOverview(cxUuidRef)` provides `calculate(ticker)`, `searchPlanets`, `resultData`, progress refs and `planetNames` |
| `useResourceROIOverview.types.ts` | `IResourceROIResult` |
| `components/ResourceROITable.vue`, `ResourceROITableFilters.vue` | UI. It reuses `PlanetPOPRButton` and the `roi_overview` helpers. Inline bars on % Max, Daily Profit and ROI (0–20 d); the nearest exchange's distance bold in its colour |
| `components/ResourceROIChartDrawer.vue` | "Chart" drawer: docked under the table in the page flow (non-modal, Esc closes it via `useOverlayLayer`, resizable). `PScatter` of plan ROI against jumps to the nearest or a chosen exchange, zoomed to paybacks within twice the fastest (the rest, no-payback and no-route rows are counted under it), dot size daily profit, colour the exchange, best trade-off line and a generated insight line. Shows the table's filtered rows; a hovered dot highlights and scrolls to its row. The view keeps its open state in localStorage |
| `resourceROIChart.util.ts` | `roiRowKey`, `nearestExchange`, `roiChartData`, `roiFrontier` (lower ROI and fewer jumps win), `roiInsight` |

## How it works

1. `searchPlanets(ticker)` runs the `PostPlanetSearch` query with every
   environment allowed.
2. For each planet, `calculatePlanet` works out which infrastructure the
   environment needs (surface, gravity, pressure, temperature). It then
   builds a blank plan with `usePlan().createBlankDefinition` (experts set
   to 5) for each matching optimal extractor setup from
   `roi_overview/assets/optimalProduction.ts`. If the extractor's recipes for
   the planet output the material, it calculates that plan with the planning
   engine (`calculatePlan`, game data loaded once per search).
3. Planets run in parallel through `pLimit(128)`, with cooperative yielding.
   Results are sorted by `dailyYield` and annotated with
   `percentMaxDailyYield`.

## Gotchas

- **The parallelism is large.** Keep per-planet work allocation-light.
- **Environment → infrastructure material mapping** lives in
  `getPlanetEnvironment`, which reads `environmentExtras` from
  `planet_search/environmentExtras.util.ts` (shared with planet search).
  The material choices are `resourceROIOverview.constants.ts`.

## Tests

`src/tests/features/resource_roi_overview/useResourceROIOverview.test.ts`,
`resourceROIChart.util.test.ts` and `components/*.test.ts`
