# help

**Purpose.** This folder provides the in-app help: a drawer that renders a
localized markdown page, and the getting-started tutorial.

**Used by.**
- `HelpDrawer` appears in most views: plan, empire, exchanges, manage,
  search, profile, FIO burn and all tools.
- `HelpTutorial` appears in `HelpView` (`/help`).

## Key files

- **`components/HelpDrawer.vue`**:
  - **Usage:** `<HelpDrawer file-name="plan" />`.
  - **Lookup:** it loads `src/assets/help/<current locale>/<file-name>.md`
    through `import.meta.glob(..., { query: "?raw" })`, falls back to
    `en_US`, and renders it with `VueShowdown` in an `NDrawer`.
  - **Missing file:** if the file exists in neither locale, it logs the
    error and shows "Unable to load"; nothing shows while a page loads.
- **`components/HelpTutorial.vue`**: static tutorial built from the `help.*`
  i18n keys and router links.

## Adding a help page

1. Write `src/assets/help/en_US/<name>.md`. Only the English version:
   Crowdin syncs the other locales.
2. Add `<HelpDrawer file-name="<name>" />` to the view.

`HelpView` also renders the changelog (`src/assets/help/changelog.md`).
Update it when a release ships user-visible changes.

## Tests

None.
