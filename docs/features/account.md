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
| `LoginComponent.vue` | `userStore.performLogin(username, password)`. It stores the tokens, loads the profile, then navigates: to `?redirectTo=`, else to `/empire`, but a shared plan (`shared-plan` route) stays open |
| `RegistrationComponent.vue` | `PostUserRegistration` |
| `VerifyEmailComponent.vue` | `PostUserVerifyEmail` / `PostUserResendEmailVerification` |
| `RequestPasswordReset.vue` | `PostUserRequestPasswordReset` |
| `PasswordReset.vue` | `PostUserPasswordReset` |

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
