# analytics

**Purpose.** The consent UI for product analytics (PostHog). The logic,
the event wrappers and the tracking plan are documented in
[docs/analytics.md](../analytics.md); the code lives in
`src/lib/analytics/` (`useAnalytics`, `useAnalytics.types`,
`useAnalyticsConsent`, `usePostHog`).

**Used by.** `App.vue` (dialog for logged-in users, banner for visitors,
both lazy), `AppFooter` and `HomepageView` (footer link).

## Key files

- **`components/AnalyticsConsentDialog.vue`**: asks a logged-in user once.
- **`components/AnalyticsConsentBanner.vue`**: asks a visitor.
- **`components/AnalyticsFooterLink.vue`**: lets anyone change the choice
  later.

## Tests

`src/tests/features/analytics/components/`; the logic in
`src/tests/lib/analytics/`.
