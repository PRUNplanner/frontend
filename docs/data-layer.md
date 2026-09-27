# Data layer

Data moves through four layers:

```
component / composable
  └─ useQuery("Name", params).execute()          src/lib/query_cache/useQuery.ts
       └─ queryStore.execute  (TTL, dedup, cache)  src/lib/query_cache/queryStore.ts
            └─ definition.fetchFn                 src/lib/query_cache/queryRepository.ts
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
- **Auth** is handled in `src/util/axiosSetup.ts`, which runs from `main.ts`:
  - A request interceptor adds `Authorization: Bearer <userStore.accessToken>`.
  - On a 401 response, it calls `userStore.performTokenRefresh()` and retries
    once.
  - If the refresh fails, or the 401 comes from `/user/refresh/` itself, it
    calls `logout()` and routes to `/`.
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
- Schemas live in `schemas/*.schemas.ts`.
  - They are usually declared as `z.ZodType<IThing>` against a hand-written
    interface, so a drift between the schema and the interface is a type
    error.
  - `z.infer` aliases sit at the bottom of each file.
- Interfaces for game data are in `gameData.types.d.ts`. Planning entities
  (plans, empires, CX) are in `src/stores/planningStore.types.d.ts`.

## 3. Query cache (`src/lib/query_cache/`)

- **`queryRepository.ts`** is the single catalogue of every backend
  interaction: `GetMaterials`, `GetPlan`, `PatchEmpire`, `CreateCX` and so
  on. Each definition has:
  - `key(params)`: a JSON array such as `["planningdata", "plan", uuid]`.
    Object keys are sorted by `toCacheKey`.
  - `fetchFn(params)`: calls `call*()`, then performs side effects. It
    writes to IndexedDB or `planningStore`, seeds sibling cache entries
    (`addCacheState`), or invalidates related keys. A cached query's
    `fetchFn` must let errors throw. If it returns `[]` or `false` on
    failure, that value is cached as fresh data, so loaders report success
    and later calculations fail (for example "Planet … not available").
  - `expireTime` (ms, optional), `autoRefetch` and `persist`.
    `persist: false` drops the result after the call, which is what
    mutations use.
- **`queryStore.ts`** is a Pinia store and is **not** persisted.
  - `execute(name, params, { forceRefetch })` returns cached data while it is
    fresh, and dedupes concurrent calls through an in-flight map. A request
    that was replaced (forced refetch) or dropped (`invalidateKey`,
    `$reset` on logout) no longer writes to the cache when it settles.
  - `invalidateKey(key, { exact, forceRefetch, skipRefetch })` deletes
    either the exact key or every key that the given key is a subset of. It
    refetches when `autoRefetch` is set or `forceRefetch` is passed.
    Mutations use `exact: false` on a prefix such as `["planningdata",
    "empire"]` to refresh a whole family.
  - A 10s interval refetches expired `autoRefetch` entries and evicts the
    other expired ones. It pauses while the user is idle (`userActivity`, see
    [features/user_activity.md](features/user_activity.md)).
- **`useQuery(name, params)`** is the caller API. Use `.execute()`. The
  `loading`, `error` and `data` fields it returns are **non-reactive
  snapshots** taken at call time, so don't bind templates to them. Before
  the query has any cached state, `error` is `false` and `data` is
  `undefined`.
- The `/debug` route (`views/QueryCacheView.vue`) shows the live cache.

### Adding a backend call

1. Add a Zod schema to `src/features/api/schemas/<domain>.schemas.ts`.
2. Add a `call*()` function to `src/features/api/<domain>.api.ts` that uses
   `apiService`.
3. Add the definition's type to `IQueryRepository` in
   `queryRepository.types.ts`.
4. Add the definition to `queryRepository.ts`: choose a key under an
   existing prefix, set `persist: false` for mutations, and invalidate the
   affected key families.
5. Call it with `useQuery("YourName", params).execute()`.
6. Add a test with `axios-mock-adapter`. For a pattern, see
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
  the new rows (the `Get*` queries do this).
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

## Config (`src/lib/config.ts`)

`config.ts` reads the `VITE_*` env vars (see the README table) and applies
defaults: the API and share base URLs, the stale minutes for each game-data
type, and the IndexedDB name. The values are frozen when the module is
imported.
