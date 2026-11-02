# Testing

Vitest in `jsdom`; config in `vitest.config.ts`, setup in
`src/tests/vitest.setup.ts`. Commands are in [AGENTS.md](../AGENTS.md#commands);
also `pnpm vitest run -t "name"` (by test name) and `pnpm test:watch` /
`pnpm test:ui`.

## Layout

- Tests live in `src/tests/`, mirroring `src/`
  (`src/features/cx/usePrice.ts` → `src/tests/features/cx/usePrice.test.ts`).
- API tests are `src/tests/features/api/*.api.test.ts`, schema tests are in
  `src/tests/features/api/schemas/`. `backendContract.test.ts` there pins
  what the frontend sends and which backend shapes it accepts; extend it
  when a request or response shape changes.
- **Fixtures**: real backend payloads in `src/tests/test_data/`
  (`api_data_*.json`). Import them directly. **Never mutate a fixture**:
  module imports are shared, so clone first (`structuredClone` /
  `deepClone`).
- **Coverage** is off for `pnpm test`; see AGENTS.md for how
  `pnpm test:coverage` and CI merge the two suites.

## Environment

- **IndexedDB** is `fake-indexeddb/auto`. A global `beforeEach` empties
  every store (`emptyDB` in `vitest.setup.ts`); the app's cached connection
  stays open and the in-memory `useDB` caches are **not** reset. Seed data
  in `beforeEach`: data seeded in `beforeAll` is gone from the second test
  on.
- **Per-test reset**: `localStorage` / `sessionStorage` are cleared before
  each test, `vi.useRealTimers()` runs after it; the config undoes
  `vi.stubGlobal` / `vi.stubEnv` (`unstubGlobals`, `unstubEnvs`) and clears
  mock calls (`clearMocks`; implementations stay, so set the one a test
  needs in `beforeEach`). The setup also stubs `ResizeObserver` and
  `scrollIntoView`.
- **Storage on Node 25+**: workers run with `--no-experimental-webstorage`
  so jsdom's storage isn't shadowed. For a test-owned store, stub it with
  `memoryStorage()` (`src/tests/memoryStorage.ts`).
- **Types**: `pnpm tsc` checks tests too. Type mocks with the real type;
  use `// @ts-expect-error mock data` only for deliberately partial data
  (an unused one is an error). JSON fixtures widen enums to `string`, so
  cast them. Type-level tests are `*.test-d.ts` (`expectTypeOf`), run by
  `pnpm test` in vitest's typecheck mode.

## Patterns

### Backend calls

Mock the global axios instance once per file with axios-mock-adapter:
`new AxiosMockAdapter(apiService.client)`, plus
`setActivePinia(createPinia())` and `axiosSetup()` (`@/util/axiosSetup`) in
`beforeAll`; then `mock.onGet(url).reply(200, fixture)` and call the
composable or `useQuery(...).execute()`. Reference:
`src/tests/features/api_keys/useAPIKeys.test.ts`.

### Game data and engine tests

Seed the IndexedDB stores (`buildingsStore.setMany(...)` etc.), then
preload the `useDB` caches (`useMaterialData().preload()`,
`useBuildingData().preloadBuildings()` / `preloadRecipes()`, exchanges too
for anything reading them synchronously, like the engine and `PriceBook`)
and `vi.mock("@/database/services/usePlanetData", …)` for the planet.

Planning tests share `setupPlanningTestData()`, plan builders
(`etherwindPlan`, `largePlan`, …) and result builders (`building`,
`option`, `activeRecipe`, `m`, `io`, `wf`, `experts`) from
`src/tests/features/planning/usePlanCalculation.fixtures.ts`; CX
preferences come from `cxFixture()` (`src/tests/features/cx/cx.fixtures.ts`).
Reference: `src/tests/features/planning/usePlanCalculation.test.ts`.

### Characterization snapshots and benchmarks

- **Golden tests** (`*.golden.test.ts`) freeze calculated numbers with
  `toMatchFileSnapshot(golden(value))` (`src/tests/golden.ts`, 10
  significant digits). The plan engine's contract is
  `usePlanCalculation.characterization.test.ts` (see
  [planning-engine.md](planning-engine.md#tests-and-benchmarks)). A changed
  snapshot means changed numbers: update with `-u` only on purpose, in its
  own commit.
- **Benchmarks** are `*.bench.ts` under `src/tests/`, run with
  `pnpm vitest bench --run --reporter=verbose`, not part of `pnpm test`.
  Import `bench` from `@/tests/bench` (a Vitest 5 shim for the
  `bench(name, fn, options)` form). Compare runs on the same idle machine;
  they are Node + jsdom numbers.

### Component tests

A **separate suite**: `src/tests/**/components/**` and `src/tests/views/`
(`COMPONENT_TESTS` in `vitest.config.ts`) are excluded from `pnpm test` and
run with `pnpm test:components` (`vitest.components.config.ts`, longer
timeouts). Logic extracted from a component into a util belongs in the
regular suite. Write them for logic-heavy components; see
`src/tests/features/planning/components/PlanSupplyCart.test.ts`.

- **Mount** with `mountComponent(Component, props, options)` from
  `src/tests/mountComponent.ts`: renders in `<Suspense>`, installs an i18n
  without messages (so `t(key)` renders the key), stubs `RouterLink`,
  auto-unmounts. Options: `pinia`, `withDialog` (renders `PConfirmHost` for
  `useConfirm()`), `messages` (en_US, for `<i18n-t>` slots), `attach` (for
  focus checks), `setup` (to `provide()` what the component injects).
  Returns `setProps` and `component` (`.emitted()`). Same file:
  `piniaWithCX(uuid, name)`, `tableRows(wrapper)` (`PDataTable` rows as
  column key → text; sort via `th[data-col-key="x"] button`),
  `hoverTooltip(el)`, `mountComposable(() => useX())` for a composable
  with lifecycle hooks or `inject()` (unmount its `wrapper` to dispose).
- **Data**: seed and preload as in engine tests; mock the backend with
  axios-mock-adapter and assert on `mock.history` bodies. Payloads are
  Zod-validated, so use real uuids where the schema demands them.
- **Interact** through the DOM (`setValue`, `trigger("click")`) or emit
  `update:value` on a `PSelect` / `PSelectMultiple`.
- **Assert** on rendered text, classes and emitted events with
  hand-computed values. No snapshots. IndexedDB-backed content (search
  results, planet names, `import.meta.glob` help pages) needs `vi.waitFor`
  on the expected text of every row, not `flushPromises` or an existence
  check.
- **Charts**: jsdom has no canvas. `vi.mock` the chart component with a
  stub that declares its props, assert on `findComponent(Chart).props()`
  (`PlanRepairAnalysis.test.ts`). `switchPalette()`
  (`src/tests/switchPalette.ts`) flips the colour-blind palette for
  `useChartTheme`.
- **Children** with their own test get the same kind of stub: assert the
  props you pass, fire events with `stub.vm.$emit(...)`
  (`PlanProduction.test.ts`). `stubComponent(name, props)` and
  `materialTile` in `src/tests/stubs.ts` build them; load inside the
  factory (`async () => (await import("@/tests/stubs")).materialTile`).
- **Overlays** (`PModal`, `PDrawer`, `PPopover`, `PDropdown`, toasts)
  render into `document.body`: query `new DOMWrapper(document.body)` by
  `[role=dialog]`, `button[aria-label="common.ui.close"]`, `[role=menu]`,
  `[role=menuitem]` (`PlanMoreMenu.test.ts`). A click outside is a
  `mousedown` on the document. Transitions are stubbed, so a closed modal
  is gone at once.
- **View tests** stub the `features/wrapper` loaders with a pass-through
  and seed the stores; file inputs get `files` defined, then
  `trigger("change")` and `vi.waitFor` (`ExchangesView.test.ts`).
- **`PInputNumber`** sets its `v-model` to `null` while empty: a setter
  that emits it needs a null guard and a test that clears the input
  (`PlanArea.test.ts`).
- **jsdom quirks**: an inline style containing `linear-gradient` is dropped
  entirely; spy on the `CSSStyleDeclaration.prototype` `cssText` setter.
- **Multipart and debounce**: axios-mock-adapter records `FormData` as
  `"[object FormData]"`, so spy on `apiService.post`
  (`RegistrationComponent.test.ts`). A module-level `debounce` needs fake
  timers before the module loads: `vi.useFakeTimers({ toFake })` for
  `setTimeout`, `clearTimeout` and `Date`, `vi.resetModules()`, then
  import the component dynamically (`UserPreferences.test.ts`).

## Test isolation checklist

- Fresh Pinia per file, or per test when state leaks.
- Don't mutate module-level singletons (`preferenceDefaults`, fixtures,
  `useDB` / `useExchangeSSE` state); clone first.
- The query cache persists some entries across tests (e.g.
  `GetPlanetLastPOPR`, `GetPlanetSearchSingle`), so give each test its own
  planet or search id.
- Undo global changes the config doesn't reset yourself (a prototype spy,
  attributes on `document`).
- Always `await` async assertions (`await expect(p).rejects…`); a bare
  `expect(x).toBeTruthy` without `()` asserts nothing.
- Run a file alone (`pnpm vitest run <file>`) to confirm it doesn't depend
  on another file's side effects.
