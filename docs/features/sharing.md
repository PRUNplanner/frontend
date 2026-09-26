# sharing

**Purpose.** This folder creates and deletes public, read-only links to a
plan (`/shared/:sharedPlanUuid`) and shows their view counts.

**Used by.** `PlanView.vue` (`SharingButton`, loaded async) and
`ManagePlanEmpireAssignments.vue`.

## Key files

- **`useSharing.ts`**: `useSharing(planUuid)` returns:
  - `isShared`, `viewCount` and `url`, where `url` is
    `config.SHARE_BASE_URL/<shared uuid>`;
  - `createSharing()`, `deleteSharing()` and `refreshStore()`, which run the
    `CreateSharedPlan`, `DeleteSharedPlan` and `GetAllShared` queries.
- **`components/SharingButton.vue`**: the UI for the above.

## Data

- `planningStore.shared` is keyed by **plan uuid**, not by the shared uuid.
- Opening a shared link loads the plan through `WrapperPlanningDataLoader
  shared-plan-uuid` (the `GetSharedPlan` query). Visitors can clone it
  through `usePlan().cloneSharedPlan`.

## Tests

`src/tests/features/sharing/useSharing.test.ts` and
`src/tests/features/api/sharingData.api.test.ts`.
