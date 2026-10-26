# save_bar

**Purpose.** The sticky "unsaved changes" bar with Discard and Save. The
parent owns the changes and the save; the bar only shows them.

**Used by.** `ManageView`, `ExchangesView` and the prices panel of
`planning/components/tools/PlanCOGM.vue`.

## Key files

- **`components/SaveBar.vue`**:
  - **Props:** `count` (unsaved changes), an optional muted `detail`
    (e.g. "3 plans · 2 empires") and `state` (`idle`, `saving` or
    `error`; Save turns into Retry on `error`).
  - **Emits:** `save` and `discard`.
  - **Text:** `management.save_bar.*`.

## Gotchas

- On phones it sits above the app's bottom bar. Its `data-save-bar`
  attribute lifts the toasts above it (`body:has([data-save-bar])` in
  `src/assets/css/style.css`).

## Tests

No test of its own: covered through `src/tests/views/ManageView.test.ts`,
`src/tests/views/ExchangesView.test.ts` and
`src/tests/features/planning/components/PlanCOGM.test.ts`.
