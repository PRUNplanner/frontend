# SEO and the prerendered landing page

Search engines, AI crawlers and link previews often don't run JavaScript.
For them, `/` is real HTML, the head names the game, and unknown or private
URLs stay out of the index.

## What is static (`index.html`)

- Title and description of the landing page, the canonical link to
  `https://prunplanner.org/`, `theme-color`, Open Graph and Twitter tags,
  and the share image (`public/images/og/prunplanner.jpg`, 1200 × 630).
- Two JSON-LD blocks: `WebSite` (the site name) and `WebApplication`. Its
  `inLanguage` lists the supported locales; a test compares it with
  `SupportedLanguages`. No ratings: there are none.
- An inline script that hides the prerendered page (`skip-prerender` on
  `<html>`) everywhere it doesn't belong: any path other than `/` (the
  server answers every path with this file), a stored session (sent on to
  `/empire`) and a stored locale other than English. The landing page never
  flashes there.
- `public/robots.txt` allows every crawler and names the sitemap.

## What `useHead` sets (`AppProvider.vue`)

- `titleTemplate`: a view's title plus "· PRUNplanner". Views set only their
  own title; the landing page keeps its full title (`titleTemplate: "%s"`).
- The description (`homepage.seo.description`), which a view may override
  (`/imprint-tos`, `/market`).
- Routes with `meta.indexable` (`/`, `/imprint-tos`, `/market`) get a
  canonical URL; every other route gets `<meta name="robots"
  content="noindex">`, including the not-found page (`NotFoundView`, the
  catch-all route).
- `<html lang>` follows the locale.

`lib/seo/prerenderMount.ts` removes the static description and canonical
before the app mounts, so there is only ever one of each.

## The prerender (`pnpm build`)

1. `vite build`: the app, as before.
2. `vite build --ssr src/prerender.ts --outDir .prerender`: a server build of
   the same app.
3. `node scripts/prerender.mjs`, with jsdom for the browser globals some
   modules read:
   - renders `/` logged out, in English, with the tours on their first step
     and the panel closed (`renderLanding`). No `onMounted` runs, so the
     prerender sends no events and makes no API calls;
   - writes it into `dist/index.html`: the markup in
     `<div id="app" data-prerendered>`, what its components teleport to
     `<body>` (confirm host, toast host, drawer) first in `<body>`, no
     `modulepreload` links, and the module entry replaced by a small loader
     (below);
   - writes `dist/sitemap.xml` from the indexable routes, dated with the build
     date, and the `.gz` / `.br` files of both;
   - checks the result (`lib/seo/checkLanding.ts`): the h1, the positioning
     line, the player count, every FAQ question and answer, the example plan
     and GitHub links, one title, description and canonical, the Open Graph
     tags, both JSON-LD blocks, robots and sitemap. Anything missing fails the
     build.

On load (`lib/seo/prerenderMount.ts`, used by `main.ts`):

- The loader in `index.html` starts the app's entry only after the page's
  first contentful paint (1 s fallback for a background tab), and only once
  the page is parsed, so `/env.js` has run. Where `skip-prerender` hides
  the page it starts at once: nothing paints. This keeps the text's paint
  (the LCP) free of the scripts.
- `main.ts` creates the app with `createSSRApp` over prerendered markup
  (`createApp` otherwise), waits for the route and the `HomepageHeader`
  chunk, and hydrates: the same elements stay, nothing repaints. The body
  teleports hydrate from `<body>`'s first child on, in render order;
  `HomepageHeader` must stay a `defineAsyncComponent` in `App.vue` for that
  order to match (a test checks the prerender's order).
- Any route other than the landing page (another path, or a stored session
  redirected to `/empire`), or a stored locale that isn't English: the
  landing markup and its teleports are removed and the app mounts fresh
  (nothing would match the prerender).
- Whatever depends on the browser (the analytics consent banner, the
  translation banner) shows only after mount, so the hydrated tree equals the
  prerender.

Don't use scoped CSS on the landing page: its chunk CSS isn't loaded before
the app is.

## Serving

The Docker image serves `dist/` with spa-to-http, which answers every path
that is no file with `index.html`, the prerendered landing page; Netlify
rewrites the same way. The app mounts the right page on the client (see
above). The cost: a crawler that doesn't run JavaScript gets the landing
page's HTML, title and canonical on every URL, also on `/market` and
`/imprint-tos`. Google renders JavaScript and gets each page's own title,
description, canonical or `noindex`. A server that can serve an empty shell
for the other paths would fix it. Every hard load of another path also
downloads the hidden landing HTML and its eager hero image.

## Updating

- **Counts** (players, plans): `PLAYER_COUNT` and `PLAN_COUNT` in
  `features/homepage/homepage.constants.ts`, and "6,000" in the description
  of `index.html` and `homepage.seo.description`.
- **Share image**: replace `public/images/og/prunplanner.jpg` (1200 × 630,
  under 300 kB). Its alt text is `og:image:alt` in `index.html`.
- **A new public page**: `meta: { indexable: true }` on its route, a title
  and description through `useHead`.
