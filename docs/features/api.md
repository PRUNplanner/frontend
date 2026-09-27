# api

**Purpose.** This folder is the only place that knows backend URLs and
payload shapes. It holds one `call*()` function per endpoint plus the Zod
schemas that validate requests and responses. The full flow is in
[../data-layer.md](../data-layer.md).

**Used by.** `src/lib/query_cache/queries/*.queries.ts`. That is the intended
caller: UI code goes through `useQuery`. Other features import the **types**
from here.

## Key files

| File | Endpoints |
| --- | --- |
| `gameData.api.ts` | Materials, exchanges, recipes, buildings, planets (single/multiple/search), FIO storage, exploration data, POPR |
| `planData.api.ts` | Plan CRUD, clone, and the shared-plan fetch |
| `empireData.api.ts` | Empire CRUD, plan junctions, empire material I/O state |
| `cxData.api.ts` | CX CRUD and empire junctions |
| `sharingData.api.ts` | Shared list, create, delete, clone |
| `userData.api.ts` | Login, refresh, profile, email verification, password change/reset, registration, preferences |
| `analyticsData.api.ts` | Planet insights |
| `apiKeysData.api.ts` | API key list, create, delete |
| `schemas/*.schemas.ts` | Zod schemas, usually `z.ZodType<IThing>`, plus `z.infer` aliases |
| `gameData.types.d.ts`, `userData.types.ts`, `sharingData.types.ts` | Hand-written interfaces |

## Conventions

- **The shape of a call function** is `export async function
  callThing(args): Promise<IThing> { return apiService.get(path, Schema); }`.
  It contains no store writes and no caching. Those belong in the query
  definition.
- **Schema changes need matching interface changes.** Typing a schema as
  `z.ZodType<I…>` makes TypeScript flag the drift.
- **Use `preprocess`, `catch` and `transform` sparingly.** Use them only
  where the backend can send `null` or legacy values. See
  `UserPreferenceSchema` for an example.

## Tests

`src/tests/features/api/*.api.test.ts` (axios-mock-adapter) and
`schemas/gameData.schemas.test.ts`.
