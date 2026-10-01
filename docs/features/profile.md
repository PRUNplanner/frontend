# profile

**Purpose.** This folder holds the sections of the profile page
(`/profile`).

**Used by.** `views/ProfileView.vue`.

## Key files

| Component | Does |
| --- | --- |
| `ChangeProfile.vue` | Edit profile fields (e.g. FIO username/key): `PatchUserProfile`, then `userStore.performGetProfile()`. The backend checks changed FIO credentials and answers 400 with a code per field (`fio_required`, `fio_invalid_key`, `fio_username_mismatch`), shown under the field; the FIO status line reads `userStore.fioStatus` (the same state drives the nav FIO tag) |
| `ChangePassword.vue` | `PatchUserChangePassword` |
| `FIOInformation.vue` | Explains how to link FIO (static, i18n `profile.fio_information.*`) |
| `UserPreferences.vue` | Edits global preferences through `usePreferences`: default empire and CX (`CXPreferenceSelector`), burn thresholds, XIT defaults, and so on |
| `StorageData.vue` | Diagnostics: IndexedDB store statistics and the size of `planningStore` |

## Tests

None for the components. Preferences are covered in
`src/tests/features/preferences/`.
