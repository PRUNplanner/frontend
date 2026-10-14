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
| `EmpireCostOverview` | Totals across the empire, a revenue split bar (inputs, workforce, degradation, profit) and daily shipping demand (t, m³) |
| `EmpirePlanList` | Plan list with per-plan results and profit bars on a shared zero line |
| `EmpireConfiguration` | Faction and permits of an empire, with the permit mismatch hint |
| `EmpireConfigurationForm` | The name, faction and permit fields, shared by the two above and below |
| `EmpireOnboarding` | Welcome card shown instead of the dashboard while the selected empire has 0 plans |
| `EmpireEmpty` | "No empires" state: creates one with the signup defaults and the first CX |
| `EmpireMaterialIOFiltered` | Material I/O with filters. Hosts the sub-views below |
| `EmpireMaterialIO` | Material I/O table: one line per material, a row expands to its planets. Owns the detail view choice and the open rows ("Expand all" opens every visible row, closing one switches back to "Summary") |
| `EmpireMaterialIOSummaryCell` | "Produced by" / "Consumed by" cell: largest plan, `+N` and a bar with one segment per plan, filled against the row's larger side |
| `EmpireMaterialIODetail` | Expanded row: "Producers · Consumers" (every plan) or "Net per planet" (surplus, balanced, needs), linking to the plans |
| `EmpireMaterialIOFilters` | The filter controls, plus "Planets: Summary \| Expand all" on the Material I/O table (session only) |
| `EmpireAnalysis` | `EmpireRevenueSplit` and `EmpireMaterialButterfly` on top; the older sorted bar charts (`ui/charts/EmpireBarChart.vue`) in a collapsed "More charts" section, its open state kept in localStorage |
| `EmpireRevenueSplit` | Where each plan's revenue goes: top 10 plans by profit, every loss-making plan, the rest as an inline-expandable "Other" |
| `EmpireMaterialButterfly` | Top 10 materials by ¢ per day, bought left and sold right (or units per day); a row opens Material I/O filtered to it |
| `EmpireOpportunities` | Production opportunities |

**Composables and types:**
- `useEmpireForm(data)` keeps an editable copy of an empire's configuration
  and saves it with `PatchEmpire`, sending the version it started from. A
  save over another tab's newer one opens the save conflict dialog
  (`conflict`, see [save_conflict](save_conflict.md)); a newer empire from
  another tab replaces a clean form, or sets `remoteNotice` if it has edits.
- `useProductionOpportunities(empireIO, cxUuid)` works out which recipes
  could use the empire's surplus materials. It prices them with
  `usePrice(...).getPrice(…, "SELL")` and loads its data on mount.
- `util/empireMaterialIO.util.ts` has the pure helpers behind the table:
  `summarizeSide` (a side sorted by amount, with shares and bar fill),
  `netPerPlanet` (net per planet, balanced when it rounds to 0.00) and
  `shortPlanetName`.
- `util/empireShippingDemand.util.ts`: `calculateEmpireShippingDemand` sums
  each plan's `calculateVisitation` (its max(import, export) per plan, plus
  the import and export totals) for the overview's shipping tiles.
- `empireAnalysis.util.ts`: `revenueSplitRows` (top, losses, rest summed
  into Other), `splitShares` (parts as % of revenue, or of cost for a loss),
  `empireSplitParts` (the KPI split on the netted empire totals) and
  `materialButterfly`. The per-plan parts come from `profitBreakdown` on
  each plan's engine result in `EmpireView`.
- `empire.types.ts` holds the frontend-only `IEmpireCostOverview`,
  `IEmpireShippingDemand`, `IEmpireMaterialIO`, `IEmpirePlanListData` (with
  its revenue split, `IEmpireSplitParts`) and the analysis shapes
  (`IEmpireSplitShares`, `IEmpireRevenueSplitRows`, `IEmpireButterflyRow`).
  The wire shapes (`PlanEmpireElement`, `EmpirePayload` for create/patch,
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
