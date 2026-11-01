# base_roi

**Purpose.** Base ROI ranks every way to run one base: each resource on
each planet that has it (resource rows), each farming recipe on each
fertile planet (farming rows) and each recipe of every other production
building on a standard planet (recipe rows). Every row uses the static
layout of `roi_overview/assets/optimalProduction.ts`, the plan engine and
the selected CX preference, plus Knottly's metrics: break-even with experts
arriving over time, a stock buffer, the HQ add-on, logistics and
market-capacity limits, volatility scenarios and a 30-day profit history.

**Used by.** `views/tools/BaseROIView.vue` (`/base-roi`, no login needed: logged out the planning loader skips the CX preferences, prices are Universe 30D, "Open as plan" is hidden).
Test phase: no nav entry, homepage card or help-index link yet; the route
opens by URL.

## Key files

| File | Role |
| --- | --- |
| `baseROIRows.ts` | Pure. `recipeCandidates`, `planetCandidates` (from the planet search index, split by max jumps), `basePlan`, `calculateBase` (the engine pass; with a buffer it adds STO/STA and drops production buildings while the area is exceeded, refitting habs with `optimizeHabs`) and `toRowInput` (daily money split into revenue, inputs, consumables, degradation; cargo; materials with their `IPriceSource`; outputs with traded volume; workforce) |
| `baseROIMetrics.ts` | Pure. Building cost (construction + buffer stock + HQ step), `rampBreakEven`, weekly return, logistics fit, market capacity, `volatilityScenarios`, `filterRows` with the hidden count per limit, `matchesSearch` (the search above the table, applied in the page, not counted as hidden) |
| `baseROIHistory.ts` | Pure. Revenue, running cost and profit per day from the row's daily amounts and `GetCXSparklines` daily VWAP, no engine pass |
| `baseROIDetail.util.ts` | The row detail's ten sections as data, shared by the view and "Copy as text" (the view shows 9 as the chart on top and 10 in its header) |
| `baseROITooltip.util.ts` | Pure. `cellMath`: the napkin math of a table cell, shown by `BaseROICellMath.vue` |
| `useBaseROI.ts` | Orchestration: recipe rows first, the index and planets (fetched once per page: fertile ones with `PostPlanetSearch`, the rest with `GetMultiplePlanets`), planet rows merged once, 50-row chunks with `scheduler.yield()`, a newer run stops the older one, `performance.measure` (`base-roi:*`), one `tool:use` per finished run, the price history, `tryOnPlanet` |
| `useBaseROISettings.ts`, `baseROI.schemas.ts` | Settings in localStorage (`prunplanner_base_roi`), each field falls back to its default on its own |
| `baseROI.constants.ts` | Ships, `EXPERT_STAGE_DAYS`, presets (with their hidden columns), columns, `STANDARD_PLANET` |
| `components/BaseROIPage.vue` | The page: header, settings panel, table box (the data loaders overlay it only while loading), chart drawer, setup dialog |
| `components/BaseROITable.vue`, `BaseROITableSkeleton.vue`, `BaseROIColumnsMenu.vue`, `BaseROISettingsPanel.vue`, `BaseROISetup.vue`, `BaseROIRowDetail.vue`, `BaseROIChartDrawer.vue`, `BaseROICellMath.vue` | UI |

## How it works

1. Settings the engine reads (COGC, experts, buffer, max jumps) and the CX
   preference recalculate the rows; every other setting only recomputes
   metrics and filters (`rows`, `filtered` computeds), no engine pass.
2. With the expert ramp the engine runs at 5 experts; `rampBreakEven`
   scales revenue and inputs per stage by `(1 + bonus_k) / (1 + bonus_5)`.
3. Max jumps counts to the nearest exchange the CX preference prices from
   (all four without a preference). Planets beyond it are counted, never
   fetched.

## Gotchas

- **Recipe rows run on `STANDARD_PLANET`** (rocky, normal environment), so
  their construction includes MCG like Recipe ROI on Montem; "Try on a
  planet" in the row detail recalculates one recipe row on a real planet.
- **Keep the engine the source of truth**: building cost and daily profit
  with buffer off, add-ons off, matching COGC and 5 fixed experts equal
  Recipe ROI and Resource ROI (`baseROIRows.test.ts`).

## Tests

`src/tests/features/base_roi/`: `baseROIMetrics.test.ts` (with three rows
of Knottly's AI1 file in `knottly_ai1_rows.json`), `baseROIRows.test.ts`,
`baseROIHistory.test.ts`, `useBaseROISettings.test.ts`, `components/*.test.ts`,
and the bench `baseROI.bench.ts` (B10).
