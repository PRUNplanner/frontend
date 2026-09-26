# manage

**Purpose.** This folder powers the management page (`/manage`). It covers:
- creating, renaming and deleting **empires**;
- creating and deleting **CX preferences**, and assigning them to empires;
- assigning **plans to empires** in bulk (plus clone, delete and share
  actions).

**Used by.** `views/ManageView.vue`.

## Key files

| Component | Role |
| --- | --- |
| `ManageEmpire.vue` | Empire CRUD: `CreateEmpire`, `PatchEmpire`, `DeleteEmpire` |
| `ManageCX.vue` | CX CRUD and empire↔CX junctions: `CreateCX`, `DeleteCX`, `PatchEmpireCXJunctions` |
| `ManagePlanEmpireAssignments.vue` | Plan↔empire matrix: `PatchEmpirePlanJunctions`, plus `ClonePlan`, `DeletePlan` and `SharingButton` |
| `ManageAssignmentFilters.vue` | Filters for that matrix |
| `manage.types.ts` | `IPlanEmpireJunction`, `ICXEmpireJunction` and `IPlanCloneResponse` |

## Data

- Every write goes through `useQuery`. The query definitions invalidate
  `["planningdata", "empire"]` and `["planningdata", "plan"]` with
  `exact: false`, so empires and plans refetch into `planningStore`.
- The views read from `planningStore` (`getAllCX`, `empires`, `plans`).

## Gotchas

- Junction PATCHes send the **full** junction list, not a diff. Build the
  whole list from the current state.

## Tests

There are no tests for the components directly. The API calls are covered
in `src/tests/features/api/empireData.api.test.ts` and
`cxData.api.test.ts`.
