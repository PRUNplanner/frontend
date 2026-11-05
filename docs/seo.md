# SEO and the prerendered landing page

Crawlers and link previews often don't run JavaScript. For them `/` is real
HTML, the head names the game, and unknown or private URLs stay out of the
index.

## Static head (`index.html`)

- Landing title and description, canonical `https://prunplanner.org/`,
  `theme-color`, Open Graph / Twitter tags and the share image
  (`public/images/og/prunplanner.jpg`, 1200 × 630).
- JSON-LD `WebSite` and `WebApplication`; its `inLanguage` must match
  `SupportedLanguages` (`checkLanding.test.ts`).
- An inline script adds `skip-prerender` to `<html>` wherever the
  prerendered page doesn't belong: any path other than `/` (the server
  answers every path with this file), a stored session, or a stored
  non-English locale. That hides it with `display: none`, so it fetches
  none of its fonts or images (all of them are lazy). Where it shows, the
  script preloads the hero image with the same `srcset`/`sizes` as its
  `img` in `HomepageTour.vue` (keep them in step).
- `public/robots.txt` allows all crawlers and names the sitemap.

## `useHead` (`AppProvider.vue`)

- `titleTemplate` appends "· PRUNplanner"; the landing page sets
  `titleTemplate: "%s"` for its full title.
- Description `homepage.seo.description`; views may override it
  (`/imprint-tos`, `/market`, `/search`).
- Routes with `meta.indexable` (`/`, `/imprint-tos`, `/market`, `/search`)
  get a canonical URL; all others, including `NotFoundView`, get
  `robots: noindex`.
- `<html lang>` follows the locale.

`prepareMount` (`lib/seo/prerenderMount.ts`) removes the static
description and canonical before mount, so there is only one of each.

## The prerender (`pnpm build`)

1. `vite build`.
2. `vite build --ssr src/prerender.ts --outDir .prerender`.
3. `node scripts/prerender.mjs` (jsdom provides browser globals):
   - `renderLanding` renders `/` logged out, in English, tours on their
     first step, panel closed. No `onMounted` runs, so no events or API
     calls;
   - `injectLanding` writes `dist/index.html`: markup in
     `<div id="app" data-prerendered>`, body teleports (confirm host, toast
     host, drawer) first in `<body>`, no `modulepreload` links, and the
     module entry replaced by a loader that starts it after the first
     contentful paint (1 s fallback; at once under `skip-prerender`), once
     the page is parsed so `/env.js` has run;
   - writes `dist/sitemap.xml` from the indexable routes, plus `.gz`/`.br`
     of both files;
   - `checkLanding` (`lib/seo/checkLanding.ts`) fails the build if the h1,
     positioning line, player count, FAQ, example plan / GitHub links,
     single title/description/canonical, OG tags, JSON-LD, robots or
     sitemap are missing.

## On load (`main.ts`, `lib/seo/prerenderMount.ts`)

- Over prerendered markup the app is created with `createSSRApp`, waits
  for the route and the `HomepageHeader` chunk, and hydrates (nothing
  repaints). Body teleports hydrate from `<body>`'s first child in render
  order, so **`HomepageHeader` must stay a `defineAsyncComponent` in
  `App.vue`**.
- Any other route (another path, a stored session sent to `/empire`) or a
  non-English locale: the landing markup and its teleports are removed and
  the app mounts fresh; `App.vue` then uses the header `prepareMount`
  already loaded, so it is in the first frame.
- Browser-dependent UI (analytics consent banner, translation banner)
  appears only after mount, so the hydrated tree equals the prerender.
- **No scoped CSS on the landing page**: its chunk CSS isn't loaded before
  the app.

## Serving

spa-to-http (Docker) and Cloudflare Pages (as long as `dist/` has no
top-level `404.html`) answer every non-file path with `index.html`. The
cost: a crawler without JavaScript sees the landing page's HTML, title and
canonical on every URL; Google renders JS and gets each page's own head.
Every hard load of another path also downloads the hidden landing HTML
(but none of its images or fonts).

## Updating

- **Counts**: `PLAYER_COUNT` / `PLAN_COUNT` in
  `features/homepage/homepage.constants.ts`; "6,000" in the three
  descriptions of `index.html` (`description`, `og:description`,
  `WebApplication`) and in `homepage.seo.description`; "6,000+" in
  `lib/seo/checkLanding.ts`.
- **Share image**: replace `public/images/og/prunplanner.jpg` (1200 × 630,
  under 300 kB); alt text is `og:image:alt` in `index.html`.
- **New public page**: `meta: { indexable: true }` on its route, title and
  description via `useHead`.
