# api_keys

**Purpose.** Create and delete personal API keys, and build working URLs,
Google Sheets formulas, curl and Python snippets with them.

**Used by.** `views/APIKeyView.vue` (`/apikey`).

## Key files

- `useAPIKeys.ts`: list/create/delete via `GetAPIKeys`, `PostCreateAPIKey`,
  `DeleteAPIKey`. `lastCreatedKey` is the full key, shown only once after
  creation.
- `apiEndpoints.ts`: `API_ENDPOINTS`, the `GET` endpoints the builder offers
  (path template, optional CSV path, group; `public` needs no key). Adding
  one: also add `api_keys.builder.endpoints.<id>.label/description` in
  `locales/en_US/api_keys.json` and check the path against the backend's
  OpenAPI schema. Types in `apiEndpoints.types.ts`.
- `useAPIBuilder.ts`: `buildSnippets()` (pure) and `useAPIBuilder(key)`. The
  URL carries the key as `?api_key=`, curl and Python as the
  `Authorization: Api-Key` header; Python always reads the CSV variant when
  there is one; the Sheets formula exists only for CSV.
- `components/APIURLBuilder.vue`: the builder UI; loads empires, plans or CX
  preferences only when the endpoint needs them.

## Gotchas

- The key stays in memory: a `ref` in the view passed to the builder as a
  prop, never in Pinia, storage, the query cache or analytics. Snippet boxes
  and the modal key carry `ph-no-capture`.

## Tests

`src/tests/features/api_keys/` (`useAPIKeys.test.ts` is a minimal example of
the axios-mock-adapter pattern); page in `src/tests/views/APIKeyView.test.ts`.
