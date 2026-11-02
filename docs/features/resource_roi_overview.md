# resource_roi_overview

**Purpose.** For one resource, every planet that has it with daily yield and
ROI of extracting it there on the optimal extractor layout (`RIG`, `EXT`,
`COL`), as a table and an ROI-vs-jumps chart.

**Used by.** `views/tools/ResourceROIOverviewView.vue`
(`/resource-roi-overview`); `production_chain` reuses
`RESOURCE_MATERIAL_OPTIONS`.

## Key files

| File | Role |
| --- | --- |
| `useResourceROIOverview.ts` | `searchPlanets` (`PostPlanetSearch`, all environments), `calculate(ticker)`, `getPlanetEnvironment`, progress |
| `resourceROIChart.util.ts` | Nearest exchange, chart points, ROI/jumps frontier, insight line |
| `resourceROIOverview.constants.ts` | `RESOURCE_MATERIAL_OPTIONS` |
| `components/` | Table and filters (reusing `PlanetPOPRButton`, `COGMButton`); `ResourceROIChartDrawer`, a non-modal drawer docked under the table |

## How it works

Per planet, `getPlanetEnvironment` derives the infrastructure materials
(`planet_search/environmentExtras.util.ts`), then a blank plan (experts 5)
per extractor layout from `roi_overview/assets/optimalProduction.ts` is run
through `calculatePlan` if its recipes output the material. Planets run via
`pLimit(128)` with cooperative yielding, sorted by `dailyYield`.

## Gotchas

- **High parallelism**: keep per-planet work allocation-light.

## Tests

`src/tests/features/resource_roi_overview/` (incl. golden snapshots).
