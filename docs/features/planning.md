# planning

**Purpose.** The plan calculation engine and the plan editor UI. Engine,
`usePlanCalculation`, batch calculation, tracing and benchmarks are
documented in [planning-engine.md](../planning-engine.md); this page covers
the folder layout and the editor.

**Used by.**
- `views/PlanView.vue`: the editor at `/plan/:planetNaturalId/:planUuid?` and
  `/shared/:sharedPlanUuid`.
- Batch callers of `calculatePlan` + `usePlanContext`: `empire`
  (`useEmpireCalculation`, for `EmpireView` and `FIOBurnView`), `fio_repair`,
  `exchanges`, `production_chain`, `roi_overview`, `resource_roi_overview`,
  `base_roi`.

## Key files

| File | Role |
| --- | --- |
| `engine/*.ts` | Pure engine, `calculatePlan(input, ctx)` |
| `usePlanContext.ts` | Engine context (game data maps, planet, price book); `getActiveEmpire` |
| `usePlanCalculation.ts` / `.types.ts` | Editor adapter (synchronous `computed`), `IPlanResult` |
| `usePlanCalculationHandlers.ts` | Every edit operation (`handle*`), each mutating `plan.plan_data` |
| `usePlanHistory.ts` | Undo/redo (one step per edit), `modified`, `savedSnapshot()` (save conflict base) |
| `usePlanSave.ts` | Save, Make active, Save as, discard, Reload saved (`reloadPlan`), save conflicts, other tabs' changes, leave guard; owns the save version (`modified_at`) |
| `usePlanDraft.ts` | Backend autosave draft: debounced PUT, keepalive flush on page hide, DELETE on undo-to-saved, discard or reload; a draft found on open is only offered (`restore`), the next write replaces it; one write queue per tab shared with saves; another tab's draft (409) stops autosaving and asks |
| `usePlanVersions.ts`, `usePlanVersionPreview.ts`, `planVersions.util.ts` | Saved versions and the read-only preview of an older one |
| `usePlanEdits.ts`, `usePlanSharedCopy.ts`, `usePlanIO.ts`, `usePlanShortcuts.ts`, `usePlanCheckView.ts`, `usePlanView.ts` | Page composables: edit feedback (undo toasts, starter setup, hab auto-optimise), shared-plan working copy, Material I/O, keyboard shortcuts, Plan check view; `providePlanView` / `usePlanView` hand the page's state to the elements |
| `layout/*.ts` | The plan grid, pure and Vue-free except the `use*` files: element registry with minimum sizes (`elements.ts`), presets, `normaliseLayout`, `packLayout` (skyline packing, kept-in-view band, automatic reflow, phone stacking), `layoutOps` (every customise change, with its announcement), `snapping`, the tab's `sessionLayoutStore` (`planLayout.schemas.ts`), `usePlanLayoutPreference`, `usePlanGrid` (tabs, folding, `focusElement`), `usePlanLayoutEditor` (customise mode) |
| `planView.util.ts` / `.types.ts`, `recipePicker.util.ts` | `PlanTool` keys, Material I/O totals/CSV, page types; recipe picker ordering |
| `useMaterialIOUtil.ts` | Material I/O enrichment; also combines empire I/O |
| `calculations/*.ts` | Infrastructure, extraction, hab LP optimisation (the `.types.ts` there are engine types) |
| `util/whatIf.util.ts`, `util/profitBreakdown.util.ts` | Plan check maths; profit waterfall |
| `calcDebug.util.ts`, `components/debug/PlanCalcDebug.vue` | Calculation debug: traced-run self-checks, trace tree, copy as text/JSON |

## Components

- `PlanView.vue` is a thin page: it owns the plan ref, empire, CX and
  `usePlanCalculation`, and composes the `usePlan*` composables above.
- The page is a grid (`components/layout/PlanGrid.vue`, `PlanGridItem.vue`)
  of elements (`components/elements/`): `PlanKpiElement` (one results
  tile), `PlanBaseElement` (`PlanConfiguration`, `PlanBonuses` + `PlanArea`,
  `PlanWorkforce`, `PlanInfrastructure` or `PlanExperts`),
  `PlanProductionElement` (`PlanProduction` → `PlanProductionBuilding` →
  `PlanProductionRecipe`, inline `PlanRecipePicker`), `PlanToolElement` (a
  tool, loaded inside `Suspense` with `PlanToolFallback`),
  `PlanMaterialIOElement` and `PlanMaterialIOTotalsElement`. Elements take
  no props: they read `usePlanView()`, and lay out for their own width with
  container queries. A tab group uses `PlanToolTabs`. `PlanLayoutMenu` picks
  the layout, `PlanLayoutEditor` (+ `PlanLayoutElementsPanel`) customises it.
- Header: `PlanSaveControl` (undo, redo, save status → `PlanVersionsPopover`,
  Save → `PlanSavePopover`), `PlanMoreMenu` (CSV, Debug),
  `PlanVersionPreviewBanner`.
- `components/tools/`: `PlanConstructionCart`, `PlanSupplyCart`, `PlanPOPR`,
  `PlanProfitBreakdown`, `PlanRepairAnalysis`, `PlanVisitationFrequency`,
  `PlanCheck` (key `plan-check`: `PlanCheckMarket` with market flags from
  `cx/marketCheck.util.ts`, price sensitivity with `PlanCheckTarget`, and
  `PlanCheckCompare` against another of the user's plans, logged in only).
  `PlanCOGM` / `PlanCOGMTable` is not a tab: it opens from a recipe row and
  from `roi_overview`'s `COGMButton`.
- Calculation debug (English only) is enabled by `?debug=calc` on any URL
  (stored in localStorage, `?debug=off` turns it off; `lib/debugMode.ts`),
  then opened from `PlanMoreMenu` or Ctrl/Cmd+Backquote.

## Gotchas

- **Elements don't compute anything.** They read `result` slices from
  `usePlanView()` and call its `handle*`. Components never write into
  `result`.
- **Put new math in `engine/`** as exported plain functions with tests in
  `src/tests/features/planning/engine/`.
- **`disabled` means read-only**: panels hide edit-only controls (add
  building, recipe picker, steppers…) instead of greying them out; value
  inputs stay, disabled.
- **A shared plan is the viewer's working copy**, never saved over the
  owner's ([sharing.md](sharing.md)). Optional props compare it with the
  shared version (`SharedPlanDeltas` above the grid, `changes` on
  `PlanProduction`).
- **One recipe picker at a time** (`PlanProduction` holds which); a pick
  commits at once with an Undo status line; read-only plans don't open it.
- Hab auto-optimisation follows the per-plan preference `autoOptimizeHabs`.

## Tests

`src/tests/features/planning/` (engine, adapter with characterization
snapshots and benches, handlers, history, composables, `calculations/`,
`util/`, components); the page in `src/tests/views/PlanView*.test.ts`
(save, conflict, shared). See
[planning-engine.md](../planning-engine.md) for the snapshot and bench
workflow.
