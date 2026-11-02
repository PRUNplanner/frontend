# save_bar

**Purpose.** Sticky "unsaved changes" bar with Discard and Save. The parent
owns the changes and the save.

**Used by.** `ManageView`, `ExchangesView`, the prices panel of
`planning/components/tools/PlanCOGM.vue`.

## Key files

- **`components/SaveBar.vue`**: props `count`, `detail`, `state` (`idle`,
  `saving`, `error`: Save becomes Retry); emits `save`, `discard`.

## Gotchas

- On phones it sits above the bottom bar; its `data-save-bar` attribute
  lifts toasts above it (`body:has([data-save-bar])` in
  `src/assets/css/style.css`).

## Tests

None of its own: covered by `src/tests/views/ManageView.test.ts`,
`ExchangesView.test.ts` and
`src/tests/features/planning/components/PlanCOGM.test.ts`.
