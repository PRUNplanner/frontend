# Architecture

## `src/` layout

| Path | What lives there |
| --- | --- |
| `main.ts` | Bootstrap (see below) |
| `AppProvider.vue` | naive-ui providers: `n-config-provider` (dark theme + `prunplannerTheme`), modal and dialog providers |
| `App.vue` | Shell. Shows `NavigationBar` when logged in and `HomepageHeader` otherwise, then `<Suspense><RouterView/></Suspense>` |
| `router/` | Flat route table (`index.ts`); typed meta in `router.d.ts` |
| `views/` | Route pages (`*View.vue`), plus `views/fio/` and `views/tools/` |
| `features/<name>/` | Feature code: composables, components and types. See [features/](features/README.md) |
| `stores/` | Global Pinia stores: `userStore`, `planningStore`, `userAlertsStore` |
| `lib/` | Infrastructure: `apiService.ts`, `config.ts`, `query_cache/`, `i18n/`, `analytics/`, `useVersionCheck.ts` |
| `database/` | IndexedDB game-data cache (`idb`): `schema.ts`, `stores.ts`, `composables/`, `services/` |
| `ui/` | In-house component kit (`P*` components, barrel `ui/index.ts`) and `ui/charts/` |
| `layout/` | Navigation, header, footer, progress indicators, the `v-click-outside` directive, naive-ui theme overrides |
| `locales/<locale>/*.json` | i18n messages, one file per namespace |
| `assets/help/<locale>/*.md` | Help drawer pages. `assets/help/changelog.md` is the changelog |
| `assets/static/` | Large static data, e.g. `fio_systemstars.json` for pathfinding |
| `util/` | Small pure helpers: `data.ts` (clone/redact), `numbers.ts`, `date.ts`, `text.ts`, `axiosSetup.ts` |
| `tests/` | Vitest suites mirroring `src/`, plus `test_data/` fixtures |
| `globals.d.ts`, `vite-env.d.ts` | Build-time globals (`__APP_VERSION__`, `__INDEXEDDB_VERSION__`, `window.__APP_CONFIG__`) and `VITE_*` env types |

## Bootstrap (`src/main.ts`)

`main.ts` runs these steps in order:

1. Import the CSS.
2. `createApp(AppProvider)`.
3. Install the router.
4. Install Pinia with `pinia-plugin-persistedstate`.
5. `await userStore.initLocale(...)`. This uses top-level await.
6. Install i18n.
7. `axiosSetup()`, which adds the auth interceptors.
8. Install unhead.
9. Install vue-showdown, which renders markdown.
10. Register the `v-click-outside` directive.
11. Mount the app.

## Routing (`src/router/index.ts`)

- Every route is lazy: `component: () => import("@/views/...")`. Views that
  take URL params use `props: true`.
- `meta.requiresAuth` sends logged-out users to `/` with
  `?redirectTo=<path>`.
- A logged-in user who hits `/` is redirected to `/empire`.
- `meta.showHeader: false` hides the public header (homepage, shared plans,
  auth flows).
- **Adding a page:**
  1. Create `views/XView.vue`.
  2. Add the route in `router/index.ts`.
  3. Add the navigation entry in `layout/components/NavigationBar.vue`.
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
and `/shared/:sharedPlanUuid`, which is read-only.

## Build & tooling notes

- **Alias.** `@` → `src/`, defined in `tsconfig.app.json`, `vite.config.ts`
  and `vitest.config.ts`.
- **Auto-imports.**
  - `AutoImport` (vue, vue-router, pinia) and `Components` (the naive-ui
    resolver, for `<n-*>` tags) are enabled in `vite.config.ts`.
  - The generated `auto-imports.d.ts` and `components.d.ts` are gitignored.
  - Code imports explicitly anyway. Keep it that way.
- **Build-time globals.**
  - `__INDEXEDDB_VERSION__` is derived from the app version. A version bump
    wipes and rebuilds the IndexedDB stores.
  - In tests it is `Date.now()`.
- **Runtime config.**
  - `src/lib/config.ts` reads `VITE_*` env vars, listed in the README.
  - The PostHog key comes from `window.__APP_CONFIG__`, injected at deploy
    time through `env.js` (see `netlify.toml` and `docker-compose.yaml`).
- **Deploy.**
  - Netlify builds previews and is configured as an SPA.
  - The Docker image (`Dockerfile`) serves `dist/` with `spa-to-http`.
  - `scripts/write-version.js` writes `dist/version.json`, which
    `lib/useVersionCheck.ts` polls so it can prompt for a reload.
