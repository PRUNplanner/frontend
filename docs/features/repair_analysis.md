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
- **`components/DayRepairMaterialTable.vue`**: the materials needed for a
  selected day.
- **`planning/components/tools/planRepairAnalysis.types.ts`**: the prop
  types (`IPlanRepairAnalysisDataProp`).

## Tests

`src/tests/features/repair_analysis/useRepairAnalysis.test.ts`
