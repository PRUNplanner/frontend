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
| `ManageEmpire.vue` | Empire CRUD: `CreateEmpire`, `PatchEmpire`, `DeleteEmpire`, and the CX select per empire. Exposes `changedCount`, `save()` (`PatchEmpireCXJunctions`) and `discard()` to the save bar |
| `ManageCX.vue` | CX create and delete: `CreateCX`, `DeleteCX` |
| `ManagePlanEmpireAssignments.vue` | Plan↔empire matrix: toolbar (search, "In empire", unassigned only), sortable plain table (cards below `md`), one ⋯ `NDropdown` (`ClonePlan`, `SharingModal`, `DeletePlan`). Exposes `changes`, `save()` (`PatchEmpirePlanJunctions`) and `discard()` |
| `ManageAssignmentRow.vue` / `ManageAssignmentCard.vue` | One plan as table row / card. Cell state arrives as one string (`cells`), so a toggle re-renders only that row. The ⋯ menu button is a plain `<button>` with an inline SVG, cheap in every row |
| `ManageSaveBar.vue` | Sticky "n unsaved changes" bar: Discard, Save changes, saving and error states |
| `useAssignmentMatrix.ts` | Matrix state as two `Set`s of `"<plan>|<empire>"` keys (`loaded`, `current`) in `shallowRef`s, plus pure `buildLoaded`, `diff`, `toJunctions`, `setMany`, `rebase`. Types in `useAssignmentMatrix.types.ts`; payloads are `PlanEmpireJunction` (`empireData.schemas.ts`) and `CXEmpireJunction` (`cxData.schemas.ts`) |

## Data

- Every write goes through `useQuery`. The query definitions invalidate
  `["planningdata", "empire"]` and `["planningdata", "plan"]` with
  `exact: false`, so empires and plans refetch into `planningStore`.
- The views read from `planningStore` (`getAllCX`, `empires`, `plans`).

## Saving

- CX selects and matrix cells are local edits until **Save changes** in
  the bar (`ManageView`). It saves CX first, then plans, each only with
  changes; a part that succeeded has nothing left to send on Retry.
- `ManageView` guards route leave and `beforeunload` while dirty.
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

`useAssignmentMatrix` is covered in
`src/tests/features/manage/useAssignmentMatrix.test.ts`. Component tests
live in `src/tests/features/manage/components/` and the save bar flow in
`src/tests/views/ManageView.test.ts` (local suite, see
[testing.md](../testing.md#component-tests)). The API calls are
covered in `src/tests/features/api/empireData.api.test.ts` and
`cxData.api.test.ts`.
