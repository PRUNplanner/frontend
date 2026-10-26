# Testing

Vitest runs in `jsdom`. Config is in `vitest.config.ts` and setup in
`src/tests/vitest.setup.ts`.

```bash
pnpm test                                   # all, single run, silent
pnpm vitest run src/tests/features/cx       # one folder
pnpm vitest run -t "getPrice"               # by test name
pnpm test:watch / pnpm test:ui
pnpm test:coverage                          # unit + component tests, one merged report
```

## Layout

- **Location.** Tests live in `src/tests/` and mirror `src/`, e.g.
  `src/features/cx/usePrice.ts` → `src/tests/features/cx/usePrice.test.ts`.
- **Naming.**
  - API tests are `*.api.test.ts` under `src/tests/features/api/`.
  - Schema tests are under `src/tests/features/api/schemas/`.
  - `src/tests/features/api/backendContract.test.ts` pins what the
    frontend sends and which backend shapes it must accept, which the
    fixture-based API tests can't notice drifting. Extend it when a
    request or response shape changes.
- **Fixtures.** Real backend payloads live in `src/tests/test_data/`:
  `api_data_materials.json`, `api_data_buildings.json`,
  `api_data_recipes.json`, `api_data_exchanges.json`,
  `api_data_plan_etherwind.json`, `api_data_planet_etherwind.json`,
  `api_data_cx_*`, `api_data_fio_storage.json`, and others. Import them
  directly. **Never mutate a fixture.** Module imports are shared across
  tests, so clone it first (`structuredClone` / `deepClone`).
- **Coverage.** Off for `pnpm test`. `pnpm test:coverage` runs the unit
  suite and the component/view suite (v8) and merges both blob reports into
  one `coverage/lcov.info` plus an html report in `coverage/`. That is the
  report CI uploads to Codacy (`coverage.yml`: the unit suite in 3 shards,
  the component suite in 2, then a merge job). Every file in `src/`
  counts, also the ones without a test; only `src/tests/`, `main.ts`, `*.d.ts` and static data
  (`json`, `css`, `md`) are excluded. Thresholds apply to the merged report.

## Environment details

- **Globals.** `globals: true`, so `describe` and `it` are available
  without imports. Most files still import them explicitly from `vitest`.
- **IndexedDB.**
  - `fake-indexeddb/auto` provides it.
  - `__INDEXEDDB_VERSION__` is `Date.now()`, and a global `beforeEach`
    empties every store through a short connection of its own
    (`emptyDB` in `vitest.setup.ts`). The app's cached connection stays
    open, since a read a previous test left running would fail on a closed
    one, and the in-memory `useDB` caches are not reset.
  - Seed data yourself in `beforeEach`: data seeded in `beforeAll` is gone
    from the second test on.
- **Per-test reset.** The setup file also clears `localStorage` and
  `sessionStorage` before each test and calls `vi.useRealTimers()` after
  it; the config undoes `vi.stubGlobal` / `vi.stubEnv` after each test
  (`unstubGlobals`, `unstubEnvs`). Node 25+ shadows jsdom's storage with an
  undefined global: run tests on the `.nvmrc` Node, or stub it with
  `memoryStorage()` from `src/tests/memoryStorage.ts`.
- **Env vars.** `import.meta.env` comes from `loadEnv("", "")`.
- **Type checking.** `pnpm tsc` type-checks tests too, so a mock or
  fixture that drifts from its type fails CI. Type mocks with the real type
  (`const x: PlanEmpireElement = {...}`). Use `// @ts-expect-error mock data`
  only for deliberately partial data; an unused one is an error as well. JSON
  fixtures widen enums to `string`, so cast them (`as PlanEmpireElement[]`).
- **Type-level tests** live in `*.test-d.ts` (for example
  `src/tests/lib/query_cache/queryRepository.test-d.ts`). `pnpm test` runs
  them through vitest's typecheck mode (`typecheck` in `vitest.config.ts`,
  with `tsconfig.typecheck.json`), using
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
  result for 11 plan cases, through `usePlanCalculation` and straight
  through the engine (normalized to 10 significant digits). A changed
  snapshot means changed numbers: update with `-u` only on purpose, in its
  own commit.
- `pnpm vitest bench --run --reporter=verbose` runs the benchmark files
  (`*.bench.ts` under `src/tests/`: plan calculation, query store, `useDB`,
  production chain solver, planet search, preferences and others). They
  are not part of `pnpm test`. Compare runs on the same, otherwise idle
  machine; note that they are Node + jsdom numbers.

### Component tests

Component tests are a **separate suite**. Every test under
`src/tests/**/components/**`, and view tests under `src/tests/views/`, is
excluded from `pnpm test` and runs with `pnpm test:components` instead, in
its own sharded CI jobs (`coverage.yml`, which also merges its coverage with the unit
suite's). A view
test stubs the `features/wrapper` loaders with a pass-through and seeds the
stores instead; see `ExchangesView.test.ts`. Run them before a PR that
touches a tested component:

```bash
pnpm test:components                        # vitest.components.config.ts
pnpm vitest run --config vitest.components.config.ts src/tests/features/manage
```

The glob is `COMPONENT_TESTS` in `vitest.config.ts`; the components config
spreads the base config, swaps `include`/`exclude` and raises the test
and hook timeouts (mounting is slow under coverage). Logic you extract
from a component into a util belongs in the regular suite, not this one.

Write them for logic-heavy components, see
`src/tests/features/planning/components/PlanSupplyCart.test.ts`:

- **Mount** with `mountComponent(Component, props, { pinia, withDialog })`
  from `src/tests/mountComponent.ts`. It renders inside `<Suspense>`
  (async setup), installs a message-less i18n instance, so `t(key)` and
  `$t(key)` render the key itself, stubs `RouterLink`, and unmounts after
  each test. `withDialog` renders `PConfirmHost` for `useConfirm()`;
  `messages` (en_US) lets `<i18n-t>` render its slots.
  `setProps` updates props, `component.emitted()` holds emitted events.
- **Data**: seed fixtures into the IndexedDB stores and preload, as in
  engine tests. Mock the backend with axios-mock-adapter and assert on
  `mock.history` request bodies. Payloads are Zod-validated, so use real
  uuids where the schema demands them.
- **Interact** through the DOM (`setValue`, `trigger("click")`), or emit
  `update:value` on a `PSelect` / `PSelectMultiple`. `tableRows(wrapper)`
  reads `PDataTable` body rows as column key → text; sort by clicking the
  header's button (`th[data-col-key="x"] button`).
- **Assert** on rendered text, classes and emitted events with
  hand-computed values. No snapshots. Work that hits IndexedDB (search
  results, planet names) needs `vi.waitFor` rather than `flushPromises`.
- **Charts**: chart.js has no canvas in jsdom. `vi.mock` the chart
  component with a stub that declares its props, then assert on
  `findComponent(Chart).props()`; see `PlanRepairAnalysis.test.ts`.
  `switchPalette()` (`src/tests/switchPalette.ts`) flips the colour-blind
  palette for code that reads `useChartTheme`.
- **Children** with their own test get the same kind of stub. Assert the
  props you hand them and fire their events with `stub.vm.$emit(...)`; see
  `PlanProduction.test.ts`.
- **File inputs**: define `files` on the hidden `<input type="file">` and
  `trigger("change")`, then `vi.waitFor` the parse; see
  `ExchangesView.test.ts`.
- **Overlays**: `PModal`, `PDrawer`, `PPopover`, `PDropdown` and toasts
  render into `document.body` once shown. Query them through
  `new DOMWrapper(document.body)`: modals, drawers and confirms by
  `[role=dialog]`, their close button by
  `button[aria-label="common.ui.close"]`, menus by `[role=menu]` and
  `[role=menuitem]` (see `PlanMoreMenu.test.ts`);
  `PlanRecipePicker.test.ts` drives a listbox with the keyboard. A
  click outside is a `mousedown` on the document. For focus checks pass
  `{ attach: true }` to `mountComponent`. The setup file stubs
  `ResizeObserver`. Test utils stub the transitions, so a closed modal or
  drawer is gone at once; `findComponent(PDrawer).props("show")` also
  works, see `HelpDrawer.test.ts`.
- **Number inputs**: `PInputNumber` sets its `v-model` to `null` while
  the field is empty. A setter that emits it needs a null guard, and a
  test that clears the input; see `PlanArea.test.ts`.
- **Lazy content** (`import.meta.glob` help pages, planet names from
  IndexedDB) needs `vi.waitFor` on the expected text of every row, since
  stale or placeholder content passes an existence check.
- **jsdom quirks**: an inline style containing `linear-gradient` is
  dropped entirely; spy on the `CSSStyleDeclaration.prototype` `cssText`
  setter instead. Queries that persist
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
- Fake timers, `vi.stubGlobal` / `vi.stubEnv` and storage are reset between
  tests (Per-test reset above); undo any other global change yourself
  (a prototype spy, attributes on `document`).
- Always `await` async assertions (`await expect(p).rejects…`). A bare
  `expect(x).toBeTruthy` without `()` asserts nothing.
- Run a single file on its own (`pnpm vitest run <file>`) to confirm it
  doesn't depend on another file's side effects.
