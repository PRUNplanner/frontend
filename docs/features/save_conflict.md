# save_conflict

**Purpose.** A plan, empire or CX saved elsewhere after this tab loaded it
fails to save with 409 (`conflict`), a deleted one with 404. This folder
shows what changed on both sides and lets the user choose, so nothing is
overwritten silently. Also used for plan autosave draft conflicts (409
`draft_conflict`).

**Used by.** `usePlanSave`, `usePlanDraft`, `useEmpireForm`, `useCXSave`;
`getSaveError` in `usePlan`; `changeLineText` in `sharing` and the plan
version preview.

## Key files

| File | Role |
| --- | --- |
| `saveConflict.util.ts` | `getSaveError`, `isDraftConflict`, `diffByKey`, `threeWay(loaded, saved, mine, diff)`, `collapse` |
| `useSaveConflict.ts` | Dialog state; `ask({deleted, variant, options, loadChanges})` resolves with the option, or `null` when closed (edits stay unsaved) |
| `components/SaveConflictDialog.vue`, `SaveConflictNotice.vue` | Both sides' changes (overlaps highlighted); inline "Saved / Deleted in another tab" with Reload |
| `changeLineText.ts`, `saveConflict.types.ts` | A change line in words; types incl. `SaveConflictVariant` (`save`, `draft`, `draft_base`) |

The diffs live with their type (`planning_data/planDiff.ts`,
`empire/empireDiff.ts`, `cx/cxDiff.ts`) and match list items by key, never
position.

**Options.** Plan: Save as new ("<name> (copy)"), Overwrite, Reload;
deleted: Save as new only. Empire, CX, draft: Overwrite, Reload.

## Gotchas

- Every save must send the version its edit started from and take the new
  one from the response, or a tab conflicts with itself.
- If loading the saved version fails, the dialog still offers its options.

## Tests

`src/tests/features/save_conflict/`, the diff and save tests of
`planning_data`, `empire` and `cx`, and
`src/tests/views/PlanView.conflict.test.ts`.
