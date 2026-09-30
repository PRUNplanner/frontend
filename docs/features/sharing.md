# sharing

**Purpose.** This folder creates and deletes public, read-only links to a
plan (`/shared/:sharedPlanUuid`) and shows their view counts.

**Used by.** `PlanView.vue` (`SharingButton`, loaded async) and
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
- **`components/SharingButton.vue`**: button with the view count that
  opens `SharingModal`.
- **`components/SharedPlanBanner.vue`**: shown by `PlanView` above a shared
  plan. It says the plan is read-only and priced with the universe 30-day
  average. Logged in it emits `clone`; visitors get Create Account and
  Login, which open the header panels through
  `features/account/useAuthPanel`.

## Data

- `planningStore.shared` is keyed by **plan uuid**, not by the shared uuid.
- Opening a shared link loads the plan through `WrapperPlanningDataLoader
  shared-plan-uuid` (the `GetSharedPlan` query). Logged in users can clone
  it through `usePlan().cloneSharedPlan`.
- A shared plan never uses a CX preference: the backend sends only the plan,
  and viewers see the universe 30-day average prices.

## Tests

`src/tests/features/sharing/useSharing.test.ts`,
`src/tests/features/api/sharingData.api.test.ts` and, with
`pnpm test:components`, `src/tests/features/sharing/components/`.
