# empire

**Purpose.** This folder holds the components for the empire dashboard
(`/empire/:empireUuid?`). They aggregate every plan in an empire into a cost
overview, a plan list, material I/O and production opportunities.

**Used by.** `views/EmpireView.vue`. The calculation loop is in the view
itself. See [../planning-engine.md](../planning-engine.md#empires).

## Key files

**Components (`components/`):**

| Component | Shows |
| --- | --- |
| `EmpireCostOverview` | Totals across the empire |
| `EmpirePlanList` | Plan list with per-plan results |
| `EmpireConfiguration` | Faction and permits of an empire, with the permit mismatch hint |
| `EmpireConfigurationForm` | The name, faction and permit fields, shared by the two above and below |
| `EmpireOnboarding` | Welcome card shown instead of the dashboard while the selected empire has 0 plans |
| `EmpireEmpty` | "No empires" state: creates one with the signup defaults and the first CX |
| `EmpireMaterialIOFiltered` | Material I/O with filters. Hosts the sub-views below |
| `EmpireMaterialIO` | Material I/O table |
| `EmpireMaterialIOFilters` | The filter controls |
| `EmpireAnalysis` | Charts, using `ui/charts/EmpirePieChart.vue` and `EmpirePlanMapChart.vue` |
| `EmpireOpportunities` | Production opportunities |

**Composables and types:**
- `useEmpireForm(data)` keeps an editable copy of an empire's configuration
  and saves it with `PatchEmpire`.
- `useProductionOpportunities(empireIO, cxUuid)` works out which recipes
  could use the empire's surplus materials. It prices them with
  `usePrice(...).getPrice(…, "SELL")` and loads its data on mount.
- `empire.types.ts` holds the frontend-only `IEmpireCostOverview`,
  `IEmpireMaterialIO` and `IEmpirePlanListData`. The wire shapes
  (`PlanEmpireElement`, `EmpirePayload` for create/patch,
  `EmpireMaterialIOState`) are schema-derived in
  `src/features/api/schemas/empireData.schemas.ts`.

## Data

- `EmpireView` loads data through `WrapperPlanningDataLoader`
  (`empire-list`, `empire-uuid`) and `WrapperGameDataLoader`.
- After calculating, the aggregated material I/O goes back to the backend
  through `PatchEmpireState`.

## Gotchas

- The empire's results depend on both the empire and the CX. See the note in
  planning-engine.md about cache keys.
- Components use `defineAsyncComponent`, so keep heavy additions lazy.
- `EmpireView` checks the onboarding case (`planData` empty) before the
  calculation progress, so the card stays mounted while a save recalculates.

## Tests

`src/tests/features/empire/useProductionOpportunities.test.ts`,
`useEmpireForm.test.ts`, and component tests in `components/`.
