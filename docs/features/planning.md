# planning

**Purpose.** This folder holds the plan calculation engine and the plan
editor UI. The engine is documented in depth in
[../planning-engine.md](../planning-engine.md).

**Used by.**
- `views/PlanView.vue`, the editor at `/plan/:planetNaturalId/:planUuid?`
  and `/shared/:sharedPlanUuid`.
- The batch calculation callers: `EmpireView`, `FIOBurnView`,
  `fio_repair`, `exchanges`, `production_chain` (the empire check),
  `roi_overview` and `resource_roi_overview`.

## Key files

| File | Role |
| --- | --- |
| `engine/*.ts` | The pure calculation engine, `calculatePlan(input, ctx)`. See [planning-engine.md](../planning-engine.md) |
| `usePlanContext.ts` | Builds the engine context: game data maps, planet, price book; `getActiveEmpire` |
| `usePlanCalculation.ts` / `.types.ts` | Vue adapter for the plan editor (synchronous `computed` result), `IPlanResult` and its sub-records. The domain unions (`WorkforceType`, `InfrastructureType`, `ExpertType`, `StorageType`) derive from the enums in `api/schemas/planningData.schemas.ts` |
| `usePlanCalculationHandlers.ts` | Every edit operation (`handleUpdate*`, `handleCreate*`, `handleDelete*`, `handleAdd*`, `handleChange*`, `handleApplyStarterSetup`). Each one mutates `plan.plan_data` |
| `usePlanHistory.ts` | Undo/redo for the editor: wraps the handlers so each edit is one step, and owns `modified` (differs from the last save), `savedAt` and `savedSnapshot()` (the base of a save conflict) |
| `calculations/*.ts` | Wrappers around the engine (bonus, workforce, building), infrastructure lists, extraction, hab LP optimisation |
| `useMaterialIOUtil.ts` | Combine and enrich material I/O (`enhanceMaterialIO`). Also combines empire I/O (`combineEmpireMaterialIO`, `calculateEmpireCostOverview`, `empireMaterialIOState`) |
| `planView.util.ts` | `PlanTool` keys, `foldedPanes`, and the Material I/O totals and CSV download (`materialIOTotals`, `materialIOCsv`) |
| `planView.types.ts` | `IPlanCalculation` (what `usePlanCalculation` returns) and `IPlanViewProps`, shared by `PlanView` and its composables |
| `usePlanSave.ts` | Save (a version, optionally named or a restore), Make active (`activateVersion`), Save as, discard, save conflicts (`useSaveConflict`), another tab's change (`remoteChange`) and the leave guard; owns the save version (`modified_at`) a save is sent from |
| `usePlanShortcuts.ts` | Ctrl/Cmd with S, Z, Shift+Z and Backquote (calculation debug), the tracked `trackedUndo` / `trackedRedo` |
| `usePlanDraft.ts` | The autosave draft in the backend: a debounced PUT after edits, a keepalive flush when the page hides, a DELETE on undo back or discard; one queue per tab for draft writes and saves; another tab's draft (409 `draft_conflict`) stops autosaving and asks |
| `usePlanVersions.ts` | The plan's saved versions for the save control, rename, delete (`remove`) |
| `usePlanEdits.ts` | Edits with feedback: undo toasts for removed buildings and recipes, the recipe picker's status line, the starter setup and hab optimising (auto on workforce changes) |
| `usePlanSharedCopy.ts` | A shared plan's working copy: the shared version's calculation to compare against, reset, the change summary copy, the viewer's empire for prices |
| `usePlanLayout.ts` | Tool tabs, folding Base and Material I/O to strips, their overlays, result tiles opening their source, the phone's one section at a time; binds the `layout` and `base` template refs |
| `usePlanIO.ts` | The Material I/O pane's flow, filter and value, rows, totals and CSV download |
| `calcDebug.util.ts` / `.types.ts` | Calculation debug: self-checks of a traced run, trace tree, copy as text and JSON. See [Tracing](../planning-engine.md#tracing) |

## Components

- **`PlanView.vue`** is a thin page: it owns the plan ref, the empire and
  CX it calculates with and `usePlanCalculation`, and composes the
  `usePlan*` composables above, each given the calculation and the refs it
  needs. They are synchronous, so their watchers and listeners bind to
  the page and go with it.
- **Editor panes** (`components/`) are wired together by `PlanView.vue`,
  three panes under a sticky `PlanResultsBar` (profit, payback, profit per
  area, area, storage): `PlanBase` (Base: `PlanConfiguration`,
  `PlanBonuses`, `PlanArea`, `PlanWorkforce`, `PlanInfrastructure`,
  `PlanExperts` in foldable `<details>` sections), `PlanProduction` (→
  `PlanProductionBuilding` → `PlanProductionRecipe`, and the inline
  `PlanRecipePicker`) and `PlanMaterialIO`. `PlanToolTabs` switches a tool
  in place of `PlanProduction`; `planView.util.ts` (`foldedPanes`) says
  which side panes fold to a strip for which tool. The picker's ordering and
  dependency note are pure functions in `recipePicker.util.ts`. Tools load
  lazily inside a `Suspense` with `PlanToolFallback` (a delayed spinner).
- **Header**: `PlanSaveControl`, one segmented control: undo, redo, the
  save status (opens `PlanVersionsPopover`, a bottom sheet on a phone; a row's
  ⋯ menu renames, makes active or deletes) and
  Save with `PlanSavePopover` (version name, Save as copy, Discard
  changes); on a phone undo/redo stay in the header and the status and
  Save sit in a bar above the bottom bar. `PlanMoreMenu` has the CSV
  download and Debug. `PlanVersionPreviewBanner` shows while an older
  version is previewed (`usePlanVersionPreview`: read-only in place, the
  edits set aside; Compare, Restore as one undo step, Make active, Open as
  new plan).
- **Tools** (`components/tools/`) are extra panels on the plan page:
  - `PlanCOGM` / `PlanCOGMTable` (opened from a recipe row's COGM button,
    and from the ROI overview's `COGMButton`, not a tool tab): cost of
    goods manufactured, also without a CX (Universe prices); input price sources link to the rule
    in Exchanges, and the prices panel sets the all-planets buy price to
    the COGM ("Use as buy price", "Update to <COGM>") with the shared
    `CXFixedPriceTable` and save bar;
  - `PlanConstructionCart` and `PlanSupplyCart`: shopping lists, with
    XIT/FIO integration;
  - `PlanPOPR`: population report;
  - `PlanProfitBreakdown`: waterfall from output value to daily profit
    (`util/profitBreakdown.util.ts`, drawn by `ui/charts/PWaterfall`);
  - `PlanRepairAnalysis`: uses `repair_analysis`;
  - `PlanVisitationFrequency`;
  - `PlanCheck` (tool key `plan-check`, called What-if before 2026-10-14):
    three views, kept per tab in `usePlanCheckView`. The plan's Material
    I/O opens it on Market check.
    - `PlanCheckMarket` (default): market flags per material
      (`cx/marketCheck.util.ts`, see [cx.md](cx.md)), the plan at real
      ask/bid prices (`whatIf.util.realisticPlan`) and a summary.
    - Price sensitivity: how far profit moves per material price and each
      break-even price change (`util/whatIf.util.ts`, one recalculation per
      material with `cx/priceBook.scaledPriceBook`, drawn by
      `ui/charts/PDivergingBar`). `PlanCheckTarget` solves the price for a
      target profit (`targetFactor`) and fetches the exchange's 30-day
      range (`GetExplorationData`) once it is used.
    - Logged in, `PlanCheckCompare` compares the open plan with another of
      the user's plans (`GetAllPlans`): key figures, the payback of the
      difference (`paybackOfDifference`), material changes with the flags
      the other plan pushes them into, and a verdict (`compareRows`,
      `materialChanges`, `compareVerdict`). The other plan is calculated as
      its own plan view does: its first empire and that empire's CX
      preference.
- **Calculation debug** (`components/debug/PlanCalcDebug.vue`, English
  only): with `?debug=calc` the Debug item of `PlanMoreMenu` (or
  Ctrl/⌘ + \`) docks a terminal-style log of every engine step under the
  plan, like `ResourceROIChartDrawer` (shared `ui/useDockHeight`). Phase
  sections start collapsed (a filter or Issues only opens them); a `plan`
  section shows the plan as save sends it (`backendData`: name, empire,
  planet, permits, COGC, HQ, plan data) with its id, empires and save
  version, as JSON. It reruns the trace on every result change while open, and copies
  as text or JSON (both with the plan).
- `PlanMaterialIO` shows a market flag button after a flagged material
  (`cx/components/MarketFlagButton`) and a one-line count under the table;
  `PlanView` computes the checks with the plan's price book.

## Data

- The engine reads game data, the planet and prices from its context
  (`usePlanContext`: preloaded `useDB` caches, `usePlanetData`, a
  `PriceBook`). Components still use `useBuildingData`, `useMaterialData`
  and `usePrice`.
- The result is a `computed`: plan, empire, CX and `planningStore.cxs`
  changes recalculate it synchronously.

## Gotchas

- **Panels don't compute anything.** They receive `result` slices as props
  and emit events, and `PlanView` routes those events to `handle*`
  functions. Keep new panels the same way.
- **A shared plan is the viewer's working copy** (`shared`): editable like
  a new plan, never saved over the owner's. See
  [sharing.md](sharing.md). Optional props compare it with the shared
  version: `compare` on `PlanResultsBar`, `changes` on
  `PlanProduction` (marks per building and recipe row, removed buildings
  struck through).
- **Recipe rows show inputs → outputs.** A click opens `PlanRecipePicker`
  under the row (change) or under "+ Recipe" (add); one picker at a time
  (`PlanProduction` holds which). A pick commits at once and `PlanView`
  shows a status line with Undo under the row; read-only plans don't open
  it.
- **`disabled` means read-only**. Panels hide what only
  makes sense while editing (add building, add or delete recipe, recipe
  picker, empire, amount steppers) instead of greying it out. Inputs that
  show a value stay, disabled.
- **Put new math in `engine/`** as exported plain functions with tests in
  `src/tests/features/planning/engine/`. Components never write into
  `result`: bind `:value` and emit.
- **Hab auto-optimisation** (`optimizeHabs`) is controlled by the per-plan
  preference `autoOptimizeHabs`.

## Tests

`src/tests/features/planning/` covers the engine, the adapter (with the
characterization snapshots and benchmarks, see
[planning-engine.md](../planning-engine.md#tests-and-benchmarks)), handlers,
history, `calculations/*`, `util/` and the components.
`src/tests/views/PlanView*.test.ts` cover the page (save, conflict, shared);
the page's composables (`usePlanSave`, `usePlanLayout`, …) have their own
tests next to them.
