# repair_analysis

**Purpose.** This folder models how building repair cost grows with age
(0–180 days) so users can pick a repair interval per building type.

**Used by.** `planning/components/tools/PlanRepairAnalysis.vue` on the plan
page: the title-row stats, the building list, the detail of the selected
type and the all-buildings repair list. Intervals start at each type's best
day and are not saved. With FIO (not on shared plans) it adds the player's
buildings on the planet and their due dates.

## Key files

- **`repairAnalysis.util.ts`**: `calculateRepairCurve` gives one
  building's average daily profit when repairing every n days: production
  value times the average wear efficiency (100 % down to 33 %), minus the
  building's workforce cost (at the plan's staffing and luxuries), minus
  the repair cost averaged over the n days. The
  repair cost is the only degradation cost, the plan's 1/180 construction
  share is taken out. `findOptimalRepairDay` picks the best n, `goodRange`
  the days within 1 % of it, `repairCostSplit` splits the cost into lost
  output and repair cost per day, `repairMaterialsAt` the materials of one
  repair, `dueInDays` / `dueTagType` the due date of a real building.
  `repairCurveOf(data, prices)` runs the curve and best day for one
  building type of a plan result, `priceRepairMaterials` /
  `repairMaterialTotals` price a material list; FIO Repair uses both for
  its plan-based targets and bills.
- **`useRepairAnalysis.ts`**: `useRepairAnalysis(dataRef, cxUuidRef,
  planetNaturalIdRef)`. Loads a price book once per change, then
  `buildings` (curve, best, range per type, most expensive repair first),
  `materialsFor(building, day)` (memoised per type) and
  `materialsForAll(intervalOf)`, all synchronous. Types in
  `useRepairAnalysis.types.ts`.
- **`components/`**: `RepairBuildingList` (table, or cards on phones),
  `RepairBuildingDetail` (stats, interval field, slider and presets),
  `RepairIntervalCharts` (SVG profit, trade-off and condition panels on
  `useChartTheme`), `RepairMaterialList` (with XIT), `RepairFIOBuildings`
  and `RepairDueTag`.
- **`planning/components/tools/planRepairAnalysis.types.ts`**: the prop
  types (`IPlanRepairAnalysisDataProp`).

## Tests

`src/tests/features/repair_analysis/` (util, composable, and the
components under `components/`) and
`src/tests/features/planning/components/PlanRepairAnalysis.test.ts`.
