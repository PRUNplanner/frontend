# sharing

**Purpose.** Public plan links (`/shared/:sharedPlanUuid`) with view counts.
A viewer gets a working copy: edit, compare with the shared version, copy a
Discord change summary, save to their own plans. The owner's plan is never
touched.

**Used by.** `PlanView` (`SharingModal`, `SharedPlanBanner`),
`ManagePlanEmpireAssignments` (one `SharingModal` for all rows),
`PlanResultsBar` (`SharedPlanDeltas`), `planning/usePlanSharedCopy.ts` (the
copy's logic), `PlanLoadView` (`isOwnPlan`), `usePlanningDataLoader`
(`toWorkingCopy`), what-if and check compare (`paybackDays`).

## Key files

- **`useSharing.ts`**: `useSharing(planUuid)`: `isShared`, `viewCount`,
  `url` (`config.SHARE_BASE_URL`), `createSharing`, `deleteSharing`,
  `refreshStore`.
- **`components/`**: `SharingModal` (the dialog), `SharedPlanBanner`
  (changed or not, price source, Reset / Copy / Save; visitors get Sign up /
  Login via `account/useAuthPanel`), `SharedPlanDeltas` (copy vs shared
  figures).
- **`sharedPlan.util.ts`**: `toWorkingCopy` (drops uuid, empires, save
  version), `isOwnPlan`, `paybackDays`, `planFigures`, `buildingChanges`,
  `buildChangeSummary` (cut to 2000 characters with "…and N more").

## Data

- `planningStore.shared` is keyed by **plan uuid**, not shared uuid.
- The copy has no uuid, so `PlanView` treats it as a new plan: nothing
  (save, preferences, cross-tab watcher, carts) is keyed to the owner's
  plan. The untouched copy is the history's saved state, the baseline for
  modified, Reset and the comparison (a second `usePlanCalculation`).
  Leaving drops the copy without a prompt.
- Logged-in viewers price with their default empire's CX; visitors see
  universe prices. An owner opening their own link is redirected to the plan.
- "Save to my plans" (or Ctrl/Cmd+S) creates a new plan via Save As.

## Tests

`src/tests/features/sharing/` (components with `pnpm test:components`) and
`src/tests/features/api/sharingData.api.test.ts`.
