# api_keys

**Purpose.** This folder lets users create and delete personal API keys for
the PRUNplanner backend, and build working URLs, Google Sheets formulas, curl
and Python snippets with them. External tools use the keys to read the user's
data.

**Used by.** `views/APIKeyView.vue` (`/apikey`).

## Key files

- `useAPIKeys.ts` → `useAPIKeys()` returns:
  - `apiKeyData`, `loaded`, `inDeletionId` and `lastCreatedKey`. The full key
    is shown only once, straight after creation.
  - `fetchAPIKeys()`, `createAPIKey(name)`, `deleteAPIKey(id)` and
    `resetCreation()`. These use the `GetAPIKeys`, `PostCreateAPIKey` and
    `DeleteAPIKey` queries (which send `account:api_key_create` /
    `account:api_key_revoke`).
- `apiEndpoints.ts` → `API_ENDPOINTS`, the 17 `GET` endpoints the builder
  offers (path templates, CSV variant, key or public, group). Add an endpoint
  here and its label in `locales/en_US/api_keys.json`; check the path against
  the backend's OpenAPI schema.
- `useAPIBuilder.ts` → `buildSnippets()` (pure) and `useAPIBuilder(key)`, the
  builder's state. The URL carries the key as `?api_key=`, curl and Python as
  the `Authorization: Api-Key` header; Python always reads the CSV variant when
  there is one.
- `components/APIURLBuilder.vue` → the builder UI. It loads empires, plans and
  CX preferences only when an endpoint needs them.

**The key stays in memory.** The key created on a visit lives in a `ref` of
the view and is passed to the builder as a prop: never in Pinia, storage, the
query cache or analytics. Snippet boxes and the modal key carry
`ph-no-capture`.

Schemas are in `features/api/schemas/apiKeysData.schemas.ts`.

## Tests

`src/tests/features/api_keys/`: `useAPIKeys.test.ts` (a good minimal example
of the axios-mock-adapter pattern), `apiEndpoints.test.ts`,
`useAPIBuilder.test.ts` and `components/APIURLBuilder.test.ts`; the page in
`src/tests/views/APIKeyView.test.ts`.
