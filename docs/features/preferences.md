# preferences

**Purpose.** This folder manages user preferences: default empire and CX,
burn thresholds, supply-cart days, layout, locale and **per-plan
overrides**. They are stored in `userStore.preferences`, persisted to
localStorage and synced to the backend.

**Used by.**
- `PlanView`, `EmpireView` and `FIOBurnView`.
- The FIO/XIT components and the supply cart.
- Profile `UserPreferences`, and the navigation and footer (layout and
  locale).

## Key files

| File | Role |
| --- | --- |
| `userPreferences.types.ts` | `IPreferenceDefault` and `IPlanPreferenceOverview` (frontend-only). `UserPreference` and `PreferencePerPlan` are derived from `UserPreferenceSchema` in `src/features/api/schemas/user.schemas.ts` |
| `userDefaults.ts` | `preferenceDefaults`: every default, including `planDefaults` for per-plan keys |
| `usePreferences.ts` | Writable computeds for each global preference and `getBurnDisplayClass()`. It watches the store and **debounces a `PatchPreferences` call by 5s** that sends only what changed since the last sync |
| `preferenceSync.ts` | The last state known to match the backend, `diffPreferences` (changed keys, `planOverrides` per uuid, `null` for removed) and `applyPreferencePatch`. Also used when another tab changed preferences, see [data-layer.md §6](../data-layer.md#6-several-tabs-srclibcrosstabts) |
| `usePlanPreferences.ts` | `usePlanPreferences(planUuid)`: writable computeds for one plan's overrides, merged over `planDefaults`. `planUuid` is a ref, getter or string; while it is `undefined` it reads `planDefaults` and writes are no-ops |

## Adding a preference

1. Add the field to `UserPreferenceSchema` in
   `src/features/api/schemas/user.schemas.ts` (per-plan preferences go
   into `PreferencePerPlanSchema`). The `UserPreference` and
   `PreferencePerPlan` types derive from it, and the backend round-trip
   validates against it.
2. Add its default to `preferenceDefaults` (or `planDefaults`).
3. Expose a writable computed from `usePreferences` or `usePlanPreferences`.

## Gotchas

- **Never mutate `preferenceDefaults`.** `userStore` uses it to seed and
  reset state, so clone it before changing anything. Tests that leaked
  changes here have caused order-dependent failures.
- **Backend sync is debounced and fire-and-forget.** Errors are only logged,
  and a failed PATCH is retried once.
- **A deleted plan's overrides are removed by the backend.** The frontend
  never cleans them up itself: a stale tab would delete overrides of plans
  another tab just created.
- **`userStore.initLocale` loads the locale before mount.** Changing it
  goes through `userStore.setLocale`, which lazy-loads the messages.

## Tests

`src/tests/features/preferences/usePreferences.test.ts`,
`usePreferences.sync.test.ts`, `preferenceSync.test.ts` and
`usePlanPreferences.test.ts`.
