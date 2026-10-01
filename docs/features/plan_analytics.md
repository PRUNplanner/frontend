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

`components/PlanStarterSetup.vue`: the "Start from a typical setup" card,
rendered by `PlanProduction` in an empty, editable plan while the planet
has v2 insights (hidden for this view by "Start empty", which leaves a
link to bring it back). It lists the 8 most planned buildings (those in
≥ 20 % of plans checked) with their median amount and `typicalRecipes`,
and the experts split; it emits an `IStarterSetup` that `PlanView` adds
with `handleApplyStarterSetup` as one undo step, switching hab
auto-optimise on. Sends `plan:starter_show`, `plan:starter_apply` and
`plan:starter_dismiss`.

`planInsights.util.ts`: `segmentColor` (split bar colours, shared with the
box), the starter constants and `starterExperts` (types in ≥ 50 % of plans
with their median amount, within the expert limits).

## Tests

The API is covered in `src/tests/features/api/analyticsData.api.test.ts`,
the composable in `src/tests/features/plan_analytics/usePlanetInsights.test.ts`,
the helpers in `planInsights.util.test.ts`, the box and the starter card
in the local component suite (`src/tests/features/plan_analytics/components/`).
