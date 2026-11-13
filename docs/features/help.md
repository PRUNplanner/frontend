# help

**Purpose.** The help centre: `/help` (home), `/help/:article` (one page per
article, section anchors), search, and the Help panel every page opens at
its article. Public and indexable (in the sitemap); the app renders every
page from the markdown the build parsed, no per-page files.

**Used by.** `HelpPanel` on 18 pages (plan, Plan check, empire, exchanges,
manage, planet search, profile, FIO burn/repair, every tool page);
`HelpView` (`/help`) and `HelpArticleView` (`/help/:article`).

## Key files

- `helpArticles.ts`: the registry, in nav order: `id`, `area` (Start here,
  Planning, Prices, Tools, FIO, Account, Reference), `file`, `parent`
  (`plan`: the plan page's articles, shown as chips in the panel),
  `related`, `updatedIn`. Titles are `help.articles.<id>.title`. `whats-new`
  is `assets/help/changelog.md`; `help_welcome` has no file and renders
  `HelpWelcome`.
- `vite.help.ts` (repo root) + `helpMarkdown.ts`: help markdown is parsed at
  build time. `import doc from "….md?help"` gives
  `{ html, toc, words, sections }`: markdown-it (no raw HTML, bare URLs
  linked), `{#id}` heading ids, the top level rendered as `h2`, `> [!tip]` /
  `> [!warning]` callouts (no other directives), sanitised with DOMPurify on
  jsdom. A translation that lacks one of the English file's section ids
  exports `null`, so the app shows English until Crowdin catches up.
  `virtual:help-search` gives one lazy search index per locale (every
  section, English where the locale lags).
- `helpContent.ts`: `loadArticle(article, locale)`, the locale's file or
  English (`isFallback`). Every file is its own chunk.
- `components/HelpArticle.vue`: one article, the same on the page and in the
  panel: meta line, the HTML (sanitised again with `sanitizeHelpHtml`),
  Related, `HelpFeedback`. In-app links go through the router.
- `components/HelpPanel.vue`: the Help button and side panel
  (`<HelpPanel article="plan_check" section="flags" />`), "Open in Help
  centre", sibling chips. Focus returns to the button when it closes.
- `components/HelpLayout.vue`, `HelpNav.vue`, `HelpToc.vue`: the frame
  (nav column, a menu on phones; "On this page"), centred at 1440 px, the
  text at 760 px, so it reads the same with or without the app sidebar.
- `components/HelpSearch.vue` + `helpSearch.ts`: the search dialog (also on
  `/`), every query word must match, titles first, at most 20 results.
- `components/HelpFeedback.vue`: "Was this page helpful?"; No asks what was
  missing and sends it to the PostHog survey (`help.constants.ts`), never in
  an event.
- `helpSource.ts`: how an article was reached, for `help:article_view`.

## Adding or changing a page

1. Write `src/assets/help/en_US/<name>.md` only (Crowdin syncs the other
   locales). Every heading gets a unique, fixed id: `## Plan check {#plan-check}`.
   Keep ids when changing a heading's text: links and translations use them.
2. Add a registry entry in `helpArticles.ts` and `help.articles.<id>.title`
   in `src/locales/en_US/help.json`.
3. Link it from a page with `<HelpPanel article="<id>" section="<id>" />`.

`src/tests/features/help/helpArticles.test.ts` fails on an English file
without an entry (or the reverse), a missing title key, a heading without
an id or a duplicate id, and a section linked from a `HelpPanel` that
doesn't exist in some locale.

Update `src/assets/help/changelog.md` when a release ships user-visible
changes: one `# <date> - v. <version>` heading per release (its anchor is
the version, `#0-36-0`).

## Tests

`src/tests/features/help/` (parser, registry and links, search,
sanitising, components) and `src/tests/views/Help*View.test.ts`.
