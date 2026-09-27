# api_keys

**Purpose.** This folder lets users create and delete personal API keys for
the PRUNplanner backend. External tools use them to read the user's data.

**Used by.** `views/APIKeyView.vue` (`/apikey`).

## Key file

`useAPIKeys.ts` → `useAPIKeys()` returns:
- `apiKeyData`, `loaded`, `inDeletionId` and `lastCreatedKey`. The full key
  is shown only once, straight after creation.
- `fetchAPIKeys()`, `createAPIKey(name)`, `deleteAPIKey(id)` and
  `resetCreation()`. These use the `GetAPIKeys`, `PostCreateAPIKey` and
  `DeleteAPIKey` queries.

Schemas are in `features/api/schemas/apiKeysData.schemas.ts`.

## Tests

`src/tests/features/api_keys/useAPIKeys.test.ts`. It is a good minimal
example of the axios-mock-adapter pattern.
