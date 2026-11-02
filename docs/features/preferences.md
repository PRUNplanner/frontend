# preferences

**Purpose.** User preferences (defaults, burn thresholds, cart days, FIO
repair, layout, palette, locale, …) and per-plan overrides, kept in
`userStore.preferences`, persisted to localStorage and synced to the backend.

**Used by.** Plan, empire and FIO views and their tools, `MaterialTile`, plan
analytics, planet search, production chain check, `CXPreferenceSelector`,
profile `UserPreferences`, navigation and footer.

## Key files

| File | Role |
| --- | --- |
| `usePreferences.ts` | Writable computeds per global preference, `planSettingsOverview`, helpers; `startPreferenceSync()` (once, in `main.ts`) sends a 5 s debounced `PatchPreferences` with only the changed keys, flushed on `pagehide` |
| `usePlanPreferences.ts` | `usePlanPreferences(planUuid)`: one plan's overrides over `planDefaults`; with no uuid it reads defaults and ignores writes |
| `preferenceSync.ts` | Last synced state, `diffPreferences`, `applyPreferencePatch` (also for other tabs, see [data-layer.md §6](../data-layer.md#6-several-tabs-srclibcrosstabts)) |
| `userDefaults.ts`, `userPreferences.types.ts` | `preferenceDefaults` (incl. `planDefaults`); frontend-only types |

**Adding one:** field in `UserPreferenceSchema` (or `PreferencePerPlanSchema`)
in `api/schemas/user.schemas.ts`, default in `preferenceDefaults`, writable
computed in `usePreferences` / `usePlanPreferences`.

## Gotchas

- **Never mutate `preferenceDefaults`**: `userStore` seeds and resets from
  it; clone first (leaks cause order-dependent test failures).
- **Sync is fire-and-forget**: errors are reported, a failed PATCH is retried
  once, a pending sync is dropped if its session (refresh token) ended.
- **The backend removes a deleted plan's overrides**; the frontend must not,
  or a stale tab deletes overrides of plans another tab just created.
- **Locale** loads before mount (`userStore.initLocale`); change it with
  `userStore.setLocale`, which lazy-loads the messages.

## Tests

`src/tests/features/preferences/`.
