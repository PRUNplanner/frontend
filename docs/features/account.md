# account

**Purpose.** This folder holds the authentication UI: login, registration,
email verification, and requesting and performing a password reset.

**Used by.**
- `layout/components/HomepageHeader.vue`, which shows `LoginComponent` and
  `RegistrationComponent`.
- `views/VerifyEmailView.vue`, `RequestPasswordResetView.vue` and
  `PasswordResetView.vue`.

## Key files

| Component | Calls |
| --- | --- |
| `LoginComponent.vue` | `userStore.performLogin(username, password)`, which returns `"ok"`, `"throttled"` (429) or `"failed"`. On `"ok"` it has stored the tokens and loaded the profile, then navigates: to `?redirectTo=`, else to `/empire`, but a shared plan (`shared-plan` route) stays open. A 429 shows "too many login attempts" instead of the credentials error |
| `RegistrationComponent.vue` | `PostUserRegistration` |
| `VerifyEmailComponent.vue` | `PostUserVerifyEmail` / `PostUserResendEmailVerification` |
| `RequestPasswordReset.vue` | `PostUserRequestPasswordReset`, enabled once the email passes the request schema and ignored while a request runs. A 429 shows the throttled message, any other error a generic one |
| `PasswordReset.vue` | `PostUserPasswordReset`. It turns every error into a message, except a 429, which it rethrows so the component shows the throttled message |

`useAuthPanel.ts` holds which header panel (login or registration) is open,
as module state: `HomepageHeader` renders and toggles the panels,
`SharedPlanBanner` opens them with `open("login" | "registration")`.

## Data

- Tokens and the profile live in `useUserStore` and are persisted.
- Refreshing the tokens and logging out are handled globally by
  `src/util/axiosSetup.ts` and `userStore.logout()`. See
  [../data-layer.md](../data-layer.md).

## Tests

The API is covered in `src/tests/features/api/userData.api.test.ts`. Login
and refresh are covered in `src/tests/stores/userStore.test.ts`, where the
login navigates in `src/tests/features/account/components/LoginComponent.test.ts`
(`pnpm test:components`).
