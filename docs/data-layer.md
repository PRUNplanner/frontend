# Data layer

Data moves through four layers:

```
component / composable
  └─ useQuery("Name", params).execute()          src/lib/query_cache/useQuery.ts
       └─ queryStore.execute  (TTL, dedup, cache)  src/lib/query_cache/queryStore.ts
            └─ definition.fetchFn                 src/lib/query_cache/queries/*.queries.ts
                 ├─ call*()  → apiService (axios + Zod)   src/features/api/*.api.ts
                 └─ side effects: write IndexedDB / planningStore / invalidate keys
```

## 1. HTTP: `apiService` (`src/lib/apiService.ts`)

- `apiService` is a singleton that wraps the **global** axios instance.
  `apiService.client` is public so tests can attach `axios-mock-adapter`.
  `baseURL` comes from `config.API_BASE_URL`, and GET requests send no-cache
  headers.
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
    body, with `.status` and `.responseData` attached.
  - it also reports to PostHog error tracking (`trackException`, only
    with consent): `ApiValidationError` (field names and issue codes,
    never values, record keys or indices), `ApiServerError` (5xx), `ApiNetworkError` (no response) and
    `ApiClientError` (429). Other 4xx (including the 401 of an expired
    refresh token) and discarded responses are not reported. Paths are sent as templates
    (`src/util/pathTemplate.ts`: `/planning/plan/:uuid/`).
- **Auth** is handled in `src/util/axiosSetup.ts`, which runs from `main.ts`:
  - A request interceptor adds `Authorization: Bearer <userStore.accessToken>`.
  - On a 401 response, it calls `userStore.performTokenRefresh()` and retries
    once.
  - If the refresh fails, or the 401 comes from `/user/refresh/` itself, it
    calls `logout()`. A route with `meta.requiresAuth` then goes to `/`; a
    public route (a shared plan) stays, and the failed request is sent once
    more without the token.
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
- `apiService` infers its types from the schemas:
  `get(path, schema)` returns `z.output<typeof schema>`, and
  `post/put/patch` type the payload as `z.input` of the request schema. Don't
  pass explicit type arguments.
- Shapes that never cross a runtime boundary (engine results, UI state,
  query cache) are plain TypeScript in the feature's `*.types.ts`. See
  "Types" in [AGENTS.md](../AGENTS.md).

## 3. Query cache (`src/lib/query_cache/`)

- **`queryRepository.ts`** is the single catalogue of every backend
  interaction: `GetMaterials`, `GetPlan`, `PatchEmpire`, `CreateCX` and so
  on. It merges the definitions in `queries/`, which are split by domain
  (`gameData`, `planning`, `user`). Each definition is wrapped in
  `defineQuery()` and has:
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
    `persist` (default `true`). `persist: false` drops the result after
    the call, which is what mutations use.
- **Types come from the definitions.** Annotate `fetchFn`'s params and
  return type; `key`'s params are inferred from it. Annotate the return
  type even when it looks inferable: a body that touches the query store
  would make the inference circular. `IQueryRepository` is
  `typeof queryRepository`, and `QueryParams<"Name">` /
  `QueryData<"Name">` (`queryRepository.types.ts`) read a query's types.
  There is nothing to register by hand.
- **`queryStore.ts`** is a Pinia store and is **not** persisted.
  - `execute(name, params, { forceRefetch })` returns cached data while it is
    fresh, and dedupes concurrent calls through an in-flight map. Mutations
    (`persist: false`) are never deduped, since most share a static key.
    A request that was replaced (forced refetch) or dropped
    (`invalidateKey`, `$reset` on logout) no longer writes to the cache
    when it settles.
  - `invalidateKey(key, { exact, forceRefetch, skipRefetch })` deletes
    either the exact key or every key that the given key is a subset of. It
    refetches when `autoRefetch` is set or `forceRefetch` is passed.
    Mutations use `exact: false` on a prefix such as `["planningdata",
    "empire"]` to refresh a whole family.
  - A 10s interval refetches expired `autoRefetch` entries and evicts the
    other expired ones. It pauses while the user is idle (`userActivity`, see
    [features/user_activity.md](features/user_activity.md)).
    Expired `GetPlanet` entries are refetched together in one
    `GetMultiplePlanets` request (or taken from an expiring multiple query
    that covers them); a planet missing from the result gets an `error`.
- **`useQuery(name, params)`** is the caller API. Use `.execute()`.
  `params` is required exactly when the query takes them, so
  `useQuery("GetMaterials")` has none and `useQuery("GetPlan")` without
  params is a type error. The `loading`, `error` and `data` fields it
  returns are **non-reactive snapshots** taken at call time, so don't bind
  templates to them. Before the query has any cached state, `error` is
  `false` and `data` is `undefined`.
- The `/debug` route (`views/QueryCacheView.vue`) shows the live cache.

### Adding a backend call

1. Add a Zod schema to `src/features/api/schemas/<domain>.schemas.ts`, and
   next to it `export type Thing = z.infer<typeof ThingSchema>` if the shape
   is used by name. Reuse or derive from existing schemas where the shapes
   overlap. Don't write a separate interface.
2. Add a `call*()` function to `src/features/api/<domain>.api.ts` that uses
   `apiService` without explicit type arguments, returning
   `Promise<Thing>` (or `Promise<Thing[]>`).
3. Add a `defineQuery({...})` to the matching `queries/<domain>.queries.ts`.
   Choose a key under an existing prefix, annotate `fetchFn`'s params and
   return type with the derived types (`import type`), set
   `persist: false` for mutations, and invalidate the affected key
   families.
4. Call it with `useQuery("YourName", params).execute()`.
5. Add a test with `axios-mock-adapter`. For a pattern, see
   `src/tests/features/api/*.api.test.ts` and
   [testing.md](testing.md).

## 4. Game data in IndexedDB (`src/database/`)

- **Schema and stores.**
  - `schema.ts` defines the object stores `gamedata_materials` (keyed by
    `ticker`), `gamedata_buildings` (`building_ticker`), `gamedata_recipes`
    (`recipe_id`), `gamedata_exchanges` (`ticker_id`) and
    `gamedata_planets` (`planet_natural_id`).
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
  the new rows (the `Get*` queries do this through `storeAndPreload`).
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
  | `usePlanetData()` | `getPlanet`, planet names (`loadPlanetNames`, sync `planetName(id)` for templates, cached in the `planetNames` Map), special materials |

- **Freshness.**
  - The `Get*` game-data queries write into IndexedDB and then call
    `useDB(store).preload(true)`.
  - Their TTL comes from `config.GAME_DATA_STALE_MINUTES_*`: materials,
    buildings and recipes default to 1440 min, planets to 180 min and
    exchanges to 30 min.
  - `WrapperGameDataLoader` triggers these queries. See
    [features/wrapper.md](features/wrapper.md).

**End-to-end example (materials):**

1. `WrapperGameDataLoader load-materials` runs
   `queryStore.execute("GetMaterials")`.
2. That calls `callDataMaterials()`, which does
   `apiService.get("/data/materials/", MaterialPayloadSchema)`.
3. The result goes to `materialsStore.setMany(data, true)`, then
   `useDB(materialsStore).preload(true)`.
4. Components read it through `useMaterialData().getMaterial("DW")`.

## 5. Pinia stores (`src/stores/`)

The stores are setup-style. Persistence uses `pinia-plugin-persistedstate`
(localStorage) with `persist.pick`.

| Store (`id`) | Holds | Persisted keys |
| --- | --- | --- |
| `useUserStore` (`prunplanner_user`) | Tokens, profile, preferences (incl. per-plan overrides), locale. Actions: login, refresh, logout, `setLocale` | `accessToken`, `refreshToken`, `profile`, `preferences` |
| `usePlanningStore` (`prunplanner_planning`) | `plans`, `empires`, `cxs`, `shared` (records keyed by uuid), FIO storage/sites + timestamps | all of those |
| `useAlertsStore` (`prunplanner_alerts`) | Market-live alert rules | `userAlerts` |
| `useQueryStore` (`prunplanner_query_store`) | Query cache state | not persisted |

- `planningStore` is written **by query `fetchFn`s** (`setPlans`, `setCXs`,
  …). Components don't write to it directly.
- `getPlan(uuid)` and `getCX(uuid)` return `inertClone` copies, so mutating
  them doesn't touch the store.
- `userAlertsStore` is not synced to the backend. Alert rules stay
  per-browser.

## 6. Several tabs (`src/lib/crossTab.ts`)

Each tab hydrates the persisted stores once and then keeps its own copy, so
the tabs of one browser are kept in step explicitly (registered in
`main.ts`):

- **Planning changes.** Every planning mutation in `planning.queries.ts`
  invalidates through `changed(prefixes, uuid)`, which also posts
  `{userId, keys, uuid}` on the `"prunplanner"` `BroadcastChannel`. The
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
  reload. The same user adopts the tokens and only the preference
  keys the other tab changed. Values are assigned only when they differ,
  so the persist plugin can't bounce writes between tabs.
- **Preferences** (`features/preferences/preferenceSync.ts`) keep the last
  state known to match the backend. The debounced PATCH sends only what
  changed since: top-level keys, and `planOverrides` per uuid with `null`
  for a removed one (the backend merges per uuid). `GetPreferences` runs
  on every app start when logged in.

## Config (`src/lib/config.ts`)

`config.ts` reads the `VITE_*` env vars (see the README table) and applies
defaults: the API and share base URLs, the stale minutes for each game-data
type, and the IndexedDB name. The values are frozen when the module is
imported.
