# account

**Purpose.** This folder holds the authentication UI: login, registration,
email verification, and requesting and performing a password reset. It
also holds the email nudge: the Empire banner that asks for an email and the
dialog that adds and confirms one.

**Used by.**
- `layout/components/HomepageHeader.vue`, which shows `LoginComponent` or
  `RegistrationComponent` in its slide-in panel (`PDrawer`). Both forms are
  styled for that panel only (the landing classes in
  `features/homepage/homepage.constants.ts`); their requests, validation
  and redirects are their own.
- `views/VerifyEmailView.vue`, `RequestPasswordResetView.vue` and
  `PasswordResetView.vue`.
- `views/EmpireView.vue` (`EmailNudgeBanner`) and
  `profile/components/ProfileEmail.vue` (`EmailAddDialog`).

## Key files

| Component | Calls |
| --- | --- |
| `LoginComponent.vue` | `userStore.performLogin(username, password)`, which returns `"ok"`, `"throttled"` (429) or `"failed"`. On `"ok"` it has stored the tokens and loaded the profile, then navigates, first match wins: to `?redirectTo=`, to the panel's `next` (read before the login, since the header and its panel leave on it), stays on a shared plan (`shared-plan`) or Planet Search (`search`, with its query), else to `/empire`. A 429 shows "too many login attempts" instead of the credentials error |
| `RegistrationComponent.vue` | `PostUserRegistration` |
| `VerifyEmailComponent.vue` | `PostUserVerifyEmail`, which returns the result code (`verified`, `already_verified`, `invalid`, `expired`, `no_code`, `throttled`, `error`) and refreshes the profile once confirmed. The route needs a login; the guard sends a logged-out visitor to the login with `redirectTo`, so the emailed link works on any device |
| `EmailNudgeBanner.vue` | The Empire banner (full view only): `none` (Add email, Not now, Don't remind me) or `unconfirmed` (Enter code, Send new code, Not now). Counts all plans with `GetAllPlans` once it shows |
| `EmailAddDialog.vue` | Email, then code, then done: `PatchUserProfile` with `{email}` only, then `PostUserVerifyEmail`. Opens at `email` or `code`; used by the banner and Profile |
| `RequestPasswordReset.vue` | `PostUserRequestPasswordReset`, enabled once the email passes the request schema and ignored while a request runs. A 429 shows the throttled message, any other error a generic one |
| `PasswordReset.vue` | `PostUserPasswordReset`. It turns every error into a message, except a 429, which it rethrows so the component shows the throttled message |

`useEmailNudge.ts` decides whether the banner shows: logged in, preferences
loaded (`userStore.preferencesLoaded`), an email missing or unconfirmed, at
least one plan, and not dismissed (`emailNudgeDismissal` `"never"`, or
`"later"` under 30 days ago). Its `later` / `never` / `undo` write the two
preferences, synced like any other. `account.util.ts` has `isEmailAddress`
(the rule of every email field) and `maskEmail`.

`useAuthPanel.ts` holds which form the header panel shows (login,
registration or none), as module state: `HomepageHeader` renders the panel
and toggles it from its buttons, `switchTo()` is the switch inside it, and
the landing page, `SharedPlanBanner` and Planet Search ("+", the Chart's
double-click, the Distance section) open it with
`open(panel, source, { next, context })`. `next` is where a login leads,
`context` the planet a plan is started on, which `AuthPanelContext.vue`
names above both forms (loaded with them). Both last across the switch and
the welcome state, until `close()`; the header's own buttons open the panel
without them. Opening never scrolls: the panel slides in where the
page is. `open` and `switchTo` send `landing:auth_open` / `landing:auth_switch`.
After a registration the welcome state's "Log in" emits `login`, and
`showLoginForm()` switches the panel to the login form (no event: it is
not the switch).

## Data

- Tokens and the profile live in `useUserStore` and are persisted. The
  profile is loaded once per page load (`userStore.loadProfile()`): at login,
  and in `App.vue` for a session restored from storage, so an email confirmed
  or FIO linked elsewhere shows after a reload.
- Refreshing the tokens and logging out are handled globally by
  `src/util/axiosSetup.ts` and `userStore.logout()`. See
  [../data-layer.md](../data-layer.md).

## Tests

The API is covered in `src/tests/features/api/userData.api.test.ts`. Login
and refresh are covered in `src/tests/stores/userStore.test.ts`, where the
login navigates in `src/tests/features/account/components/LoginComponent.test.ts`
(`pnpm test:components`).
