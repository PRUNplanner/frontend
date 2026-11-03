# api

**Purpose.** The only place that knows backend URLs and payload shapes: one
`call*()` per endpoint plus Zod schemas for requests and responses. Flow:
[../data-layer.md](../data-layer.md).

**Used by.** `src/lib/query_cache/queries/*.queries.ts` (UI goes through
`useQuery`). Exceptions: `stores/userStore.ts` lazy-imports `userData.api.ts`
(login, refresh, profile); `planning/usePlanDraft.ts` calls
`sendPlanDraftKeepalive`; `preferences/usePreferences.ts` lazy-imports it (for
`sendPreferencesKeepalive`). Other features import only the types.

## Key files

| File | Endpoints |
| --- | --- |
| `gameData.api.ts` | Materials, exchanges, recipes, buildings, planets (+ search, search index), FIO storage, exploration, CX sparklines, market summary, POPR |
| `planData.api.ts` | Plan CRUD, clone, shared plan, versions, drafts |
| `empireData.api.ts` | Empire CRUD, plan junctions, material I/O state |
| `cxData.api.ts` | CX CRUD, empire junctions |
| `sharingData.api.ts` | Shares list, create, delete, clone |
| `userData.api.ts` | Auth, profile, email, password, registration, preferences |
| `analyticsData.api.ts` | Planet insights |
| `apiKeysData.api.ts` | API keys |
| `schemas/*.schemas.ts` | Zod schemas, each with its `z.infer` type next to it |

## Conventions

- `callThing(args): Promise<Thing>` just returns `apiService.get(path,
  ThingSchema)`: no store writes, no caching (those go in the query).
- The schema is the type; no separate interface, no `z.ZodType<…>`
  annotations ([../data-layer.md](../data-layer.md) §2).
- `preprocess` / `catch` / `transform` only where the backend can send
  `null` or legacy values (see `UserPreferenceSchema`).

## Gotchas

- `sendPlanDraftKeepalive` bypasses `apiService`: a raw `fetch` with
  `keepalive` (survives page unload); returns `false` when the body exceeds
  the keepalive cap. `sendPreferencesKeepalive` does the same for the
  preferences PATCH on `pagehide`.

## Tests

`src/tests/features/api/` (axios-mock-adapter, `schemas/`) and
`backendContract.test.ts` (what the frontend sends and which backend shapes
it accepts).
