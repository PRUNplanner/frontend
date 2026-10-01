# plan_analytics

**Purpose.** `PlanAnalyticsBox.vue` shows community insights for a planet on
the plan page, for example which buildings and recipes other users plan
there.

**Used by.** `views/PlanView.vue` (the box), the `planning` production components (`usePlanetInsights`).

## Key file

`components/PlanAnalyticsBox.vue`:
- **Prop:** `planetNaturalId`.
- **Data:** on mount it calls `useQuery("GetAnalyticsPlanetInsights", {
  planetNaturalId })` and renders only when `status === "success"`. A
  failed request leaves the box hidden.
- **Schema:** the response is a discriminated union
  (`AnalyticsPlanetInsightsPayloadSchema` in
  `features/api/schemas/analyticsData.schemas.ts`). A `below_threshold`
  response has no `insights_data`, or `null`.

- **Setting:** renders and requests nothing while the "Plan suggestions"
  preference (`planSuggestions`) is off. Opening it sends
  `plan:insights_open`.

`usePlanetInsights.ts`: `usePlanetInsights(planetNaturalId)` reads the v2
keys of the same query (`insights_data.buildings`; v1 rows default to
`[]`) for the plan editor: the "Popular on" group of the building picker
(`PlanProduction`, via `getProductionBuildingOptions`), the "Plans here"
column of the recipe picker (`PlanProductionRecipe`) and the "Most planned
here" mix hint on a building without recipes (`PlanProductionBuilding`,
`typicalRecipes`). Every caller executes the named query, so the query
store makes one request per planet. Nothing is requested while
`planSuggestions` is off.

## Tests

The API is covered in `src/tests/features/api/analyticsData.api.test.ts`,
the composable in `src/tests/features/plan_analytics/usePlanetInsights.test.ts`,
the box in the local component suite
(`src/tests/features/plan_analytics/components/`).
