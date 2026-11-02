# analytics

**Purpose.** Consent UI for product analytics (PostHog). Logic, event
wrappers and the tracking plan live in `src/lib/analytics/` and are
documented in [../analytics.md](../analytics.md).

**Used by.** `App.vue` (dialog for logged-in users, banner for visitors, both
lazy), `AppFooter` and `HomepageView` (footer link).

## Key files

- `components/AnalyticsConsentDialog.vue`: asks a logged-in user once.
- `components/AnalyticsConsentBanner.vue`: asks a visitor.
- `components/AnalyticsFooterLink.vue`: change the choice later.

## Tests

`src/tests/features/analytics/components/`; logic in
`src/tests/lib/analytics/`.
