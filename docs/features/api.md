# api

**Purpose.** This folder is the only place that knows backend URLs and
payload shapes. It holds one `call*()` function per endpoint plus the Zod
schemas that validate requests and responses. The full flow is in
[../data-layer.md](../data-layer.md).

**Used by.** `src/lib/query_cache/queries/*.queries.ts`. That is the intended
caller: UI code goes through `useQuery`. The one exception is
`stores/userStore.ts`, which loads `userData.api.ts` itself for login, token
refresh and the profile. Other features import the **types** from here.

## Key files

| File | Endpoints |
| --- | --- |
| `gameData.api.ts` | Materials, exchanges, recipes, buildings, planets (single/multiple/search, search index), FIO storage, exploration data, CX sparklines, market summary, POPR |
| `planData.api.ts` | Plan CRUD, clone, and the shared-plan fetch |
| `empireData.api.ts` | Empire CRUD, plan junctions, empire material I/O state |
| `cxData.api.ts` | CX CRUD and empire junctions |
| `sharingData.api.ts` | Shared list, create, delete, clone |
| `userData.api.ts` | Login, refresh, profile, email verification, password change/reset, registration, preferences |
| `analyticsData.api.ts` | Planet insights |
| `apiKeysData.api.ts` | API key list, create, delete |
| `schemas/*.schemas.ts` | Zod schemas, each with its derived type next to it (`ThingSchema` + `Thing`) |

## Conventions

- **The shape of a call function** is `export async function
  callThing(args): Promise<Thing> { return apiService.get(path, ThingSchema); }`.
  It contains no store writes and no caching. Those belong in the query
  definition.
- **The schema is the type.** `type Thing = z.infer<typeof ThingSchema>`
  sits next to the schema; there is no separate interface to keep in sync.
  Don't annotate schemas as `z.ZodType<…>`. See
  [../data-layer.md](../data-layer.md) §2.
- **Use `preprocess`, `catch` and `transform` sparingly.** Use them only
  where the backend can send `null` or legacy values. See
  `UserPreferenceSchema` for an example.

## Tests

`src/tests/features/api/*.api.test.ts` (axios-mock-adapter), the schema tests
in `src/tests/features/api/schemas/`, and `backendContract.test.ts`, which
pins what the frontend sends and which backend shapes it must accept.
