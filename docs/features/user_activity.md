# user_activity

**Purpose.** Idle detection, so the query cache stops auto-refetching in
tabs nobody is using.

**Used by.** `src/lib/query_cache/queryStore.ts`
(`checkEntryStatusAndRefresh` skips while `shouldDelay()`); `App.vue`
imports it so it starts early.

## Key files

- **`useUserActivity.ts`**: `useUserActivity(inactivityThreshold = 5 min,
  maxDelay = 3 h)` listens to mousemove, keydown, click, scroll, touchstart
  (throttled 200 ms). `shouldDelay()` is true after the threshold, but
  returns false once per `maxDelay` so data never goes longer without a
  refresh.
- **`userActivityStore.ts`**: the app-wide singleton `userActivity` (a plain
  module, not Pinia).

## Tests

`src/tests/features/user_activity/useUserActivity.test.ts`
