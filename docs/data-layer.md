# Data layer

```
component / composable
  └─ useQuery("Name", params).execute()          src/lib/query_cache/useQuery.ts
       └─ queryStore.execute  (TTL, dedup, cache; mutations bypass it)  src/lib/query_cache/queryStore.ts
            └─ definition.fetchFn                 src/lib/query_cache/queries/*.queries.ts
                 ├─ call*()  → apiService (axios + Zod)   src/features/api/*.api.ts
                 └─ side effects: write IndexedDB / planningStore / invalidate keys
```

## 1. HTTP: `apiService` (`src/lib/apiService.ts`)

- A singleton over the **global** axios instance (`apiService.client` is
  public for `axios-mock-adapter`); `baseURL` is `config.API_BASE_URL`.
- Calls to the API origin get `X-Request-ID`, `X-Correlation-ID` (PostHog
  session id, else a per-tab id; `lib/requestIds.ts`) and a 30 s timeout
  (`API_TIMEOUT_MS`). A timeout is a network error (`status` undefined).
- `get(path, responseSchema)`; `post/put/patch(path, payload,
  requestSchema, responseSchema)` validate the payload before sending and
  the response after (`post` has an `asForm` flag for multipart);
  `delete(path)` validates nothing and resolves `void`. Types are inferred
  from the schemas: don't pass type arguments.
- **Errors** (`normalizeError`, classes in `lib/apiError.ts`):
  - a `ZodError` → `ApiValidationError` (`Validation error: …`, no `status`);
  - an axios error → `ApiError` with the JSON response body as message,
    `.status` (undefined without a response), `.responseData`, and for a
    429 `.retryAfter` (seconds);
  - test with `isApiError(err)` (duck-typed on `status`), never a cast.
- **Reporting.** apiService reports its own errors, so `reportError` /
  `trackVueError` skip `ApiError`s.
  - PostHog (with consent only): response validation errors (field paths
    and issue codes, never values), `ApiRequestValidationError` (payload
    failed its own schema, nothing sent), 5xx, network errors and 429.
    Other 4xx and discarded responses aren't reported. Paths are sent as
    templates (`util/pathTemplate.ts`).
  - Network errors are skipped while offline, and for reads (GET, or
    `READ_POSTS`) unless the same path failed again within 10 min.
  - Validation, 5xx and network errors also go to the backend
    (`reportClientError` in `lib/clientErrors.ts`, `POST /client-errors/`)
    from every user regardless of consent, production builds only, with
    plain `fetch` (never through apiService).
- **Auth** (`util/axiosSetup.ts`, registered once by the `ApiService`
  constructor):
  - adds `Authorization: Bearer <accessToken>`;
  - on a 401, `userStore.performTokenRefresh()` and one replay. Parallel
    401s share one refresh. A refused refresh (4xx) logs out; pages with
    `meta.requiresAuth` go to `/`, public pages (a shared plan) stay and
    the request is retried once without the token. A refresh without an
    answer (network, timeout, 5xx) keeps the session;
  - a response to a request sent in a session that has since ended (the
    refresh token changed) is discarded as a `CanceledError`: it never
    refreshes, logs out or leaks into the next user's stores.
- `logout()` resets the user, planning and query stores and PostHog.

## 2. Endpoints & schemas (`src/features/api/`)

- One `<domain>.api.ts` per domain; each export is a `call*()` function
  making a single `apiService` call.
- Schemas in `schemas/<domain>.schemas.ts` are the single source of truth
  for wire shapes; rules in "Types" in [AGENTS.md](../AGENTS.md). Pattern:

  ```ts
  export const SharedSchema = z.object({ uuid: z.uuid(), plan: z.uuid() });
  export type Shared = z.infer<typeof SharedSchema>;

  export const SharedCreatePayloadSchema = SharedSchema.pick({ plan: true });
  ```

  - Export a type only when something uses it by name; no array aliases
    (callers write `Shared[]`).
  - A shape only one feature reads keeps its schema in that feature's
    `*.schemas.ts` (the CX SSE stream, market exploration), as does data
    read back from localStorage (saved planet searches, the last
    production chain).

## 3. Query cache (`src/lib/query_cache/`)

**Who holds the data.**
- The **query cache** tracks freshness and dedupes requests. For planning
  data its entry is in practice a "loaded and fresh" marker.
- **`planningStore`** is the read model for plans, empires, CX, shared
  plans and FIO storage: persisted, written by the planning `fetchFn`s,
  read by components.
- **`useDB` / IndexedDB** is the read model for game data (§4).
- A cache hit doesn't re-run `fetchFn`, so side effects happen once per
  fetch.
- Store objects and cache entries are **read-only**. Editors work on
  `getPlan` / `getCX` clones. `setPlan` stores the `GetPlan` entry's object
  itself; empires, CX and shared plans are stored as `inertClone`s.

**Definitions.** `queryRepository.ts` merges `queries/gameData`,
`planning` and `user.queries.ts` into one catalogue by name (`GetPlan`,
`PatchEmpire`, …). `QueryParams<"Name">` / `QueryData<"Name">`
(`queryRepository.types.ts`) are inferred from `fetchFn`; nothing is
registered by hand.

- **Reads**, `defineQuery({...})`:
  - `key(params)`: a `JSONValue` array such as `["planningdata", "plan",
    uuid]` (JSON only; object keys sorted by `toCacheKey`).
    `cacheKeys.test.ts` pins every query's key.
  - `fetchFn(params)`: calls `call*()`, then side effects: writes
    IndexedDB or `planningStore`, seeds sibling entries
    (`addCacheState`), invalidates (`invalidate(...prefixes)`). **It must
    let errors throw**: a `[]` or `false` returned on failure is cached as
    fresh data, loaders report success and calculations fail later.
  - Annotate `fetchFn`'s params and return type, even when inferable (a
    body touching the query store makes inference circular).
  - Optional: `expireTime` (ms), `autoRefetch` (default `false`),
    `cache: false` (result dropped after the call, still deduped in flight;
    `GetPreferences`, `GetAPIKeys`, `GetPlanDraft`), `initialData` (a
    persisted copy for the entry's first read, `{ data, fetchedAt } |
    null`; skipped by `forceRefetch`; an already expired copy is returned
    and refetched in the background. Used by the game data lists (§4) and
    `GetMarketSummary`, which reads localStorage).
- **Writes**, `defineMutation({ fetchFn })`: run outside the cache (no
  entry, no in-flight slot, no dedupe: two calls send two requests).
  Called like reads (`useQuery("PatchPlan", params).execute()`); errors
  propagate to the caller; `state` is always `undefined`.

**`queryStore.ts`** (Pinia, not persisted):
- `execute(name, params, { forceRefetch })` returns fresh cached data
  without writing anything (so no watcher fires), and dedupes concurrent
  calls. `isFresh(entry)` is the one rule: no `expireTime` never expires,
  else fresh for `expireTime` after the last successful fetch. A request
  replaced (forced refetch) or dropped (`invalidateKey`, `$reset` on
  logout) no longer writes when it settles.
- `cacheState` and its entries are `shallowReactive`: `data` is the raw
  fetch result, shared by every hit. Replace it (refetch, `invalidateKey`),
  never mutate it. `GetPlanetSearchIndex` is also `markRaw`.
- `invalidateKey(key, { exact, forceRefetch, skipRefetch })` deletes the
  exact key or (`exact: false`) every key the given one is a prefix of, and
  refetches those with `autoRefetch` or when forced.
- A 10 s interval refetches expired `autoRefetch` entries and evicts other
  expired ones; it pauses while the user is idle
  ([features/user_activity.md](features/user_activity.md)). A transient
  failure (network, 5xx, 429; `isTransientError`) of an `autoRefetch` entry
  is retried one `expireTime` later (a 429 after its `retryAfter`); any
  other error stops its refresh.
- **Fetch budget** (`queryLoopGuard`): more than 5 network fetches of one
  key within 10 s block it for 30 s. Cache hits, deduped calls and
  mutations don't count. While blocked, `execute` returns the last data or
  rejects with `QueryLoopError` (no status, never retried); the first block
  per key and tab sends a `query_loop` client error. When the block ends,
  a key still cached is refetched once.
- **Batched refresh** (`queryBatches.ts`, `batchRefresh`): expired
  `GetPlanet` entries are refetched together through one
  `GetMultiplePlanets` (or taken from an expiring multiple query covering
  them); a planet missing from the result gets an `error`. A new family is
  a new entry there.

**`useQuery(name, params)`** is the caller API: returns `execute` and
`state` (a `computed` of the fresh entry, `peekQueryState`; `undefined`
when none, stale, or a mutation). `params` is required exactly when the
query takes them (a type error otherwise). `/debug`
(`views/QueryCacheView.vue`) shows the live cache.

### Adding a backend call

1. Schema (+ derived type if used by name) in
   `features/api/schemas/<domain>.schemas.ts`, derived from existing ones
   where shapes overlap.
2. `call*()` in `features/api/<domain>.api.ts` returning `Promise<Thing>`.
3. `defineQuery` (key under an existing prefix) or `defineMutation` (whose
   `fetchFn` invalidates the affected families) in
   `queries/<domain>.queries.ts`, typed with `import type`.
4. Call `useQuery("YourName", params).execute()`.
5. Test with `axios-mock-adapter`, like `src/tests/features/api/*.api.test.ts`
   ([testing.md](testing.md)).

## 4. Game data in IndexedDB (`src/database/`)

- **Schema.** `schema.ts` (`DB_SCHEMA`) defines `gamedata_materials`
  (`ticker`), `gamedata_buildings` (`building_ticker`), `gamedata_recipes`
  (`recipe_id`), `gamedata_exchanges` (`ticker_id`), `gamedata_planets`
  (`planet_natural_id`) and `gamedata_meta` (`store`: one `{ store,
  fetchedAt, rows }` row per full list). When `__INDEXEDDB_VERSION__`
  changes, the upgrade **deletes and recreates every store**, so a schema
  change only needs a version bump.
- **`composables/useIndexedDBStore.ts`**: `getDB`, `dropDB`, typed CRUD
  (`get`, `getAll`, `set`, `setMany(items, wipe)`, `remove`, `statistics`);
  the typed handles are in `stores.ts`.
- **`composables/useDB.ts`**: a module-level in-memory layer per store,
  shared by every caller. `preload(force)` loads `allData`; `get(key)` reads
  memory, then the DB; `getLoaded(key)` reads memory synchronously and
  throws if the store was never loaded (the planning engine and `PriceBook`
  rely on it). After writing IndexedDB yourself, `preload(true)` or sync
  readers won't see the rows. `allData` is a `shallowRef`: assign a new
  array, never mutate in place. `fill(rows, replace)` loads memory without
  the DB.
- **IndexedDB never fails a query.** `storeAndPreload` falls back to
  `fill` when IndexedDB fails, and calls `dropDB` on `InvalidStateError` /
  `UnknownError` (a dead connection) so the next `getDB` reopens.
- **Upgrades with several tabs.** When a newer tab opens a higher DB
  version, the older tab's `blocking` handler closes its connection and
  calls `useVersionCheck().markOutdated()` (update notice); `getDB` then
  throws and the tab keeps working from memory. A tab without that handler
  keeps the upgrade waiting: `dbBlocked` is set and `App.vue` shows a toast.
- **`services/`** is what consumers use:

  | Service | Provides |
  | --- | --- |
  | `useMaterialData()` | `getMaterial`, `materialsMap`, `materialSelectOptions`, `getMaterialClass` (CSS category) |
  | `useBuildingData()` | `getBuilding`, `buildingsMap`, `recipeBuildingMap`, `getBuildingRecipes`, `getProductionBuildingOptions`, construction/workforce materials |
  | `useExchangeData()` | `getExchangeTicker`, `getExchangeTickerLoaded` (sync), `getMaterialExchangeOverview` |
  | `usePlanetData()` | `getPlanet`, `loadPlanetNames` + sync `planetName(id)` for templates (formatted by `planetLabel` in `util/planetName.ts`), `getPlanetSpecialMaterials` |

- **Freshness.**
  - TTL (`config.GAME_DATA_STALE_MINUTES_*`): materials, buildings and
    recipes 1440 min, planets 180, exchanges 30.
  - **IndexedDB first** for `GetMaterials`, `GetBuildings`, `GetRecipes`,
    `GetExchanges` (`gameDataQuery`): the `initialData` hook
    (`readGameData`) uses the stored rows if their meta row exists, is at
    most `config.GAME_DATA_MAX_AGE_MINUTES_*` old (exchanges 30 min, the
    rest 7 days) and the row count matches; past the TTL it is refetched in
    the background at once. Otherwise the query waits for the API. So
    exchange prices older than 30 min are never shown.
  - **Writing:** a fetch `fill`s memory and returns; `persistGameData`
    writes IndexedDB later (`whenIdle`, after
    `config.GAME_DATA_WRITE_DELAY_MS`, 5 s) in one transaction: meta
    deleted, rows replaced, meta written last. A store without a meta row
    is never read, so a cut-off write is harmless.
  - Planets (`GetPlanet`, `GetMultiplePlanets`, searches) write through
    `storeAndPreload` (IndexedDB, then the written rows into memory; no
    full re-read) and have no `initialData`.
  - Each phase is a `performance.measure`
    (`gamedata:<store>:idb-read|fetch|fill|idb-write`); the first load per
    store and tab is sent as `perf:gamedata_load`
    ([analytics.md](analytics.md)). The loaders add `loader:game` and
    `loader:planning`.
  - `WrapperGameDataLoader` triggers these queries
    ([features/wrapper.md](features/wrapper.md)).

## 5. Pinia stores (`src/stores/`)

Setup-style; persisted to localStorage by `pinia-plugin-persistedstate`
with `persist.pick`. The user and planning stores write through
`lib/persistStorage.ts` (`persistSerializer` stringifies the raw state, not
the reactive proxies): a failed write (quota) keeps the stored value and
is reported once per key, and §6 can stop all writes.

| Store (`id`) | Holds | Persisted keys |
| --- | --- | --- |
| `useUserStore` (`prunplanner_user`) | Tokens, profile, preferences (incl. per-plan overrides), locale; login, refresh, logout, `setLocale` | `accessToken`, `refreshToken`, `profile` without `email` and `fio_apikey` (`persist.omit`; the profile GET on start brings them back), `fioKeySet` (keeps `hasFIO` until then), `preferences` |
| `usePlanningStore` (`prunplanner_planning`) | `plans`, `empires`, `cxs` (by uuid), `shared` (by plan uuid), FIO storage + timestamp | `plans`, `empires`, `cxs`, `shared` (not FIO storage: too big; `GetFIOStorage` refetches it) |
| `useAlertsStore` (`prunplanner_alerts`) | Market-live alert rules, per browser and user (not synced) | not by the plugin: `userAlerts` under `prunplanner_alerts:<user id>` (`userStorageKey` in `lib/storage.ts`, which also moves the old unkeyed value to the first user); written through `persistStorage`, read through `StoredAlertsSchema` (invalid: none, reported) |
| `useQueryStore` (`prunplanner_query_store`) | Query cache state | not persisted |

- `planningStore` is written **only by query `fetchFn`s**;
  `getCX` returns an `inertClone` copy.
- **Loaded on first use.** The app shell (`main.ts`, `App.vue`,
  `userStore`, `crossTab`, `usePreferences`, `preferenceSync`) statically
  imports none of the query store/repository, `features/api`, zod, axios or
  idb, so a visitor's first page doesn't load them (`import()` where
  needed). A logout clears the query cache through `lib/sessionReset.ts`,
  where modules register their reset once loaded. Keep new shell code to
  `import type` from these.

## 6. Several tabs (`src/lib/crossTab.ts`)

Each tab keeps its own copy of the persisted stores, so tabs are synced
explicitly (`registerCrossTab` in `main.ts`):

- **Planning changes.** The planning mutations in `planning.queries.ts`
  (except `PatchEmpireState` and the draft writes) invalidate through
  `changed(prefixes, uuid, exact, remote)` (shared plans through
  `dropShared`). It posts `{userId, keys, uuids, uuid}` on the
  `"prunplanner"` `BroadcastChannel`; `remote` keys are only posted, not
  invalidated locally. Receiving tabs merge messages (100 ms after the
  last, at most 1 s after the first), run one `invalidate` of the deduped
  keys and set `remoteChange` once. `invalidate`/`changed` skip a key that
  another prefix of the same call covers (else it would refetch twice).
- **Plan saves.** `PatchPlan` stores the PUT's full plan (planning store,
  and its `GetPlan` entry via `addCacheState(..., replace)`), so the saving
  tab doesn't refetch it. It invalidates the plan list, every empire's plan
  list, and the empire list only when the name changed; the plan's own key
  is `remote`. The saving tab's version list refreshes throttled
  (`refreshVersionsSoon`: 1 s after a save, ≥ 3 s apart) to stay within
  the fetch budget.
- **Bulk actions.** Wrap loops of mutations in `batchChanges(fn)`: inside
  it `changed` only records keys and uuids; at the end (also on throw) each
  key is invalidated once with one broadcast. Nested batches join the
  outer one.
- **Readers.** `usePlanningDataLoader` reloads its loaded steps under the
  changed keys (`refreshKey`) without clearing them and emits `refreshed`;
  open editors (plan, empire configuration, CX) reload when clean, else
  show a "Saved in another tab" notice.
- **Save versions.** Plans, empires and CXs carry `modified_at`; a save
  sends its starting version as `base_modified_at`. A 409 (saved
  elsewhere) or 404 (deleted) opens the save conflict dialog
  ([features/save_conflict.md](features/save_conflict.md)).
- **Login state.** A `storage` listener on `prunplanner_user`
  (`onUserStorage`):
  - no refresh token: another tab logged out → `userStore.resetSession()`,
    leave pages that need a login;
  - another user, or a login while this tab had none: `stopPersisting()`
    (so this tab never writes the old session back), reset and reload;
  - same user: adopt tokens and profile from the **currently stored**
    value (not the event's, which a later write may have replaced; merged
    over this tab's profile, as storage has no email or FIO key), and
    only the preference keys the other tab changed. Assign only values that
    differ, or the persist plugin bounces writes between tabs.
- **Preferences** (`features/preferences/preferenceSync.ts`) keep the last
  state known to match the backend; the debounced PATCH sends only changed
  top-level keys, and for `planOverrides` and `fioRepairPlanLinks` changed
  entries per key (`null` = removed; the backend merges per key).
  `GetPreferences` runs on every app start when logged in.

## Config (`src/lib/config.ts`)

Reads the `VITE_*` env vars (README table) once at import, with defaults:
API and share base URLs, `GAME_DATA_STALE_MINUTES_*`,
`GAME_DATA_MAX_AGE_MINUTES_*`, `GAME_DATA_WRITE_DELAY_MS` and the
IndexedDB name.
