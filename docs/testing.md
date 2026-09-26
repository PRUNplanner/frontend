# Testing

Vitest runs in `jsdom`. Config is in `vitest.config.ts` and setup in
`src/tests/vitest.setup.ts`.

```bash
pnpm test                                   # all, single run, silent
pnpm vitest run src/tests/features/cx       # one folder
pnpm vitest run -t "getPrice"               # by test name
pnpm test:watch / pnpm test:ui / pnpm test:coverage
```

## Layout

- **Location.** Tests live in `src/tests/` and mirror `src/`, e.g.
  `src/features/cx/usePrice.ts` → `src/tests/features/cx/usePrice.test.ts`.
- **Naming.**
  - API tests are `*.api.test.ts` under `src/tests/features/api/`.
  - Schema tests are under `src/tests/features/api/schemas/`.
- **Fixtures.** Real backend payloads live in `src/tests/test_data/`:
  `api_data_materials.json`, `api_data_buildings.json`,
  `api_data_recipes.json`, `api_data_exchanges.json`,
  `api_data_plan_etherwind.json`, `api_data_planet_etherwind.json`,
  `api_data_cx_*`, `api_data_fio_storage.json`, and others. Import them
  directly. **Never mutate a fixture.** Module imports are shared across
  tests, so clone it first (`structuredClone` / `deepClone`).
- **Coverage.** It is always on (v8, lcov + html). Views, `components/`
  folders, `ui/`, `layout/`, `features/wrapper/`, `queryRepository.ts`, the
  router and analytics are **excluded**, so tests target composables, stores,
  utils and the API layer.

## Environment details

- **Globals.** `globals: true`, so `describe` and `it` are available
  without imports. Most files still import them explicitly from `vitest`.
- **IndexedDB.**
  - `fake-indexeddb/auto` provides it.
  - `__INDEXEDDB_VERSION__` is `Date.now()`, and the DB is deleted in a
    global `beforeEach`.
  - Seed data yourself in `beforeAll`/`beforeEach`.
- **Env vars.** `import.meta.env` comes from `loadEnv("", "")`.
- **Type checking.** `pnpm tsc` **does not type-check tests**
  (`tsconfig.typecheck.json` excludes `src/tests`). Tests often use
  `// @ts-expect-error mock data` when a fixture doesn't match the strict
  types.

## Patterns

### Pinia

```ts
beforeAll(() => { setActivePinia(createPinia()); });
// or beforeEach for full isolation between tests
```

### Backend calls (axios-mock-adapter)

`apiService.client` is the global axios instance. Mock it once per file:

```ts
import AxiosMockAdapter from "axios-mock-adapter";
import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";

const mock = new AxiosMockAdapter(apiService.client);

beforeAll(() => { setActivePinia(createPinia()); axiosSetup(); });

it("fetches", async () => {
  mock.onGet("/user/api/keys/").reply(200, fixture);
  // call the composable or useQuery(...).execute()
});
```

Reference: `src/tests/features/api_keys/useAPIKeys.test.ts` and the
`src/tests/features/api/*.api.test.ts` files.

### Game data for engine tests

Seed IndexedDB and the in-memory `useDB` cache, then mock the planet:

```ts
await buildingsStore.setMany(buildings);
await recipesStore.setMany(recipes);
await materialsStore.setMany(materials);
await exchangesStore.setMany(exchanges);
await useMaterialData().preload();
const { preloadBuildings, preloadRecipes } = await useBuildingData();
await preloadBuildings(); await preloadRecipes();

vi.mock("@/database/services/usePlanetData", …); // getPlanet → fixture
```

Reference: `src/tests/features/planning/usePlanCalculation.test.ts`.

### Component tests

Component tests are a **separate, local-only suite**. Every test under
`src/tests/**/components/**` is excluded from `pnpm test` (which CI runs),
so they cost no GitHub Actions minutes. Run them yourself before a PR that
touches a tested component:

```bash
pnpm test:components                        # vitest.components.config.ts, no coverage
pnpm vitest run --config vitest.components.config.ts src/tests/features/manage
```

The glob is `COMPONENT_TESTS` in `vitest.config.ts`; the components config
spreads the base config and swaps `include`/`exclude`. Logic you extract
from a component into a util belongs in the regular suite, not this one.

Write them for logic-heavy components, see
`src/tests/features/planning/components/PlanSupplyCart.test.ts`:

- **Mount** with `mountComponent(Component, props, { pinia, withDialog })`
  from `src/tests/mountComponent.ts`. It renders inside `<Suspense>`
  (async setup), installs a message-less i18n instance, so `t(key)` and
  `$t(key)` render the key itself, stubs `RouterLink`, and unmounts after
  each test. `withDialog` adds `NDialogProvider` for `useDialog()`.
  `setProps` updates props, `component.emitted()` holds emitted events.
- **Data**: seed fixtures into the IndexedDB stores and preload, as in
  engine tests. Mock the backend with axios-mock-adapter and assert on
  `mock.history` request bodies. Payloads are Zod-validated, so use real
  uuids where the schema demands them.
- **Interact** through the DOM (`setValue`, `trigger("click")`), or emit
  `update:value` on a `PSelect` / `PSelectMultiple`. `tableRows(wrapper)`
  reads naive-ui data tables as column key → text.
- **Assert** on rendered text, classes and emitted events with
  hand-computed values. No snapshots. Work that hits IndexedDB (search
  results, planet names) needs `vi.waitFor` rather than `flushPromises`.

## Test isolation checklist

Some tests used to pass only when run in a particular order. Avoid that:

- Create a fresh Pinia per file, or per test when state leaks.
- Don't mutate module-level singletons: `preferenceDefaults`, fixtures, and
  the `useDB` / `useExchangeSSE` module state. Clone first.
- Use `vi.useFakeTimers()` only when you also restore it with
  `vi.useRealTimers()`. Undo `vi.stubGlobal` / `vi.stubEnv` too.
- Always `await` async assertions (`await expect(p).rejects…`). A bare
  `expect(x).toBeTruthy` without `()` asserts nothing.
- Run a single file on its own (`pnpm vitest run <file>`) to confirm it
  doesn't depend on another file's side effects.
