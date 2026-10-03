# save_conflict

**Purpose.** A plan, empire configuration or CX saved in another tab (or on
another device) after this tab loaded it makes the save fail with 409, a
deleted one with 404. This folder shows what happened and lets the user
choose, so nothing is overwritten silently.

**Used by.** `PlanView`, `useEmpireForm` (`EmpireConfiguration`,
`EmpireOnboarding`), `useCXSave` (`ExchangesView`, `PlanCOGM`).

## Key files

| File | Role |
| --- | --- |
| `saveConflict.util.ts` | `getSaveError(err)` (409 `conflict` / 404 `deleted`), `diffByKey`, `threeWay(loaded, saved, mine, diff)` and `collapse(lines, 8)` |
| `saveConflict.types.ts` | `IChangeLine` (`area`, i18n `key`, `params`), `IChanges`, `SaveConflictOption`, `ISaveConflictRequest` |
| `useSaveConflict.ts` | Dialog state; `ask({deleted, options, loadChanges})` resolves with the chosen option, or `null` when closed |
| `components/SaveConflictDialog.vue` | "Changed in the other tab" and "Your changes", areas changed on both sides highlighted, long lists collapsed |
| `components/SaveConflictNotice.vue` | Inline "Saved / Deleted in another tab" notice with Reload |

The diffs live with their type: `planning_data/planDiff.ts`,
`empire/empireDiff.ts`, `cx/cxDiff.ts`. They are pure and match list items
by key, never by position, so a reordered list is no change.

## Options

- **Plan:** Save as new plan ("<name> (copy)" in the original's empire),
  Overwrite (save without a base version), Reload. Deleted: Save as new plan.
- **Empire, CX:** Overwrite, Reload. Deleted: a notice.
- Closing the dialog keeps the edits unsaved.

## Gotchas

- Every save must send the version its edit started from and take the new
  one from the response, or a tab conflicts with itself.
- If loading the saved version fails, the dialog still offers its options,
  without the lists.

## Tests

`src/tests/features/save_conflict/`, `planning_data/planDiff.test.ts`,
`empire/empireDiff.test.ts`, `empire/useEmpireForm.test.ts`,
`cx/cxDiff.test.ts`, `cx/useCXSave.test.ts`.
