# plan_analytics

**Purpose.** Community insights for a planet in the plan editor (which
buildings, recipes and experts other users plan there): the insights box,
the pickers' "popular here" hints and the "Start from a typical setup" card.

**Used by.** `views/PlanView.vue` (the box); `planning`'s `PlanBase`,
`PlanProduction`, `PlanProductionBuilding`, `PlanRecipePicker`
(`usePlanetInsights`), `usePlanEdits` and `usePlanCalculationHandlers` (the
starter setup).

## Key files

- `components/PlanAnalyticsBox.vue`: fetches `GetAnalyticsPlanetInsights`
  on mount, renders only on `status === "success"` (a failed request hides
  it). Exposes `open()` (used by Base's planet link); opening sends
  `plan:insights_open`.
- `usePlanetInsights.ts`: `usePlanetInsights(planetNaturalId)` reads the v2
  keys of the same query (v1 rows default to empty) for the building
  picker's "Popular on" group, the recipe picker's "Plans here" column, the
  "Most planned here" hint (`typicalRecipes`), and `isAvailable` /
  `totalPlans`.
- `components/PlanStarterSetup.vue`: card shown by `PlanProduction` in an
  empty, editable plan with v2 insights. Lists the `STARTER_MAX_BUILDINGS`
  (8) most planned buildings, those in ≥ `STARTER_PRESELECT_PERCENTAGE` (20 %)
  of plans pre-checked, plus the expert split. Emits an `IStarterSetup`;
  `usePlanEdits` applies it as one undo step and switches hab
  auto-optimise on.
- `planInsights.util.ts`: `segmentColor`, starter constants,
  `starterExperts` (types in ≥ 50 % of plans, median amount, within expert
  limits).
- `usePlanetInsights.types.ts`: `IStarterSetup`, `ITypicalRecipes`.

## Gotchas

- The response is a discriminated union (`AnalyticsPlanetInsightsPayloadSchema`
  in `api/schemas/analyticsData.schemas.ts`); a `below_threshold` response
  has no (or `null`) `insights_data`.
- Every caller executes the same named query, so there is one request per
  planet.
- Nothing renders or is requested while the `planSuggestions` preference is
  off.

## Tests

`src/tests/features/plan_analytics/`,
`src/tests/features/api/analyticsData.api.test.ts`.
