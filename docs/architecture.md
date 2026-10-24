# Architecture

## `src/` layout

| Path | What lives there |
| --- | --- |
| `main.ts` | Bootstrap (see below) |
| `AppProvider.vue` | `App` plus the kit's `PConfirmHost` and `PToastHost` |
| `App.vue` | Shell. Shows the navigation when logged in (`layout/components/navigation/`: `AppSidebar` from `md`, collapsing to `SidebarRail`, and `MobileNavBar` with its sheets below) and `HomepageHeader` otherwise (with the login / registration panel), then `<main>` with `<Suspense><RouterView/></Suspense>` and `AppFooter` (not on the homepage, which has its own footer) |
| `router/` | Flat route table (`index.ts`); typed meta in `router.d.ts` |
| `views/` | Route pages (`*View.vue`), plus `views/fio/` and `views/tools/` |
| `features/<name>/` | Feature code: composables, components and types. See [features/](features/README.md) |
| `stores/` | Global Pinia stores: `userStore`, `planningStore`, `userAlertsStore` |
| `lib/` | Infrastructure: `apiService.ts`, `config.ts`, `query_cache/`, `i18n/`, `analytics/`, `useVersionCheck.ts` |
| `database/` | IndexedDB game-data cache (`idb`): `schema.ts`, `stores.ts`, `composables/`, `services/` |
| `ui/` | In-house component kit (`P*` components, barrel `ui/index.ts`) and `ui/charts/` |
| `layout/` | Navigation, header, footer, progress indicators |
| `locales/<locale>/*.json` | i18n messages, one file per namespace |
| `assets/help/<locale>/*.md` | Help drawer pages. `assets/help/changelog.md` is the changelog |
| `assets/static/` | Large static data, e.g. `fio_systemstars.json` for pathfinding |
| `util/` | Small pure helpers: `data.ts` (clone/redact), `numbers.ts`, `date.ts`, `text.ts`, `planetName.ts`, `axiosSetup.ts` |
| `tests/` | Vitest suites mirroring `src/`, plus `test_data/` fixtures |
| `globals.d.ts`, `vite-env.d.ts` | Build-time globals (`__APP_VERSION__`, `__INDEXEDDB_VERSION__`, `window.__APP_CONFIG__`) and `VITE_*` env types |

## Bootstrap (`src/main.ts`)

`main.ts` runs these steps in order:

1. Import the CSS.
2. `createApp(AppProvider)`, or `createSSRApp` over the prerendered landing
   page, which it then hydrates ([seo.md](seo.md)).
3. Install the router.
4. Install Pinia with `pinia-plugin-persistedstate`.
5. `await userStore.initLocale(...)`. This uses top-level await.
6. Install i18n.
7. Install unhead.
8. Install vue-showdown, which renders markdown.
9. Mount the app (`prepareMount` / `mountApp` in `lib/seo/prerenderMount.ts`,
    not awaited: lazy chunks import from `main.ts`, which has to finish
    evaluating first).

The auth interceptors (`axiosSetup()`) register with the API service when
it is created, so a visitor's first page doesn't load axios
([data-layer.md](data-layer.md)).

## Routing (`src/router/index.ts`)

- Every route is lazy: `component: () => import("@/views/...")`. Views that
  take URL params use `props: true`.
- `meta.requiresAuth` sends logged-out users to `/` with
  `?redirectTo=<path>`.
- A logged-in user who hits `/` is redirected to `/empire`.
- `meta.indexable` marks the pages search engines may index (`/`,
  `/imprint-tos`, `/market`): they get a canonical URL and are in the
  sitemap; every other route gets `noindex` (`AppProvider`, see
  [seo.md](seo.md)). An unknown path renders `NotFoundView`.
- Views set their title with `useHead({ title })`; `AppProvider`'s
  `titleTemplate` adds "· PRUNplanner".
- **Adding a page:**
  1. Create `views/XView.vue`.
  2. Add the route in `router/index.ts`.
  3. Add the navigation entry in `layout/components/navigation/useNavigation.ts`
     (sidebar, rail and phone sheets all read it).
  4. Add a locale namespace if the page needs new strings.

## The view pattern

Views are thin. A typical view (`EmpireView.vue`, `PlanLoadView.vue`) looks
like this:

```
<WrapperPlanningDataLoader …>                 ← plans / empires / CX from backend
  <WrapperGameDataLoader load-materials …>    ← game data into IndexedDB
    <FeatureComponent … />                    ← rendered once data is ready
```

The wrappers (`src/features/wrapper/`) run their loading steps through the
query cache and show progress: the step checklist appears only when loading
takes longer than 400 ms (`useDelay`), errors show at once, and
`RenderingProgress` waits 400 ms too, so cached pages open without a loading
screen. They emit `data:*` events and render their
slot inside `<Suspense>` once every step has finished, so views can `await`
data in `<script setup>`. Composables themselves are synchronous (see
AGENTS.md). Heavy children are loaded with `defineAsyncComponent`.

`PlanLoadView` loads the data and then renders `PlanView`, which is the
actual plan editor. The same pair serves `/plan/:planetNaturalId/:planUuid?`
and `/shared/:sharedPlanUuid`, which edits a working copy that is never
saved over the shared plan.

## Build & tooling notes

- **Alias.** `@` → `src/`, defined in `tsconfig.app.json`, `vite.config.ts`
  and `vitest.config.ts`.
- **Auto-imports.**
  - `AutoImport` (vue, vue-router, pinia) is enabled in `vite.config.ts`.
  - The generated `auto-imports.d.ts` is gitignored.
  - Code imports explicitly anyway. Keep it that way.
- **Build-time globals.**
  - `__INDEXEDDB_VERSION__` is derived from the app version. A version bump
    wipes and rebuilds the IndexedDB stores.
  - In tests it is `Date.now()`.
- **Runtime config.**
  - `src/lib/config.ts` reads `VITE_*` env vars, listed in the README.
  - PostHog (`lib/analytics/`) is loaded only after the user consents
    (`useAnalyticsConsent`, asked once by `AnalyticsConsentDialog`, changed
    in Profile); without consent nothing is stored or sent.
  - Component errors reach PostHog through `app.config.errorHandler`
    (`trackVueError`, set in `main.ts`); `router.afterEach` registers
    `route_name` on every event and exception.
  - The PostHog key comes from `window.__APP_CONFIG__`, injected at deploy
    time through `env.js`, written by `docker-compose.yaml` or by the
    Cloudflare Pages build command (set in the dashboard, with `POSTHOG_KEY`
    as an environment variable):
    `pnpm run build && echo "window.__APP_CONFIG__ = { POSTHOG_KEY: '${POSTHOG_KEY}' };" > dist/env.js`.
- **Deploy.**
  - Production runs the Docker image (`Dockerfile`, `dist/` served by
    `spa-to-http`) on Hetzner.
  - Cloudflare Pages builds the pull request previews, configured in its
    dashboard. With no top-level `404.html` it falls back to `index.html`
    (SPA); headers are in `public/_headers`.
  - `pnpm build` also prerenders `/` into `dist/index.html`
    ([seo.md](seo.md)).
  - On Pages builds (`CF_PAGES`) `vite.config.ts` skips the `.gz`/`.br`
    files (Pages compresses itself, only `spa-to-http` serves them) and the
    sourcemaps.
  - The `buildVersion` plugin in `vite.config.ts` writes `dist/version.json`
    with the build ID (`BUILD_REVISION`, the commit) that is also baked into
    the bundle as `__BUILD_ID__`; `lib/useVersionCheck.ts` compares the two.
