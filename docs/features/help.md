# help

**Purpose.** The help centre: `/help` (home), `/help/:article` (one page per
article, section anchors), search, and the Help panel every page opens at
its article. Public and indexable (in the sitemap); the app renders every
page from the markdown the build parsed, no per-page files.

**Used by.** `HelpPanel` on 20 pages (plan, Plan check, empire, exchanges,
manage, planet search, profile, API keys, FIO burn/repair, every tool page
incl. the Market report); `HelpView` (`/help`) and `HelpArticleView`
(`/help/:article`).

**Content rule.** Help follows the code on `main`: every number, default,
limit and label in an article comes from the code (the 0.36.0 audit and its
review list: workspace `specs/assets/help-centre/audit.md`). A change to
user-visible behaviour updates its article in the same PR, but not its
version: feature PRs merge before their release is known. The release PR
(`chore(release): x.y.z`, the last PR of a release) bumps `package.json`,
adds the changelog entry and sets `updatedIn` to x.y.z for every article
changed since the previous release. `CHECKED` in `helpArticles.ts` is the
version for articles last checked as a whole; one article can carry its
own (`{ ...plan("plan_base", [...]), updatedIn: "0.37.0" }`).

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

Writing rules:

- `**bold**` only for exact `en_US` UI labels;
  `helpLabels.test.ts` checks every bold span against the locale strings
  (`{placeholders}` match anything; deliberate exceptions go on its
  allow list). Use *italic* for other emphasis.
- Glossary links: `[[id|text]]`, or `[[Text]]` when the text slugifies to
  the id, on a term's first use in an article. They render as
  `<a class="help-term">` to `/help/glossary#id`; `HelpTermPopover` shows the
  entry's first paragraph on hover, focus or a first tap. An unknown id
  fails the English build; in a translation it renders as text, so Crowdin
  can't break it. `[[x]](url)` stays an ordinary link (changelog PR links).
- `glossary.md`: one `## Term {#id}` per term, alphabetical, starting with
  one short plain paragraph (the popover text). `helpGlossary.ts` reads it.
- Guides (`guide_*`, area Start here, `GUIDES` in `helpArticles.ts`) are
  the home page's "Start here" cards; a card's text is
  `help.guides.<id>`.
- Style: "you", "10 %", "ȼ / day"; "exchange preference".
- Tone: write like an experienced player explaining the app to a
  corp-mate. Open with what the reader can do and why; full sentences with
  contractions and a named actor ("PRUNplanner counts…"), one idea per
  sentence; label-first lines only in tables and short reference lists.
  No filler words (seamless, robust, crucial, ensure, simply, just, "note
  that"), no hype, exclamation marks, em dashes or closing summaries.
- Explain, don't only describe: say why a setting matters, what a warning
  or empty state means and what to do, and give worked examples with
  recomputed numbers. Every statement is backed by the code or an
  owner-confirmed game fact; no recommendations the owner hasn't made.
  Screen-reader-only labels (a group's `aria-label`) aren't named: point
  to what's visible instead.

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
