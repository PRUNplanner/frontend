# help

**Purpose.** In-app help: a drawer rendering a localized markdown page, and
the getting-started tutorial.

**Used by.** `HelpDrawer` in most views and tools (plan, Plan Check, empire,
exchanges, manage, planet search, profile, FIO burn/repair, every tool page);
`HelpTutorial` in `HelpView` (`/help`).

## Key files

- `components/HelpDrawer.vue`: `<HelpDrawer file-name="plan" />` loads
  `src/assets/help/<locale>/<file-name>.md` via `import.meta.glob` (`?raw`),
  falls back to `en_US`, renders with `HelpMarkdown` in a `PDrawer`.
  `HelpMarkdown` is async, so showdown loads with the first opened drawer. A
  file missing in both locales is reported and shows a load error (nothing
  shows while loading).
- `components/HelpMarkdown.vue` + `sanitizeHelp.ts`: every help markdown
  (drawer and changelog) renders through showdown, then DOMPurify; see
  [security.md](../security.md#help-markdown).
- `components/HelpTutorial.vue`: static tutorial from `help.*` i18n keys and
  router links.

## Adding a help page

1. Write `src/assets/help/en_US/<name>.md` only; other locales are synced
   by Crowdin.
2. Add `<HelpDrawer file-name="<name>" />` to the view.

`HelpView` also renders `src/assets/help/changelog.md`; update it when a
release ships user-visible changes.

## Tests

`src/tests/features/help/components/` and `src/tests/views/HelpView.test.ts`.
