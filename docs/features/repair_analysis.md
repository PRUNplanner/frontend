# repair_analysis

**Purpose.** This folder models how building repair cost grows with age
(0–180 days) so users can pick a repair interval.

**Used by.** `planning/components/tools/PlanRepairAnalysis.vue` on the plan
page, together with the `ui/charts/PlanRepairCostChart.vue` and
`PlanRepairProfitChart` charts.

## Key files

- **`useRepairAnalysis.ts`**: `useRepairAnalysis(cxUuidRef,
  planetNaturalIdRef)`. The function
  `calculateDailyRepairMaterials(buildingData)` returns
  `Record<day, IMaterialIO[]>`. It computes each building's construction
  materials scaled by age, then combines and prices them with
  `materialIO.util` and `usePrice`.
- **`repairAnalysis.util.ts`**: `calculateRepairCurve` gives one
  building's average daily profit when repairing every n days: production
  value times the average wear efficiency (100 % down to 33 %), minus the
  building's workforce cost (at the plan's staffing and luxuries), minus
  the repair cost averaged over the n days. The
  repair cost is the only degradation cost, the plan's 1/180 construction
  share is taken out. `findOptimalRepairDay` picks the best n.
- **`components/DayRepairMaterialTable.vue`**: the materials needed for a
  selected day.
- **`planning/components/tools/planRepairAnalysis.types.ts`**: the prop
  types (`IPlanRepairAnalysisDataProp`).

## Tests

`src/tests/features/repair_analysis/useRepairAnalysis.test.ts` and
`repairAnalysis.util.test.ts`
