# account

**Purpose.** Authentication UI (login, registration, email verification,
password reset) and the email nudge (Empire banner, add-email dialog).

**Used by.** `layout/components/HomepageHeader.vue` (login/registration
panel), the verify-email and password-reset views, `EmpireView`
(`EmailNudgeBanner`), `profile/ProfileEmail.vue` (`EmailAddDialog`).
`HomepageView`, `SharedPlanBanner` and Planet Search open the panel via
`useAuthPanel`.

## Key files

- `components/LoginComponent.vue`: `userStore.performLogin()` → `"ok"`,
  `"throttled"` (429) or `"failed"`. Then navigates, first match wins:
  `?redirectTo=`, the panel's `next` (read before login, the panel closes),
  stay on `shared-plan` / `search`, else `/empire`.
- `components/VerifyEmailComponent.vue`: result codes `verified`,
  `already_verified`, `invalid`, `expired`, `no_code`, `throttled`, `error`.
  The route requires login; the guard redirects with `redirectTo`, so the
  emailed link works on any device.
- `RegistrationComponent.vue`, `RequestPasswordReset.vue`,
  `PasswordReset.vue`: forms over the `PostUser*` queries.
- `useEmailNudge.ts` + `EmailNudgeBanner.vue`: shows when logged in,
  preferences loaded, email missing or unverified, ≥ 1 plan, and not
  dismissed (`emailNudgeDismissal` `"never"`, or `"later"` < 30 days).
  Dismissals are preferences, so they hold on every device.
- `EmailAddDialog.vue`: email → code (`PatchUserProfile` with `{email}`
  only, then `PostUserVerifyEmail`).
- `useAuthPanel.ts`: module-level panel state; `open(panel, source, { next,
  context })` sends `landing:auth_open`. `next`/`context` survive a
  `switchTo()` until `close()`; `AuthPanelContext.vue` names the `context`
  planet above the forms.
- `account.util.ts`: `isEmailAddress` (rule for every email field),
  `maskEmail`.

## Gotchas

- The forms are styled for the landing panel only
  (`homepage/homepage.constants.ts` classes).
- `PostUserPasswordReset` turns every error into a message except 429,
  which it rethrows so the form shows the throttled message.
- The profile loads once per page load (login, or `App.vue` for a restored
  session), so an email confirmed elsewhere shows after a reload. Token
  refresh and logout: [../data-layer.md](../data-layer.md).

## Tests

`src/tests/features/account/` (+ `components/`); API in
`src/tests/features/api/userData.api.test.ts`; login in
`src/tests/stores/userStore.test.ts`.
