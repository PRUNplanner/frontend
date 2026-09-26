# profile

**Purpose.** This folder holds the sections of the profile page
(`/profile`).

**Used by.** `views/ProfileView.vue`.

## Key files

| Component | Does |
| --- | --- |
| `ChangeProfile.vue` | Edit profile fields (e.g. FIO username/key): `PatchUserProfile`, then `userStore.performGetProfile()` |
| `ChangePassword.vue` | `PatchUserChangePassword` |
| `FIOInformation.vue` | Explains how to link FIO (static, i18n `profile.fio_information.*`) |
| `UserPreferences.vue` | Edits global preferences through `usePreferences`: default empire and CX (`CXPreferenceSelector`), burn thresholds, XIT defaults, and so on |
| `StorageData.vue` | Diagnostics: IndexedDB store statistics and the size of `planningStore` |

## Tests

None for the components. Preferences are covered in
`src/tests/features/preferences/`.
