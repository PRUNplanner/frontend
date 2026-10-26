# profile

**Purpose.** This folder holds the sections of the profile page
(`/profile`).

**Used by.** `views/ProfileView.vue`, which stacks the sections in this
order: FIO connection (`#fio`, linked from the repair analysis and FIO
Burn), Account, Preferences, Browser storage.

## Key files

| Component | Does |
| --- | --- |
| `ProfileSection.vue` | Layout of one section: title and description on the left, content on the right (stacked on small screens) |
| `FIOConnection.vue` | FIO status, PrUn username and API key (masked): `PatchUserProfile` with the stored email, then `userStore.performGetProfile()`. The backend checks changed FIO credentials and answers 400 with a code per field (`fio_required`, `fio_invalid_key`, `fio_username_mismatch`), shown under the field; the status line reads `userStore.fioStatus` (the same state drives the nav FIO tag). The setup guide is collapsed unless FIO isn't linked yet |
| `FIOInformation.vue` | The FIO setup guide inside `FIOConnection` (static, i18n `profile.fio_information.*`) |
| `ProfileEmail.vue` | Email and the account recovery status (Not set up, Waiting for confirmation with Enter code / Send new code, Ready): `PatchUserProfile` with `{email}` only. `email_taken` shows under the field; a changed address shows a "code sent" notice. Enter code opens `EmailAddDialog` at the code step |
| `ChangePassword.vue` | Collapsed form, `PatchUserChangePassword` |
| `UserPreferences.vue` | Edits global preferences through `usePreferences` (saved as they change), grouped into tool, FIO Burn, FIO Repair, planning and privacy; lists the plans with their own settings |
| `StorageData.vue` | Diagnostics, collapsed: IndexedDB store statistics and the size of `planningStore` |

Save buttons are `secondary` until their form has an unsaved change, then
`primary`, so the page shows at most the primary actions the user started.

## Tests

`src/tests/features/profile/components/` (component tests). Preferences
logic is covered in `src/tests/features/preferences/`.
