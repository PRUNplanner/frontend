# profile

**Purpose.** The sections of the profile page (`/profile`).

**Used by.** `views/ProfileView.vue`: FIO connection (`#fio`, linked from
repair analysis and FIO Burn), Account, Preferences, Browser storage.

## Key files

| Component | Does |
| --- | --- |
| `ProfileSection.vue` | Section layout: title/description left, content right |
| `FIOConnection.vue` | FIO username and API key via `PatchUserProfile`, then `userStore.performGetProfile()`. Backend 400 codes per field (`fio_required`, `fio_invalid_key`, `fio_username_mismatch`) show under the field; status from `userStore.fioStatus` (also drives the nav FIO tag). Embeds the setup guide `FIOInformation.vue`, collapsed once linked |
| `ProfileEmail.vue` | Email and recovery status; `PatchUserProfile` with `{email}` only, `email_taken` under the field; "Enter code" opens `account`'s `EmailAddDialog` at the code step |
| `ChangePassword.vue` | Collapsed form, `PatchUserChangePassword` |
| `UserPreferences.vue` | Global preferences via `usePreferences` (saved on change) and the list of plans with own settings |
| `StorageData.vue` | Collapsed diagnostics: IndexedDB stats, `planningStore` size |

Save buttons stay `secondary` until their form has an unsaved change, then
turn `primary`.

## Tests

`src/tests/features/profile/components/`; preference logic in
`src/tests/features/preferences/`.
