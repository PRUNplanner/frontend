# manage

**Purpose.** This folder powers the management page (`/manage`). It covers:
- creating and deleting **empires** (renaming is on the Empire page,
  `empire/components/EmpireConfiguration.vue`);
- creating and deleting **CX preferences**, and assigning them to empires;
- assigning **plans to empires** in bulk (plus clone, delete and share
  actions).

**Used by.** `views/ManageView.vue`.

## Key files

| Component | Role |
| --- | --- |
| `ManageEmpire.vue` | Empire list, create and delete: `CreateEmpire`, `DeleteEmpire`, and the CX select per empire. Registers `changedCount`, `save()` (`PatchEmpireCXJunctions`) and `discard()` as the `empire` section |
| `ManageCX.vue` | CX create and delete: `CreateCX`, `DeleteCX` |
| `ManagePlanEmpireAssignments.vue` | Plan↔empire matrix: toolbar (search, "In empire", unassigned only), sortable plain table (cards below `md`), one ⋯ `PDropdown` (`ClonePlan`, `SharingModal`, `DeletePlan`), a select box per row and one in the header for all shown rows, deleted together after one confirm (one `DeletePlan` each, failed ones stay selected). Registers its count, the plans/empires detail line, `save()` (`PatchEmpirePlanJunctions`) and `discard()` as the `assignments` section |
| `ManageAssignmentRow.vue` / `ManageAssignmentCard.vue` | One plan as table row / card. Cell state arrives as one string (`cells`), so a toggle re-renders only that row. The ⋯ menu button is a plain `<button>` with an inline SVG, cheap in every row |
| `save_bar/components/SaveBar.vue` | Sticky "n unsaved changes" bar: Discard, Save changes, saving and error states. Shared with Exchanges and COGM |
| `useManageData.ts` / `.types.ts` | The page's data, provided by `ManageView` (`provideManageData`) and injected by the sections (`useManageData`, throws without the provider): the empire, plan and CX lists filled by `WrapperPlanningDataLoader`, `refetchCX()`, `refetchEmpires()`, `refetchPlans()` (plans with their empires, both or neither), and the save bar's sections (`register`, `totalChanged`, `saveDetail`, `saveSections()`, `discardSections()`) |
| `useAssignmentMatrix.ts` | Matrix state as two `Set`s of `"<plan>|<empire>"` keys (`loaded`, `current`) in `shallowRef`s, plus pure `buildLoaded`, `diff`, `toJunctions`, `setMany`, `rebase`. Types in `useAssignmentMatrix.types.ts`; payloads are `PlanEmpireJunction` (`empireData.schemas.ts`) and `CXEmpireJunction` (`cxData.schemas.ts`) |

## Data

- Every write goes through `useQuery`. The query definitions invalidate
  `["planningdata", "empire"]` and `["planningdata", "plan"]` with
  `exact: false`, so empires and plans refetch into `planningStore`.
- `ManageView` owns the lists through `useManageData` and passes them to
  the sections as props. A section never fetches a list itself: after a
  write it calls the injected `refetch*()`, which updates the lists for
  every section.

## Saving

- CX selects and matrix cells are local edits until **Save changes** in
  the bar (`ManageView`, through `useManageData.saveSections`). It saves
  CX first, then plans, each only with changes; a part that succeeded
  has nothing left to send on Retry.
- `ManageView` guards route leave and `beforeunload` while dirty
  (`lib/useUnsavedGuard.ts`).
- Create/delete/clone still save at once. The reload that follows
  re-applies pending edits (`rebase` for the matrix, the same idea for CX
  selects), dropping edits of deleted plans or empires.
- Unsaved cells use the `bg-unsaved-stripes` utility (`style.css`).

## Gotchas

- Junction PATCHes send the **full** plan list per empire, not a diff.
  The plan matrix only sends the empires with a changed cell
  (`toJunctions`); the CX patch sends every CX.
- Planet names are resolved once per planet in a watcher, before the rows
  are built, and stored on the frozen rows, so the table renders once. Don't
  call `planetName()` in a table render: every resolved name re-renders the
  table.
- Rows render in chunks of 20, one per animation frame (`renderedRows`), so
  hundreds of plans never block the page; a search or filter change starts
  over with the first chunk. The mobile cards also use
  `content-visibility: auto` (it has no effect on table rows).

## Tests

`useAssignmentMatrix` and `useManageData` are covered in
`src/tests/features/manage/`. Sections mount with real Manage data through
`manageDataHost()` (`manageData.helper.ts`). Component tests
live in `src/tests/features/manage/components/` and the save bar flow in
`src/tests/views/ManageView.test.ts` (local suite, see
[testing.md](../testing.md#component-tests)). The API calls are
covered in `src/tests/features/api/empireData.api.test.ts` and
`cxData.api.test.ts`.
