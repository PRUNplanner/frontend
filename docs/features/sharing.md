# sharing

**Purpose.** This folder creates and deletes public links to a plan
(`/shared/:sharedPlanUuid`) and shows their view counts. A viewer gets the
plan as a working copy: they can change it, compare it with the shared
version, copy a change summary for Discord and save it to their own plans.
The owner's plan is never touched.

**Used by.** `PlanView.vue` (`SharingModal` from the More menu, loaded async) and
`ManagePlanEmpireAssignments.vue` (`SharingModal`).

## Key files

- **`useSharing.ts`**: `useSharing(planUuid)` returns:
  - `isShared`, `viewCount` and `url`, where `url` is
    `config.SHARE_BASE_URL/<shared uuid>`;
  - `createSharing()`, `deleteSharing()` and `refreshStore()`, which run the
    `CreateSharedPlan`, `DeleteSharedPlan` and `GetAllShared` queries.
- **`components/SharingModal.vue`**: the sharing dialog for one plan
  (`planUuid`, `v-model:show`). Management renders a single instance for
  all rows.
- **`components/SharedPlanBanner.vue`**: shown by `PlanView` above a shared
  plan. It says whether the copy changed and names the price source. Once
  changed it emits `reset` and `copy`; logged in it emits `save` ("Save to
  my plans"); visitors get "Sign up to save this" and Login, which open the
  header panels through `features/account/useAuthPanel`.
- **`components/SharedPlanDeltas.vue`**: the copy's profit, ROI, area,
  workforce and building count against the shared version, shown by
  `PlanStatusBar` and `PlanOverview`.
- **`sharedPlan.util.ts`** (types in `sharedPlan.types.ts`):
  `toWorkingCopy` (drops uuid, empires and save version), `isOwnPlan`,
  `planFigures`, `buildingChanges` (per building marks and removed
  buildings, from `diffPlan`) and `buildChangeSummary` (Discord markdown,
  cut to 2000 characters with "…and N more").

## Data

- `planningStore.shared` is keyed by **plan uuid**, not by the shared uuid.
- Opening a shared link loads the plan through `WrapperPlanningDataLoader
  shared-plan-uuid` (the `GetSharedPlan` query) as a working copy without
  uuid, so `PlanView` treats it like a new plan: no save, preference,
  cross-tab watcher, construction cart or visitation memory is keyed to the
  owner's plan. The untouched copy is the history's saved state, the
  baseline that `modified`, Reset and the comparison use. Leaving or
  reloading drops the copy without a prompt.
- The comparison calculates the shared version with a second
  `usePlanCalculation`, with the same empire and CX as the copy.
- Logged in viewers load their empires, CX and plans with the shared plan
  (also after logging in on the page, which keeps the copy). Prices use the
  default empire's CX, switchable in Configuration; visitors see the
  universe 30-day average. An owner opening their own link is sent to
  their plan (`router.replace`).
- "Save to my plans" uses the Save As dialog and `CreatePlan`, changed or
  not (the backend's clone ignores the name and empire), then opens the new
  plan. Ctrl/Cmd+S opens the dialog.

## Tests

`src/tests/features/sharing/useSharing.test.ts`,
`src/tests/features/sharing/sharedPlan.util.test.ts`,
`src/tests/features/api/sharingData.api.test.ts` and, with
`pnpm test:components`, `src/tests/features/sharing/components/`.
