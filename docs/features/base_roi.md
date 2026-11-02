# base_roi

**Purpose.** Ranks every way to run one base by break-even: resources per
planet, farming recipes per fertile planet, and every other production
recipe on a standard planet. Rows use the static layouts of
`roi_overview/assets/optimalProduction.ts`, the plan engine and the selected
CX, plus expert ramp, stock buffer, HQ add-on, logistics and market limits,
volatility scenarios and a 90-day profit history.

**Used by.** `views/tools/BaseROIView.vue` (`/base-roi`, test phase: no nav
entry). No login needed: logged out, prices are Universe 30D and "Open as
plan" is hidden.

## Key files

- `useBaseROI.ts`: orchestration. Recipe rows first, then planets (fertile
  via `PostPlanetSearch`, others via `GetMultiplePlanets`, once per page) in
  `CHUNK_SIZE` chunks with yields (`util/runProgress`); a newer run cancels
  the older. `performance.measure("base-roi:*")`, one `tool:use` per run,
  `tryOnPlanet`.
- Pure modules: `baseROIRows.ts` (candidates, engine pass, buffer adds
  STO/STA and drops buildings while over area), `baseROIMetrics.ts` (costs,
  `rampBreakEven`, limits, `filterRows`), `baseROIHistory.ts`,
  `baseROIPopulation.ts` (`baseStaffing` from `GetMultiplePlanetPOPR`; a
  missing report limits nothing), `baseROITrend.ts` (trend chart, at most 7
  lines), `baseROIDetail.util.ts` (row detail sections, also "Copy as text"),
  `baseROITooltip.util.ts` (cell math).
- `useBaseROISettings.ts` + `baseROI.schemas.ts`: localStorage
  `prunplanner_base_roi`, each field falls back to its default on its own.
- `baseROI.constants.ts`: ships, `EXPERT_STAGE_DAYS`, `HISTORY_DAYS`,
  presets, columns, `STANDARD_PLANET`.
- `components/BaseROIPage.vue` and its parts.

## Gotchas

- Only engine settings (COGC, experts, buffer, max jumps) and the CX trigger
  an engine pass; the rest only recompute metrics and filters.
- The engine runs at 5 experts; `rampBreakEven` scales revenue minus inputs
  per stage by `(1 + bonus_k) / (1 + bonus_5)` over
  `EXPERT_STAGE_DAYS[k] / production buildings` days.
- Max jumps counts to the nearest exchange of the CX (all four without one);
  planets beyond are counted, never fetched.
- Recipe rows run on `STANDARD_PLANET` (no real planet, so construction
  includes MCG like Recipe ROI); "Try on a planet" recalculates one row on a
  real planet.
- The engine is the source of truth: with buffer/add-ons off, matching COGC
  and 5 experts, building cost and daily profit equal Recipe ROI and
  Resource ROI (`baseROIRows.test.ts`).

## Tests

`src/tests/features/base_roi/` (per module and `components/`; fixtures incl.
a reference spreadsheet's rows), bench `baseROI.bench.ts`.
