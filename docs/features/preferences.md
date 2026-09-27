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
| `userPreferences.types.ts` | `IPreference`, `IPreferencePerPlan` and `IPreferenceDefault` |
| `userDefaults.ts` | `preferenceDefaults`: every default, including `planDefaults` for per-plan keys |
| `usePreferences.ts` | Writable computeds for each global preference, `cleanPlanPreferences()`, `getBurnDisplayClass()`. It watches the store and **debounces a `PatchPreferences` call by 5s** |
| `usePlanPreferences.ts` | `usePlanPreferences(planUuid)`: writable computeds for one plan's overrides, merged over `planDefaults`. `planUuid` is a ref, getter or string; while it is `undefined` it reads `planDefaults` and writes are no-ops |

## Adding a preference

1. Add the field to `IPreference`, or to `IPreferencePerPlan` for a per-plan
   preference.
2. Add its default to `preferenceDefaults` (or `planDefaults`).
3. Add it to `UserPreferenceSchema` in
   `src/features/api/schemas/user.schemas.ts`. **If you skip this step, the
   backend round-trip fails validation.**
4. Expose a writable computed from `usePreferences` or `usePlanPreferences`.

## Gotchas

- **Never mutate `preferenceDefaults`.** `userStore` uses it to seed and
  reset state, so clone it before changing anything. Tests that leaked
  changes here have caused order-dependent failures.
- **Backend sync is debounced and fire-and-forget.** Errors are only logged.
- **`userStore.initLocale` loads the locale before mount.** Changing it
  goes through `userStore.setLocale`, which lazy-loads the messages.

## Tests

`src/tests/features/preferences/usePreferences.test.ts` and
`usePlanPreferences.test.ts`.
