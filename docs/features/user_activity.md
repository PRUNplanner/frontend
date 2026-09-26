# user_activity

**Purpose.** This folder detects whether the user is idle, so that
background work pauses in tabs nobody is looking at. Today that work is the
query cache's automatic refetching.

**Used by.** `src/lib/query_cache/queryStore.ts`
(`checkEntryStatusAndRefresh` skips refetching while `shouldDelay()` is
true). `App.vue` imports it so it initialises early.

## Key files

- **`useUserActivity.ts`**: `useUserActivity(inactivityThreshold = 5 min,
  maxDelay = 3 h)`. It listens for mousemove, keydown, click, scroll and
  touchstart, throttled to 200 ms.
  - `shouldDelay()` returns true once the user has been idle longer than the
    threshold.
  - Once every `maxDelay` it returns false anyway, so data never goes more
    than 3 h without a refresh.
- **`userActivityStore.ts`**: `export const userActivity =
  useUserActivity()`, the app-wide singleton. It is a plain module, not a
  Pinia store.

## Tests

`src/tests/features/user_activity/useUserActivity.test.ts`
