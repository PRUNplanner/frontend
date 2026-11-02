# manage

**Purpose.** The management page (`/manage`): create and delete empires and
CX preferences, assign CX preferences to empires, and assign plans to
empires in bulk (plus clone, share and bulk delete). Renaming an empire is on
the Empire page (`empire/components/EmpireConfiguration.vue`).

**Used by.** `views/ManageView.vue`.

## Key files

| File | Role |
| --- | --- |
| `useManageData.ts` / `.types.ts` | Page data provided by `ManageView` (`provideManageData`), injected by the sections (`useManageData` throws without it): empire, plan and CX lists, `refetch*()`, and the save bar's registered sections (`register`, `saveSections()`, `discardSections()`) |
| `components/ManageEmpire.vue` | Empire create/delete and the CX select per empire; registers the `empire` section (`PatchEmpireCXJunctions`) |
| `components/ManageCX.vue` | CX create/delete |
| `components/ManagePlanEmpireAssignments.vue` | Plan↔empire matrix: search and filters, sortable table (cards below 768 px), ⋯ menu (clone, share, delete), multi-select bulk delete; registers the `assignments` section (`PatchEmpirePlanJunctions`) |
| `components/ManageAssignmentRow.vue` / `ManageAssignmentCard.vue` | One plan as table row / card. Cell state arrives as one string (`cells`), so a toggle re-renders only that row |
| `useAssignmentMatrix.ts` / `.types.ts` | Matrix state as `Set`s of `"<plan>|<empire>"` keys (`loaded`, `current`) plus pure `buildLoaded`, `diff`, `toJunctions`, `setMany`, `rebase` |

## Saving

- CX selects and matrix cells are local edits until **Save changes** in the
  shared [save bar](save_bar.md). `saveSections()` saves `empire` (CX) first,
  then `assignments`, each only if changed, so Retry resends only what failed.
  `ManageView` guards route leave and `beforeunload` while dirty
  (`lib/useUnsavedGuard.ts`).
- Create, delete and clone save at once. The refetch afterwards re-applies
  pending edits (`rebase` for the matrix), dropping edits of deleted plans or
  empires.
- Sections never fetch lists themselves: after a write they call the
  injected `refetch*()`, which updates every section.

## Gotchas

- Junction PATCHes send the **full** plan list per empire, not a diff. The
  matrix sends only empires with a changed cell (`toJunctions`); the CX patch
  sends every CX.
- Bulk delete is one `DeletePlan` per plan inside `batchChanges` (one
  invalidation at the end); failed ones stay selected.
- Planet names are resolved once per planet in a watcher and stored on the
  frozen rows. Don't resolve names during table render: each resolved name
  would re-render the table.
- Rows render in chunks of 20 per animation frame (`renderedRows`); a search
  or filter change restarts at the first chunk.

## Tests

`src/tests/features/manage/` (sections mount with real data through
`manageDataHost()` in `manageData.helper.ts`), the save bar flow in
`src/tests/views/ManageView.test.ts`, the API in
`src/tests/features/api/empireData.api.test.ts` and `cxData.api.test.ts`.
