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
  folders, `ui/`, `layout/`, `features/wrapper/`, `queryRepository.ts` and `queries/*.queries.ts`, the
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
- **Type checking.** `pnpm tsc` type-checks tests too, so a mock or
  fixture that drifts from its type fails CI. Type mocks with the real type
  (`const x: PlanEmpireElement = {...}`). Use `// @ts-expect-error mock data`
  only for deliberately partial data; an unused one is an error as well. JSON
  fixtures widen enums to `string`, so cast them (`as PlanEmpireElement[]`).
- **Type-level tests** live in `*.test-d.ts` (for example
  `src/tests/lib/query_cache/queryRepository.test-d.ts`). `pnpm test` runs
  them through `vitest --typecheck` with `tsconfig.typecheck.json`, using
  `expectTypeOf` and `// @ts-expect-error`.

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
const { preloadBuildings, preloadRecipes } = useBuildingData();
await preloadBuildings(); await preloadRecipes();

vi.mock("@/database/services/usePlanetData", …); // getPlanet → fixture
```

Preload exchanges and buildings too if the code under test reads them
synchronously (the planning engine, `PriceBook`). The planning tests share
`setupPlanningTestData()` and the plan builders in
`src/tests/features/planning/usePlanCalculation.fixtures.ts`.

Reference: `src/tests/features/planning/usePlanCalculation.test.ts`.

### Characterization snapshots and benchmarks

- `usePlanCalculation.characterization.test.ts` snapshots the full plan
  result for 11 plans (normalized to 10 significant digits). A changed
  snapshot means changed numbers: update with `-u` only on purpose, in its
  own commit.
- `pnpm vitest bench --run` runs the benchmark files
  (`*.bench.ts`): single-plan edit -> result latency and batch views. They
  are not part of `pnpm test`. Compare runs on the same, otherwise idle
  machine; note that they are Node + jsdom numbers.

### Component tests

Component tests are a **separate suite**. Every test under
`src/tests/**/components/**`, and view tests under `src/tests/views/`, is
excluded from `pnpm test` and runs with `pnpm test:components` instead, in
its own CI job on pull requests (`components.yml`, no coverage). A view
test stubs the `features/wrapper` loaders with a pass-through and seeds the
stores instead; see `ExchangesView.test.ts`. Run them before a PR that
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
- **Charts**: chart.js has no canvas in jsdom. `vi.mock` the chart
  component with a stub that declares its props, then assert on
  `findComponent(Chart).props()`; see `PlanRepairAnalysis.test.ts`.
- **Children** with their own test get the same kind of stub. Assert the
  props you hand them and fire their events with `stub.vm.$emit(...)`; see
  `PlanProduction.test.ts`.
- **File inputs**: define `files` on the hidden `<input type="file">` and
  `trigger("change")`, then `vi.waitFor` the parse; see
  `CXPreferenceImportExport.test.ts`.
- **Overlays**: `NPopover`, `NModal` and `NDrawer` render into
  `document.body` once shown. Query them through
  `new DOMWrapper(document.body)`; `PlanProductionRecipe.test.ts` opens a
  popover and reads its table. `NModal` and `NDrawer` keep their DOM
  during the leave transition, so assert a close through
  `findComponent(NDrawer).props("show")`; see `HelpDrawer.test.ts`.
- **Number inputs**: `PInputNumber` sets its `v-model` to `null` while
  the field is empty. A setter that emits it needs a null guard, and a
  test that clears the input; see `PlanArea.test.ts`.
- **Lazy content** (`import.meta.glob` help pages, planet names from
  IndexedDB) needs `vi.waitFor` on the expected text of every row, since
  stale or placeholder content passes an existence check.
- **jsdom quirks**: an inline style containing `linear-gradient` is
  dropped entirely; spy on the `CSSStyleDeclaration.prototype` `cssText`
  setter instead (`ChainNode.test.ts`). Queries that persist
  (`GetPlanetLastPOPR`, `GetPlanetSearchSingle`) survive a fresh Pinia, so
  give each test its own planet or search id.
- **Multipart and debounced requests**: axios-mock-adapter records a
  `FormData` body as `"[object FormData]"`, so spy on `apiService.post`
  to read it (`RegistrationComponent.test.ts`). A module-level
  `debounce` (the preference sync) needs fake timers before the module
  loads: fake `setTimeout`, `clearTimeout` and `Date` with
  `vi.useFakeTimers({ toFake })`, `vi.resetModules()`, then a dynamic
  import of the component (`UserPreferences.test.ts`).

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
