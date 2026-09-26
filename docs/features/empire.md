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
| `EmpireConfiguration` | Faction, permits and CX selection |
| `EmpireMaterialIOFiltered` | Material I/O with filters. Hosts the sub-views below |
| `EmpireMaterialIO` | Material I/O table |
| `EmpireMaterialIOFilters` | The filter controls |
| `EmpireAnalysis` | Charts, using `ui/charts/EmpirePieChart.vue` and `EmpirePlanMapChart.vue` |
| `EmpireOpportunities` | Production opportunities |

**Composables and types:**
- `useProductionOpportunities(empireIO, cxUuid)` works out which recipes
  could use the empire's surplus materials. It prices them with
  `usePrice(...).getPrice(…, "SELL")` and loads its data on mount.
- `empire.types.d.ts` holds `IEmpireCostOverview`, `IEmpireMaterialIO`,
  `IEmpirePlanListData`, `IEmpireMaterialIOState` and the empire
  create/patch payloads.

## Data

- `EmpireView` loads data through `WrapperPlanningDataLoader`
  (`empire-list`, `empire-uuid`) and `WrapperGameDataLoader`.
- After calculating, the aggregated material I/O goes back to the backend
  through `PatchEmpireState`.

## Gotchas

- The empire's results depend on both the empire and the CX. See the note in
  planning-engine.md about cache keys.
- Components use `defineAsyncComponent`, so keep heavy additions lazy.

## Tests

`src/tests/features/empire/useProductionOpportunities.test.ts`
