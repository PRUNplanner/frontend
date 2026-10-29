# Data layer

Data moves through four layers:

```
component / composable
  └─ useQuery("Name", params).execute()          src/lib/query_cache/useQuery.ts
       └─ queryStore.execute  (TTL, dedup, cache; mutations bypass it)  src/lib/query_cache/queryStore.ts
            └─ definition.fetchFn                 src/lib/query_cache/queries/*.queries.ts
                 ├─ call*()  → apiService (axios + Zod)   src/features/api/*.api.ts
                 └─ side effects: write IndexedDB / planningStore / invalidate keys
```

## 1. HTTP: `apiService` (`src/lib/apiService.ts`)

- `apiService` is a singleton that wraps the **global** axios instance.
  `apiService.client` is public so tests can attach `axios-mock-adapter`.
  `baseURL` comes from `config.API_BASE_URL`.
- **Request ids and timeout:** every API call (other origins excepted)
  gets an `X-Request-ID` and an `X-Correlation-ID` (the PostHog session
  id, else a per-tab id; `src/lib/requestIds.ts`), and fails after 30 s
  (`API_TIMEOUT_MS`). A timeout is a network error (`status` undefined),
  so the query cache retries it like any transient failure.
- **Request methods and validation:**
  - `get(path, responseSchema)` validates the response.
  - `post`, `put` and `patch` take `(path, payload, requestSchema,
    responseSchema)`. They validate the payload before sending and the
    response after.
  - `post` also has an `asForm` flag for multipart.
  - `delete` does no validation.
- **Errors go through `normalizeError`:**
  - a `ZodError` becomes `Error("Validation error: …")`;
  - an axios error becomes an `Error` whose message is the JSON response
    body, with `.status` and `.responseData` attached, and for a 429
    `.retryAfter` (seconds, the `Retry-After` header).
  - it also reports to PostHog error tracking (`trackException`, only
    with consent): `ApiValidationError` (field names and issue codes,
    never values, record keys or indices), `ApiServerError` (5xx), `ApiNetworkError` (no response) and
    `ApiClientError` (429). Other 4xx (including the 401 of an expired
    refresh token) and discarded responses are not reported. Paths are sent as templates
    (`src/util/pathTemplate.ts`: `/planning/plan/:uuid/`).
  - A payload that fails its own request schema (nothing was sent) is
    `ApiRequestValidationError`. A network error is skipped while the
    browser is offline, and for a read (GET, or a read sent as POST)
    until the same path fails again within 10 min.
  - Response validation, 5xx and network errors also go to the backend
    (`reportClientError` in `src/lib/clientErrors.ts`, `POST
    /client-errors/`, logged to Axiom): from every user regardless of
    consent, production builds only, never through `apiService`.
- **Auth** is handled in `src/util/axiosSetup.ts`, which `ApiService`
  registers once when it is created (before the first request):
  - A request interceptor adds `Authorization: Bearer <userStore.accessToken>`.
  - On a 401 response, it calls `userStore.performTokenRefresh()` and retries
    once. A replay that gets a 401 again is not refreshed again: it is
    rejected (or, on a public page after a logout, asked once more without
    the token).
  - Parallel 401s share one refresh. If the backend refuses it (a 4xx,
    including a 401 from `/user/refresh/` itself), it calls `logout()`. A
    route with `meta.requiresAuth` then goes to `/`; a public route (a
    shared plan) stays, and the failed request is sent once more without
    the token. A refresh without an answer (network, timeout, 5xx) keeps
    the session; the next 401 tries again.
  - `logout()` resets the user, planning and query stores and PostHog. The
    next login loads its own profile and preferences again.
  - A response to a request sent logged in, in a session that has since
    ended (the refresh token changed), is discarded as a `CanceledError`.
    It never triggers a token refresh or logout, and it can't leak into
    the next user's stores. A pending preference sync is dropped the same
    way.

## 2. Endpoints & schemas (`src/features/api/`)

- There is one file per domain: `gameData.api.ts`, `planData.api.ts`,
  `empireData.api.ts`, `cxData.api.ts`, `sharingData.api.ts`,
  `userData.api.ts`, `analyticsData.api.ts` and `apiKeysData.api.ts`.
- Each export is a small `call*()` function that makes a single
  `apiService` call.
- Schemas live in `schemas/<domain>.schemas.ts` and are the **single source
  of truth** for every shape that crosses the wire. Each named shape is a
  schema plus its derived type, side by side:

  ```ts
  export const SharedSchema = z.object({ uuid: z.uuid(), plan: z.uuid() });
  export type Shared = z.infer<typeof SharedSchema>;

  export const SharedCreatePayloadSchema = SharedSchema.pick({ plan: true });
  ```

  - Don't annotate schemas as `z.ZodType<…>`: it hides the concrete type
    and blocks `.extend/.pick/.omit/.partial/.shape`. Only a recursive
    schema may keep one, with a comment saying why.
  - Derive related shapes from each other instead of repeating fields.
  - Export a type only when something uses it by name. Callers write
    `Shared[]`, so there are no array aliases.
  - Responses use `z.infer` (the parsed output). Where a caller builds a
    payload and the schema coerces or transforms, use `z.input<typeof …>`.
  - Enums are a `z.enum([...])` with the union type derived from it.
  - A shape only one feature reads keeps its schema in that feature's
    `*.schemas.ts` (the CX SSE stream, market exploration), as does data
    read back from localStorage (saved planet searches, the last
    production chain).
- `apiService` infers its types from the schemas:
  `get(path, schema)` returns `z.output<typeof schema>`, and
  `post/put/patch` type the payload as `z.input` of the request schema. Don't
  pass explicit type arguments.
- Shapes that never cross a runtime boundary (engine results, UI state,
  query cache) are plain TypeScript in the feature's `*.types.ts`. See
  "Types" in [AGENTS.md](../AGENTS.md).

## 3. Query cache (`src/lib/query_cache/`)

**Who holds the data.**
- The **query cache** tracks freshness and dedupes requests. For planning
  data its entry is in practice a "loaded and fresh" marker.
- **`planningStore`** is the read model for plans, empires, CX, shared plans
  and FIO storage: persisted, and hydrated before the cache knows anything.
  The planning `fetchFn`s write it; components read it.
- **`useDB` / IndexedDB** is the read model for game data (§4).
- A cache hit doesn't re-run `fetchFn`, so its side effects (store writes,
  IndexedDB writes, seeding) happen once per fetch.
- Objects in `planningStore` and in cache entries are **read-only**. Editors
  work on `getPlan` / `getCX` clones. `setPlan` stores the object the
  `GetPlan` entry holds (shared reference, no extra clone); empires, CX and
  shared plans are stored as `inertClone`s.

- **`queryRepository.ts`** is the single catalogue of every backend
  interaction: `GetMaterials`, `GetPlan`, `PatchEmpire`, `CreateCX` and so
  on. It merges the definitions in `queries/`, which are split by domain
  (`gameData`, `planning`, `user`). A read is wrapped in `defineQuery()`,
  a write in `defineMutation()` (below). A read has:
  - `key(params)`: a JSON array such as `["planningdata", "plan", uuid]`.
    Object keys are sorted by `toCacheKey`.
  - `fetchFn(params)`: calls `call*()`, then performs side effects. It
    writes to IndexedDB or `planningStore` (`storeAndPreload`), seeds
    sibling cache entries (`addCacheState(name, params, data)`), or
    invalidates related keys (`invalidate(...prefixes)`). A cached query's
    `fetchFn` must let errors throw. If it returns `[]` or `false` on
    failure, that value is cached as fresh data, so loaders report success
    and later calculations fail (for example "Planet … not available").
  - `expireTime` (ms, optional), `autoRefetch` (default `false`) and
    `cache`. `cache: false` drops the result after the call (still deduped
    while in flight), for reads that must not be cached
    (`GetPreferences`, `GetAPIKeys`).
  - `initialData` (optional): a persisted copy for an entry's first read,
    `{ data, fetchedAt } | null`. Skipped by `forceRefetch` and once the
    entry has data; a copy already past `expireTime` is returned and
    refetched in the background (§4, the game data lists;
    `GetMarketSummary` reads localStorage).
- **Mutations** (`defineMutation({ fetchFn })`) have only a `fetchFn`: no
  key, `expireTime`, `autoRefetch` or `cache`. `execute` runs them outside
  the cache: no entry, no in-flight slot, no dedupe (two calls send two
  requests), so no invalidation or refetch can see or re-run one. Errors
  are logged and rethrown. They keep their name in the catalogue, so callers
  use `useQuery("PatchPlan", params).execute()` like any read; `state` is
  always `undefined`.
- **Types come from the definitions.** Annotate `fetchFn`'s params and
  return type; `key`'s params are inferred from it. Annotate the return
  type even when it looks inferable: a body that touches the query store
  would make the inference circular. `IQueryRepository` is
  `typeof queryRepository`, and `QueryParams<"Name">` /
  `QueryData<"Name">` (`queryRepository.types.ts`) read a query's types.
  There is nothing to register by hand.
- **`queryStore.ts`** is a Pinia store and is **not** persisted.
  - `execute(name, params, { forceRefetch })` returns cached data while it is
    fresh, and dedupes concurrent calls through an in-flight map. A cache
    hit writes nothing, so it triggers no `computed` or watcher; an entry's
    `definitionName` and `expireTime` are set once, when it is created.
  - **Freshness** has one rule, `isFresh(entry)`: an entry without
    `expireTime` never expires, else it is fresh for `expireTime` after its
    last successful fetch (`timestamp`). `execute` and `peekQueryState`
    both use it.
    A request that was replaced (forced refetch) or dropped
    (`invalidateKey`, `$reset` on logout) no longer writes to the cache
    when it settles.
  - `cacheState` and its entries are `shallowReactive`: an entry's fields
    (`loading`, `data`, `timestamp`, …) are tracked, but `data` is the raw
    fetch result. A cache hit returns the same object the fetch returned,
    so change cached data only by replacing it (refetch, `invalidateKey`),
    never in place.
  - `invalidateKey(key, { exact, forceRefetch, skipRefetch })` deletes
    either the exact key or every key that the given key is a subset of. It
    refetches when `autoRefetch` is set or `forceRefetch` is passed.
    Mutations use `exact: false` on a prefix such as `["planningdata",
    "empire"]` to refresh a whole family.
  - A 10s interval refetches expired `autoRefetch` entries and evicts the
    other expired ones. It pauses while the user is idle (`userActivity`, see
    [features/user_activity.md](features/user_activity.md)).
    An `autoRefetch` entry whose fetch failed transiently (network error or
    5xx, `isTransientError`) is retried one `expireTime` after the failure,
    after a 429 once its `retryAfter` passed; any other error stops its
    refresh.
  - **Fetch budget** (`queryLoopGuard`), the guard against request loops:
    more than 5 network fetches of one key within 10 s block that key's
    fetches for 30 s. Cache hits, deduped calls and mutations don't count.
    While blocked, `execute` returns the entry's last data, or rejects with
    `QueryLoopError` (no status, so never retried) when it has none. The
    first block per key and tab sends a `query_loop` client error with the
    query's name, so a loop shows up in Axiom by name.
    Batched families are declared as data in `queryBatches.ts`
    (`batchRefresh`): expired `GetPlanet` entries are refetched together in
    one `GetMultiplePlanets` request (or taken from an expiring multiple
    query that covers them); a planet missing from the result gets an
    `error`. A new family is a new entry there, not a store change.
- **`useQuery(name, params)`** is the caller API. Use `.execute()`.
  `params` is required exactly when the query takes them, so
  `useQuery("GetMaterials")` has none and `useQuery("GetPlan")` without
  params is a type error. It returns `execute` and `state`, a `computed`
  of the fresh cache entry (`peekQueryState`), `undefined` while there is
  none or it is stale, and always for a mutation.
- The `/debug` route (`views/QueryCacheView.vue`) shows the live cache.

### Adding a backend call

1. Add a Zod schema to `src/features/api/schemas/<domain>.schemas.ts`, and
   next to it `export type Thing = z.infer<typeof ThingSchema>` if the shape
   is used by name. Reuse or derive from existing schemas where the shapes
   overlap. Don't write a separate interface.
2. Add a `call*()` function to `src/features/api/<domain>.api.ts` that uses
   `apiService` without explicit type arguments, returning
   `Promise<Thing>` (or `Promise<Thing[]>`).
3. Add a `defineQuery({...})` for a read, or a `defineMutation({ fetchFn })`
   for a write, to the matching `queries/<domain>.queries.ts`. For a read,
   choose a key under an existing prefix. Annotate `fetchFn`'s params and
   return type with the derived types (`import type`); a mutation's
   `fetchFn` invalidates the affected key families.
4. Call it with `useQuery("YourName", params).execute()`.
5. Add a test with `axios-mock-adapter`. For a pattern, see
   `src/tests/features/api/*.api.test.ts` and
   [testing.md](testing.md).

## 4. Game data in IndexedDB (`src/database/`)

- **Schema and stores.**
  - `schema.ts` defines the object stores `gamedata_materials` (keyed by
    `ticker`), `gamedata_buildings` (`building_ticker`), `gamedata_recipes`
    (`recipe_id`), `gamedata_exchanges` (`ticker_id`) and
    `gamedata_planets` (`planet_natural_id`), plus `gamedata_meta` (`store`):
    one `{ store, fetchedAt, rows }` row per full game data list, see
    Freshness.
  - When the DB version (`__INDEXEDDB_VERSION__`) changes, the upgrade
    handler **deletes and recreates every store**. Schema changes therefore
    only need a version bump.
- **`composables/useIndexedDBStore.ts`** provides `getDB`, typed CRUD
  (`get`, `getAll`, `set`, `setMany(items, wipe)`, `remove`) and
  `statistics`. The typed handles live in `stores.ts`.
- **`composables/useDB.ts`** adds a module-level in-memory layer on top of a
  store. The state is shared across every caller. `preload(force)` loads
  `allData`, and `get(key)` checks the map first and falls back to the DB.
  `getLoaded(key)` reads the map synchronously and throws if the store was
  never preloaded; the planning engine and `PriceBook` rely on it. After
  writing to IndexedDB, call `preload(true)` or synchronous readers won't see
  the new rows (the planet queries do this through `storeAndPreload`; the
  game data lists `fill` memory themselves, see Freshness).
  `allData` is a `shallowRef` of raw rows: assign a new array, never mutate
  it in place, or computeds over it won't update.
  `fill(rows, replace)` loads rows into memory without the DB; `storeAndPreload`
  falls back to it when IndexedDB fails (connection closed, quota), so a
  broken cache never fails a query. `getDB` reopens after the browser closes
  the connection; on an `InvalidStateError` or `UnknownError` (a connection
  lost without a `close` event) `storeAndPreload` calls `dropDB` so the next
  `getDB` reopens it.
- **Upgrades with several tabs open.** Every release bumps the DB version.
  When a newer tab opens it, the older tab's `blocking` handler closes its
  connection, marks the app outdated (`useVersionCheck().markOutdated()`
  shows the update notification) and never reopens the old version:
  `getDB` throws, and the tab keeps working from its in-memory layer. A tab
  of a release without that handler keeps the upgrade waiting; the new tab
  sets `dbBlocked` and `App.vue` asks to close or reload the other tabs.
- **`services/`** is the API consumers should use:

  | Service | Provides |
  | --- | --- |
  | `useMaterialData()` | `getMaterial`, `materialsMap`, `materialSelectOptions`, `getMaterialClass` (CSS category) |
  | `useBuildingData()` | `getBuilding`, `buildingsMap`, recipes per building, production building options, construction/workforce materials |
  | `useExchangeData()` | `getExchangeTicker`, `getExchangeTickerLoaded` (sync), VWAP analysis, `getMaterialExchangeOverview` |
  | `usePlanetData()` | `getPlanet`, planet names (`loadPlanetNames`, sync `planetName(id)` for templates, cached in the `planetNames` Map; formatted by `planetLabel` from `util/planetName.ts`), special materials |

- **Freshness.**
  - Their TTL comes from `config.GAME_DATA_STALE_MINUTES_*`: materials,
    buildings and recipes default to 1440 min, planets to 180 min and
    exchanges to 30 min.
  - **IndexedDB first** (`GetMaterials`, `GetExchanges`, `GetBuildings`,
    `GetRecipes`, `gameDataQuery`): a tab's first read is the definition's
    `initialData` hook. `readGameData` reads the store's `gamedata_meta`
    row; if it exists and is at most `config.GAME_DATA_MAX_AGE_MINUTES_*`
    old (exchanges 30 min, the rest 7 days) the rows are preloaded and, if
    their count matches the meta row, returned with the entry's timestamp
    set to `fetchedAt`. Already past
    the TTL (materials 1–7 days old), the query store refetches it in the
    background at once. No meta row, too old or an IndexedDB error: the
    query waits for the API as before. Exchange prices older than 30
    minutes are therefore never shown. Invalidating such an entry (e.g. the
    query cache debug view) reads the IndexedDB copy again; `forceRefetch`
    always fetches.
  - **Writing:** a fetch fills the in-memory layer (`useDB(store).fill`)
    and returns; `persistGameData` writes IndexedDB in the background
    (`whenIdle`: `config.GAME_DATA_WRITE_DELAY_MS`, 5 s, after the fetch
    and then on an idle main thread, as cloning the rows would compete with
    the page loading; a tab closed before that just fetches next time), in
    one transaction over the store and `gamedata_meta` (meta deleted, rows
    replaced, meta written last). A write cut off halfway leaves no meta
    row, and a store without one is never read. Failures only log (and
    `dropDB` on a dead connection).
  - Planets (`GetPlanet`, `GetMultiplePlanets`, searches) still write and
    preload through `storeAndPreload`, and always fetch.
  - Timing: each phase is a `performance.measure`
    (`gamedata:<store>:idb-read|fetch|fill|idb-write`), and the first load
    per store and tab is sent as `perf:gamedata_load`
    ([analytics.md](analytics.md)). The loaders add `loader:game` and
    `loader:planning` (mount to all loaded).
  - `WrapperGameDataLoader` triggers these queries. See
    [features/wrapper.md](features/wrapper.md).

**End-to-end example (materials):**

1. `<WrapperGameDataLoader load-materials>` (`useGameDataLoader`) runs
   `queryStore.execute("GetMaterials")`.
2. The entry has no data: `initialData` reads IndexedDB. A fresh copy is
   returned and the steps below are skipped.
3. Otherwise `callDataMaterials()` does
   `apiService.get("/data/materials/", MaterialPayloadSchema)`.
4. The result goes to `useDB(materialsStore).fill(data, true)` and is
   returned; `persistGameData` writes it to IndexedDB afterwards.
5. Components read it through `useMaterialData().getMaterial("DW")`.

## 5. Pinia stores (`src/stores/`)

The stores are setup-style. Persistence uses `pinia-plugin-persistedstate`
(localStorage) with `persist.pick`. The user and planning stores write
through `lib/persistStorage.ts`: a failed write (quota full) keeps the
stored value and is reported once per key, and §6 can stop it.

| Store (`id`) | Holds | Persisted keys |
| --- | --- | --- |
| `useUserStore` (`prunplanner_user`) | Tokens, profile, preferences (incl. per-plan overrides), locale. Actions: login, refresh, logout, `setLocale` | `accessToken`, `refreshToken`, `profile`, `preferences` |
| `usePlanningStore` (`prunplanner_planning`) | `plans`, `empires`, `cxs`, `shared` (records keyed by uuid), FIO storage/sites + timestamp | `plans`, `empires`, `cxs`, `shared` (not FIO storage: too big for the quota, `GetFIOStorage` refetches it on every load) |
| `useAlertsStore` (`prunplanner_alerts`) | Market-live alert rules | `userAlerts` |
| `useQueryStore` (`prunplanner_query_store`) | Query cache state | not persisted |

- `planningStore` is written **by query `fetchFn`s** (`setPlans`, `setCXs`,
  …). Components don't write to it directly.
- `getPlan(uuid)` and `getCX(uuid)` return `inertClone` copies, so mutating
  them doesn't touch the store.
- `userAlertsStore` is not synced to the backend. Alert rules stay
  per-browser.

- **Loaded on first use.** The app shell (`main.ts`, `App.vue`, `userStore`,
  `crossTab`, `usePreferences`, `preferenceSync`) imports none of the query
  layer, `features/api`, zod, axios or idb statically, so a visitor's first
  page doesn't load them: they come with the first page or action that
  needs them (`import()` in the user store's API calls, the preference
  PATCH, the cross-tab invalidation). A logout clears the query cache
  through `lib/sessionReset.ts`, where `queryStore` registers its reset
  once it has loaded. Keep new shell code to `import type` from these.

## 6. Several tabs (`src/lib/crossTab.ts`)

Each tab hydrates the persisted stores once and then keeps its own copy, so
the tabs of one browser are kept in step explicitly (registered in
`main.ts`):

- **Planning changes.** The planning mutations in `planning.queries.ts`
  (all but `PatchEmpireState`) invalidate through `changed(prefixes,
  uuid)`, or invalidate and call `broadcastChange` themselves (shared
  plans, plan clone and delete). It posts `{userId, keys, uuid}` on the
  `"prunplanner"` `BroadcastChannel`. The
  user's other tabs run the same `invalidate`, then set `remoteChange`.
  `usePlanningDataLoader` reloads its loaded steps under those keys
  (`refreshKey`) without clearing them and emits `refreshed`; open editors
  (plan, empire configuration, CX) reload when they have no unsaved edits,
  otherwise they show a "Saved in another tab" notice.
- **Save versions.** Plans, empires and CXs carry `modified_at`. A save
  sends the version its edit started from as `base_modified_at` and takes
  the new one from the response. A 409 (saved elsewhere) or 404 (deleted)
  opens the save conflict dialog, see
  [features/save_conflict.md](features/save_conflict.md).
- **Login state.** A `storage` listener on `prunplanner_user`: no refresh
  token means another tab logged out (`userStore.resetSession()`, leave
  pages that need a login); another user, or a login while this tab had
  none, ends this tab's session and reloads. It first stops this tab's
  persisted stores from writing (`lib/persistStorage.ts`, the `storage` of
  the user and planning stores), so a tab kept open by the leave-page
  prompt can never write the old login or plans back; it shows a notice to
  reload. The same user adopts the tokens and profile from the value
  stored now, not the event's (a later write may already have replaced
  it), and only the preference keys the other tab changed. Values are
  assigned only when they differ, so the persist plugin can't bounce
  writes between tabs. Reading the event's value let two tabs that wrote
  at the same moment swap their profiles for good, flipping the FIO
  status and refetching FIO storage on every swap (28 Oct 2026).
- **Preferences** (`features/preferences/preferenceSync.ts`) keep the last
  state known to match the backend. The debounced PATCH sends only what
  changed since: top-level keys, and `planOverrides` per uuid with `null`
  for a removed one (the backend merges per uuid). `GetPreferences` runs
  on every app start when logged in.

## Config (`src/lib/config.ts`)

`config.ts` reads the `VITE_*` env vars (see the README table) and applies
defaults: the API and share base URLs, the stale minutes for each game-data
type, the maximum age of an IndexedDB copy a tab renders from
(`GAME_DATA_MAX_AGE_MINUTES_*`), the delay of the background IndexedDB
write (`GAME_DATA_WRITE_DELAY_MS`) and the IndexedDB name. The values are
frozen when the module is imported.
