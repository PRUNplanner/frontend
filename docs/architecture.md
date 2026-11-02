# Architecture

## `src/` layout

| Path | What lives there |
| --- | --- |
| `main.ts` | Bootstrap (below) |
| `AppProvider.vue` | `App` plus the kit's `PConfirmHost` and `PToastHost` (with `VersionUpdateNotice`), and the site-wide `useHead` ([seo.md](seo.md)) |
| `App.vue` | Shell: navigation (`layout/components/navigation/`) when logged in, `HomepageHeader` otherwise, then `<Suspense><RouterView/></Suspense>` and `AppFooter`; analytics consent dialog/banner |
| `prerender.ts` | Server entry of the build-time prerender of `/` ([seo.md](seo.md)) |
| `router/` | Flat route table (`index.ts`); typed meta in `router.d.ts` |
| `views/` | Route pages (`*View.vue`), plus `fio/`, `tools/` and `dev/` (the kit page) |
| `features/<name>/` | Feature code, see [features/](features/README.md) |
| `stores/` | Global Pinia stores: `userStore`, `planningStore`, `userAlertsStore` |
| `lib/` | Infrastructure: `apiService.ts`, `config.ts`, `query_cache/`, `i18n/`, `analytics/`, `seo/`, `perf/`, `crossTab.ts`, `chunkReload.ts`, `debugMode.ts`, `useVersionCheck.ts` |
| `database/` | IndexedDB game-data cache (`idb`), see [data-layer.md](data-layer.md) §4 |
| `ui/` | In-house component kit (`P*`, barrel `ui/index.ts`) and `ui/charts/` |
| `layout/` | Navigation, header, footer, progress indicators |
| `locales/<locale>/*.json` | i18n messages, one file per namespace |
| `assets/help/<locale>/*.md` | Help drawer pages; `assets/help/changelog.md` is the changelog |
| `assets/static/` | Large static data, e.g. `fio_systemstars.json` for pathfinding |
| `util/` | Small pure helpers (`data.ts` clone/redact, `numbers.ts`, `date.ts`, `planetName.ts`, …) and `axiosSetup.ts` (auth interceptors) |
| `tests/` | Vitest suites mirroring `src/`, plus `test_data/` fixtures |
| `globals.d.ts`, `vite-env.d.ts` | Build-time globals (`__APP_VERSION__`, `__BUILD_ID__`, `__INDEXEDDB_VERSION__`, `window.__APP_CONFIG__`) and `VITE_*` env types |

## Bootstrap (`src/main.ts`)

1. Import the fonts and the CSS.
2. `createSSRApp(AppProvider)` over the prerendered landing page
   (hydrated, [seo.md](seo.md)), else `createApp`. `app.config.errorHandler`
   is `trackVueError`.
3. Router, then `registerChunkReload` (reloads once when a deploy removed a
   lazy chunk) and `registerCrossTab` ([data-layer.md](data-layer.md) §6).
4. Pinia with `pinia-plugin-persistedstate`, then `startPreferenceSync()`.
5. i18n, then unhead.
6. `userStore.initLocale()` → `prepareMount()` → `mountApp()`
   (`lib/seo/prerenderMount.ts`). This chain is **not awaited**: lazy chunks
   import from `main.ts`, which must finish evaluating first.

vue-showdown isn't installed globally: `HelpView` and `HelpDrawer` import
`VueShowdown` themselves. The auth interceptors register when `apiService`
is created, so a visitor's first page doesn't load axios.

## Routing (`src/router/index.ts`)

- Every route is lazy (`component: () => import(...)`); views that take URL
  params use `props: true`.
- `meta.requiresAuth` sends logged-out users to `/?redirectTo=<path>`; a
  logged-in user on `/` goes to `/empire`.
- `meta.indexable` marks the pages search engines may index; all others get
  `noindex` ([seo.md](seo.md)). Unknown paths render `NotFoundView`.
- `/dev/kit` exists only on the dev server and in builds with
  `VITE_KIT_PAGE=true`.
- `?debug=calc|off` on any route toggles `lib/debugMode.ts` and is dropped
  from the URL.
- `afterEach` records the page view and registers `route_name` on later
  analytics events and client error reports.
- Views set their title with `useHead({ title })`; `AppProvider` appends
  "· PRUNplanner".
- **Adding a page:** create `views/XView.vue`, add the route, add the nav
  entry in `layout/components/navigation/useNavigation.ts` (sidebar, rail
  and phone sheets all read it), and a locale namespace if needed.

## The view pattern

Views are thin (`EmpireView.vue`, `PlanLoadView.vue`):

```
<WrapperPlanningDataLoader …>                 ← plans / empires / CX from backend
  <WrapperGameDataLoader load-materials …>    ← game data into IndexedDB
    <FeatureComponent … />                    ← rendered once data is ready
```

The wrappers (`src/features/wrapper/`, see
[features/wrapper.md](features/wrapper.md)) run their steps through the
query cache, emit `data:*` events and render their slot inside
`<Suspense>` once every step has finished, so views may `await` in
`<script setup>`. The step checklist (and `RenderingProgress`) appears only
after 400 ms (`useDelay`), so cached pages open without a loading screen;
errors show at once.

`PlanLoadView` loads data, then renders the editor `PlanView`. The pair
serves `/plan/:planetNaturalId/:planUuid?` and `/shared/:sharedPlanUuid`
(a working copy that never saves over the shared plan; an owner opening
their own share link is sent to `/plan/…`).

## Build & tooling notes

- **Alias** `@` → `src/` in `tsconfig.app.json`, `vite.config.ts` and
  `vitest.config.ts`.
- **`__INDEXEDDB_VERSION__`** is derived from `dbVersion` in `package.json`
  (not the app `version`). Bumping it wipes and rebuilds the IndexedDB
  stores. In tests it is `Date.now()`.
- **Runtime config.** `lib/config.ts` reads the `VITE_*` env vars (listed in
  the README). The PostHog key comes from `window.__APP_CONFIG__`, set by an
  `/env.js` the deploy writes (see `docker-compose.yaml`); PostHog loads
  only after consent ([analytics.md](analytics.md)).
- **Deploy.** The Docker image serves `dist/` with `spa-to-http`; Cloudflare
  Pages builds PR previews (headers in `public/_headers`). On Pages
  (`CF_PAGES`) `vite.config.ts` skips the `.gz`/`.br` files and sourcemaps.
  `pnpm build` also prerenders `/` ([seo.md](seo.md)).
- **Version check.** The `buildVersion` plugin writes `dist/version.json`
  with the build ID (`BUILD_REVISION`, else `CF_PAGES_COMMIT_SHA`, else the
  build time), also baked in as `__BUILD_ID__`; `lib/useVersionCheck.ts`
  compares the two to show the update notice.
