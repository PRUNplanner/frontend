# Browser security

What keeps foreign script out of the page, and the headers the server in
front of `spa-to-http` should send. `spa-to-http` itself sends none.

## Help markdown

Help pages (`src/assets/help/<locale>/`) are Crowdin translations, merged
from bot PRs. They are parsed at build time (`vite.help.ts`,
`features/help/helpMarkdown.ts`): markdown-it with raw HTML off (it comes
out as text) and its link check (no `javascript:`), then DOMPurify on jsdom
with `HELP_PURIFY_CONFIG`. On the client `HelpArticle` and the help home run
`sanitizeHelpHtml` (`features/help/sanitizeHelp.ts`) again before `v-html`,
so script, event handlers, `<style>` and `javascript:` links never reach
the DOM. `src/tests/features/help/sanitizeHelp.test.ts` checks a hostile
fixture at build and on the client and every built help file, and fails on
a help file with raw HTML or a link target other than `https:`, `http:`,
`/` or `#`. Autolinks (`<https://…>`) count as raw HTML there: write
`[text](url)`. Only `> [!tip]` and `> [!warning]` are directives; a
translation can't add others.

## Redirects

Only paths on this site: login honours `?redirectTo=` when it starts with a
single `/` (not `//host` or `/\host`), else `/empire`; `reloadOnce`
(`lib/chunkReload.ts`) assigns only same-origin URLs.

## Headers (draft, not deployed)

Roll out as `Content-Security-Policy-Report-Only` first, then enforce:

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'sha256-4VVhsDrfr6mCP6LTxhBTHgID6wXoxtjxKTuZApEOWus=' 'sha256-qGfboBC4zQTYouMnJL5r/frTpqNBOihr+YI4LaEq+jY=' https://squirrel.prunplanner.org;
  connect-src 'self' https://api.prunplanner.org https://squirrel.prunplanner.org;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
```

- `script-src` hashes: the skip-prerender script in `index.html` and the
  prerender's entry loader (`START_AFTER_PAINT` in `src/prerender.ts`; the
  entry file is its `data-entry` attribute, so the hash doesn't change per
  build). JSON-LD blocks are data and need none. `/env.js` is `'self'`.
  Editing either script changes its hash: `src/tests/security.test.ts`
  fails until this page lists the new one.
- `squirrel.prunplanner.org` is the PostHog proxy (`api_host` in
  `usePostHog.ts`): events, and the scripts posthog-js loads from it
  (session recording) after consent.
- `connect-src` names the production API; a deployment with another
  `VITE_API_BASE_URL` puts that origin there.
- `style-src 'unsafe-inline'`: the prerendered landing page carries
  `style` attributes.
- `font-src data:`: the built CSS inlines the small woff/woff2 subsets
  (under Vite's 4 KB inline limit).
- Expected report: `script-src` `eval` from the `schemas` chunk. Zod probes
  `new Function` for its JIT parser; enforced, the probe fails and zod
  parses without JIT, about 10× slower on large game data (planet search
  index ~3–8 ms → ~60 ms, 2026-11-03). Before enforcing, choose between
  `'unsafe-eval'` and `z.config({ jitless: true })` at startup (no probe,
  no report, the slower parse).

Where the production headers are set (an edge in front of `spa-to-http`)
is still open; enforcing the policy is an infrastructure change.
