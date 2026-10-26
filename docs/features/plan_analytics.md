# plan_analytics

**Purpose.** Community insights for a planet in the plan editor, for example
which buildings and recipes other users plan there: the insights box, the
pickers' "popular here" hints and the "Start from a typical setup" card.

**Used by.** `views/PlanView.vue` (the box), the `planning` editor components
`PlanProduction`, `PlanProductionBuilding` and
`PlanRecipePicker` (`usePlanetInsights`).

## Key files

- **`components/PlanAnalyticsBox.vue`**:
  - **Prop:** `planetNaturalId`.
  - **Data:** on mount it calls `useQuery("GetAnalyticsPlanetInsights", {
    planetNaturalId })` and renders only when `status === "success"`. A
    failed request leaves the box hidden.
  - **Analytics:** opening it sends `plan:insights_open`.
- **`usePlanetInsights.ts`**: `usePlanetInsights(planetNaturalId)` reads the
  v2 keys of the same query (`insights_data.buildings`; v1 rows default to
  `[]`) for the plan editor:
  - the "Popular on" group of the building picker (`PlanProduction`, via
    `getProductionBuildingOptions`);
  - the "Plans here" column of the recipe picker (`PlanRecipePicker`);
  - the "Most planned here" mix hint on a building without recipes
    (`PlanProductionBuilding`, `typicalRecipes`).
- **`components/PlanStarterSetup.vue`**: the "Start from a typical setup"
  card, rendered by `PlanProduction` in an empty, editable plan while the
  planet has v2 insights (hidden for this view by "Start empty", which
  leaves a link to bring it back). It lists the 8 most planned buildings
  (those in ≥ 20 % of plans checked) with their median amount and
  `typicalRecipes`, and the experts split. It emits an `IStarterSetup` that
  `PlanView` adds with `handleApplyStarterSetup` as one undo step,
  switching hab auto-optimise on. `PlanProduction` sends `plan:starter_show`
  and `plan:starter_dismiss`, `PlanView` `plan:starter_apply`.
- **`usePlanetInsights.types.ts`**: the card's types (`IStarterSetup`,
  `ITypicalRecipes`).
- **`planInsights.util.ts`**: `segmentColor` (split bar colours, shared with
  the box), the starter constants and `starterExperts` (types in ≥ 50 % of
  plans with their median amount, within the expert limits).

## Data

- The response is a discriminated union
  (`AnalyticsPlanetInsightsPayloadSchema` in
  `features/api/schemas/analyticsData.schemas.ts`). A `below_threshold`
  response has no `insights_data`, or `null`.
- Every caller executes the named query, so the query store makes one
  request per planet.

## Gotchas

- Nothing renders or is requested while the "Plan suggestions" preference
  (`planSuggestions`) is off.

## Tests

The API is covered in `src/tests/features/api/analyticsData.api.test.ts`,
the composable in `src/tests/features/plan_analytics/usePlanetInsights.test.ts`,
the helpers in `planInsights.util.test.ts`, the box and the starter card
in the local component suite (`src/tests/features/plan_analytics/components/`).
