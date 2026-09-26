# plan_analytics

**Purpose.** `PlanAnalyticsBox.vue` shows community insights for a planet on
the plan page, for example which buildings and recipes other users plan
there.

**Used by.** `views/PlanView.vue`.

## Key file

`components/PlanAnalyticsBox.vue`:
- **Prop:** `planetNaturalId`.
- **Data:** on mount it calls `useQuery("GetAnalyticsPlanetInsights", {
  planetNaturalId })` and renders only when `status === "success"`.
- **Schema:** the response is a discriminated union
  (`AnalyticsPlanetInsightsPayloadSchema` in
  `features/api/schemas/analyticsData.schemas.ts`).

## Tests

The API is covered in `src/tests/features/api/analyticsData.api.test.ts`.
