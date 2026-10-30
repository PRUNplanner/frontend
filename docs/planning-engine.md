# Planning engine

The heart of the app is turning a **plan** (buildings, recipes, habs,
experts, workforce luxuries, COGC, HQ on one planet) into a result: workforce,
area, production, material flow, cost, revenue and profit per day.
All of that is calculated by one pure engine.

```
views / components
  │  PlanView                 EmpireView, FIOBurnView, ROI overviews
  ▼                            │
usePlanCalculation (adapter)   │  batch: game data once, a context per plan
  │  computed, sync            │
  ▼                            ▼
engine/calculatePlan(input, ctx)  ── plain TypeScript, no Vue
  ▲
usePlanContext: game data maps, planet, PriceBook (features/cx/priceBook.ts)
```

## The engine (`src/features/planning/engine/`)

```ts
const { result, overview } = calculatePlan(input, ctx);
```

- **Pure and synchronous.** Plain data in and out, no Vue, no stores, no
  awaits, and it never mutates its input. An ESLint rule forbids `vue`,
  `pinia`, `@vue/*`, `@/stores/*` (except `*.types`) and `@/database/*`
  imports in `engine/` (and in `production_chain/engine/`).
- **`input: IPlanInput`** is the plan (`plan_data`, `plan_cogc`,
  `plan_corphq`, `plan_permits_used`), the active **empire** (faction bonus)
  and the **CX** uuid, all explicit. `recipeOptions: false` skips recipe
  options for callers that never read them.
- **`ctx: IPlanContext`** is game data as plain maps (`buildings`,
  `recipesByBuilding`, `materials`), the plan's **planet** and a
  **`PriceBook`** for the plan's CX and planet. Build it with
  `usePlanContext()`.
- **Output:** `result: IPlanResult` (see below) and `overview:
  IOverviewData`. `calculateVisitation(result)` gives `IVisitationData`.

| File | Concern |
| --- | --- |
| `calculatePlan.ts` | Orchestration |
| `engine.types.ts` | `IPlanInput`, `IGameData`, `IPlanContext`, `IPlanCalculation` and the trace types |
| `trace.ts` | `createPlanTracer`, `tracePriceBook`, `TRACE_PHASES` (see Tracing) |
| `workforce.ts` | Need vs capacity, satisfaction, luxury consumption |
| `workforce.constants.ts` | `WORKFORCE_CONSUMPTION_MAP` (re-exported by `workforce.ts`; the market report reads it without the engine) |
| `area.ts` | Area and permits, infrastructure and storage records |
| `efficiency.ts` | Building efficiency factors, expert bonus, `expertNames` |
| `production.ts` | Buildings: efficiency, active recipes, daily contribution |
| `recipeOptions.ts` | Every recipe option of a building with revenue, ROI, profit per area |
| `cogm.ts` | Cost of goods manufactured per active recipe, also without a CX (Universe prices). The Exchanges page re-prices it with `calculateCOGM` from unsaved rules (`exchanges/exchangePlanData.util.ts`) |
| `materialIO.ts` | Combining and enriching material I/O, production I/O, `TOTALMSDAY` |
| `construction.ts` | Construction materials, total construction cost, infrastructure costs |
| `finance.ts` | Revenue, cost, profit and the overview in one pass |
| `visitation.ts` | Daily import/export weight and volume, storage days |
| `buildings.ts` | Game data helpers: building lookup, construction materials with planet additions, recipes (extraction from planet resources), planet boundaries |

`IPlanResult` (typed in `usePlanCalculation.types.ts`, together with every
sub-record; the `WorkforceType`, `InfrastructureType`, `ExpertType` and
`StorageType` unions derive from `api/schemas/planningData.schemas.ts`)
contains:

- `workforce`, `area`, `infrastructure`, `storage` and `experts`;
- `production.buildings` (per-building efficiency, active recipes with
  COGM, recipe options) and `production.materialio`;
- `materialio`: the combined input, output and delta per ticker, with
  weight, volume and price;
- `workforceMaterialIO` and `productionMaterialIO`: the two parts of that
  flow;
- `profit`, `cost` and `revenue` (per day), `infrastructureCosts` and
  `constructionMaterials`.

### How a plan is calculated

1. Base records: workforce (need vs capacity, luxuries, satisfaction),
   area/permits, infrastructure, storage and experts.
2. Production. Each building's efficiency is the product of:
   - **FERTILITY**: FRM and ORC only;
   - **HQ**: the corp HQ on the planet;
   - **COGC**: a program matching the building's expertise, or the
     workforce type;
   - **EXPERT**: expert count per expertise;
   - **WORKFORCE**: satisfaction;
   - **FACTION**: the empire's faction bonus.

   Recipe runtimes then turn into daily input and output, per building
   information is built once per ticker. A building's workforce cost
   (COGM, recipe options, its daily revenue) is its workers per type times
   the plan-wide housed share of that type (capacity / required, at most 1)
   with that type's luxuries, so summed over buildings it is the plan's
   workforce consumption.
3. Workforce consumption plus the production I/O are combined, enriched
   with weight and volume and priced.
4. Money:
   - revenue = the sum of prices for positive deltas;
   - cost = the sum for negative deltas + **1/180 of the total building
     construction cost per day**, which models degradation;
   - profit = revenue − cost.

**Signs.** Material values follow `output - input`, so costs come out
negative (`constructionCost`, `workforceDailyCost` in the result). Inside
the engine costs are positive, converted by exact negation, and the result
keeps its original signs. The plan result and the overview report the same
money with different signs and degradation formulas (`x * (1 / 180)` vs
`x / 180`); `finance.ts` keeps both exactly, down to the sign of zero.

### Tracing

`ctx.trace` (an `IPlanTracer`, `engine/trace.ts`) records every step for
the calculation debug panel. Engine functions take it as an optional
trailing parameter and call `trace?.step({ phase, label, formula, inputs,
value, … })` where a value is computed, with the value actually used, so
labels and formulas sit next to the math. `trace.group` nests the steps of
one building row or one recipe's COGM. Phases, in engine order:
`TRACE_PHASES` (input, infrastructure, workforce, area, experts,
production, cogm, materialio, prices, construction, finance, visitation).
Each production group starts with the building's game data; infrastructure
lists each habitation's housing, area each building's share. `calculatePlan` wraps the price book in `tracePriceBook`,
which records the first lookup per ticker and type with its source.

- Without a tracer nothing changes: `trace?.step(…)` never builds its
  argument, and traced and untraced results are deep-equal
  (`engine/trace.test.ts` over every fixture).
- `createPlanTracer({ limit })` stops at 10,000 entries and marks the trace
  truncated.
- Only `usePlanCalculation().traceCalculation()` traces, for the panel; it
  also traces `calculateVisitation` (storage and daily weight and volume) on
  the traced result. Recipe options and batch callers pass no tracer.
- `calcDebug.util.ts` self-checks a traced run (totals add up, profits
  agree, deltas and efficiencies). Those checks are a deliberate second
  calculation, an oracle, and the one exception to hard rule 6.

The switch is `lib/debugMode.ts` (`?debug=calc` / `?debug=off` on any
page, or the `/debug` page; stored in `localStorage.prunplanner_debug`).
With it on, the plan page shows a Debug button (and Ctrl/⌘ + \`) that
opens `components/debug/PlanCalcDebug.vue`, loaded lazily. The button is
the Debug item of the header's More menu (`PlanMoreMenu`).

## `usePlanCalculation` (`src/features/planning/usePlanCalculation.ts`)

The Vue adapter for the plan editor.

```ts
const calc = usePlanCalculation(
  planRef,            // Ref<IPlanDefinition>, required
  empireUuidRef,      // Ref<string | undefined>, the empire context (faction, permits)
  empireOptionsRef,   // Ref<PlanEmpireElement[] | undefined>, the list to resolve that uuid
  cxUuidRef           // Ref<string | undefined>, the exchange preference for prices
);
```

- **`result` is a synchronous `computed`** over `calculatePlan`. It
  recalculates when the plan, the empire, the CX uuid or that CX in
  `planningStore.cxs` change (saving or reloading a CX replaces its object;
  another CX is not read). There are no recalculation watchers and no
  async runs.
- **Loading.** Game data and the plan's planet are loaded once when the
  composable is created. Views load them before (see
  [data-layer.md](data-layer.md)), so this is a no-op wait; until then
  `result` is `planEmptyResult` with `done: false`.
- **A stopped effect scope keeps its last result.**
- **Returned fields:**

  | Field | Meaning |
  | --- | --- |
  | `result: ComputedRef<IPlanResult>` | The full result, read-only |
  | `overviewData`, `visitationData` | Derived summaries for `PlanResultsBar` / `PlanVisitationFrequency` |
  | `calculate()` | Calculates once (async, waits for loading) and returns a fresh result |
  | `calculateOverview(materialIO, production, infrastructure)` | The overview for a result's parts (async, waits for loading) |
  | `traceCalculation()` | One traced run for the debug panel, `undefined` until the planet is loaded |
  | `backendData` | The `PlanCreateData` payload for save/create |
  | `existing`, `saveable`, `modified`, `planName`, `planEmpires`, `computedActiveEmpire` | Editor state. `modified` means "differs from the last save or load" |
  | `undo`, `redo`, `canUndo`, `canRedo`, `markSaved(snapshot?)`, `snapshot`, `savedSnapshot`, `savedAt`, `revision`, `isRestoring` | Undo history from `usePlanHistory`. A save passes the `snapshot()` it sent to `markSaved`; `savedSnapshot()` is the last saved state, the base of a save conflict and of a shared plan's changes; `revision` bumps on every new step, undo, redo and save |
  | `record(fn)` | Wraps a function so every handler it calls is one undo step (PlanView applies the typical setup and its habs this way) |
  | `handle*` | Mutators from `usePlanCalculationHandlers`, each one an undo step |

`usePlanCalculationHandlers.ts` holds every edit operation (`handleUpdate*`,
`handleCreate*`, `handleDelete*`, `handleAdd*`, `handleChange*`), plus `handleApplyStarterSetup` (several buildings, recipes and experts at once). Each one mutates `plan.plan_data`.
`usePlanCalculation` wraps them with `usePlanHistory.ts`: every call becomes
an undo step (edits made by watchers in the same flush, like hab
auto-optimisation, join it; typing the plan name is one step), capped at 50
and cleared by `markSaved()` on load, save and reload. `modified` compares
the plan with the last saved snapshot, so undoing back to it clears it.
Components never write into `result`; they emit and the plan update drives
the new result.

## Batch calculation

Empire, FIO burn, FIO repair, Exchanges, the chain check and the ROI
overviews call the engine directly:

```ts
const { loadGameData, createContext } = usePlanContext();
const gameData = await loadGameData();          // once per batch
for (const plan of plans) {
  const ctx = await createContext(gameData, plan.planet_natural_id, cxUuid);
  const { result } = calculatePlan(
    { plan, empire: getActiveEmpire(empireUuid, empireOptions), cxUuid, recipeOptions: false },
    ctx
  );
}
```

- Game data is shared; each plan gets its planet and price book.
- Pass `recipeOptions: false` unless you read `production.buildings[].recipeOptions`.
- Run the loop through `useRunProgress` (`src/util/runProgress.ts`):
  `start(total)` gives a run with `step()` for the progress, `yield()` to
  give the browser a turn, and `isCurrent()`, false once a newer run started
  or the component unmounted. Empire and FIO burn share `useEmpireCalculation`.
- Resource ROI decides which extractor to calculate from the extractor's
  recipes for the planet (`getBuildingRecipes`), then calculates only those.

## Prices: `PriceBook` and `usePrice`

`createPriceBook(getCXData, planetNaturalId, getExchange)` in
`src/features/cx/priceBook.ts` resolves prices synchronously from preloaded
exchange data; each `(ticker, BUY/SELL)` is resolved once per book and the
CX is read once. Create a new book per calculation to pick up changes.
`usePrice(cxUuidRef, planetNaturalIdRef)` keeps the async `getPrice`,
`getMaterialIOTotalPrice` and `enhanceMaterialIOMaterial` for components;
they resolve through a book.

A CX preference (`CX.cx_data`) is resolved from the most specific level to
the least specific; the first match wins:

1. planet ticker preference;
2. empire ticker preference;
3. planet exchange preference;
4. empire exchange preference;
5. fallback: **UNIVERSE 30-day VWAP**.

A preference type of `BOTH` applies to buy and to sell. When no CX is set,
the universe VWAP is used everywhere. A price that can't be resolved is 0
and logged.

## Other calculation modules (`src/features/planning/calculations/`)

| File | Purpose |
| --- | --- |
| `bonusCalculations.ts`, `workforceCalculations.ts`, `buildingCalculations.ts` | Composable wrappers around the engine's functions, for existing callers |
| `infrastructureCalculations.ts` | Hab/storage building lists, storage weight and volume |
| `habOptimization.ts` | `optimizeHabs` / `calculateAvailableArea`: a `yalps` LP solver for the "auto habs" feature (`HabSolverGoal`: auto, cost or area) |
| `extractionCalculations.ts` | Extractor output from planet resources (`calculateExtraction`) |

## Empires

An empire is a named group of plans with a faction and permits
(`PlanEmpireElement`). There is **no separate empire engine**:
`useEmpireCalculation` (`features/empire`, used by `EmpireView` and
`FIOBurnView`) calculates each plan (see batch above) and caches results in
a `Map` keyed by plan, empire and CX. `EmpireView` aggregates cost,
material I/O and plan lists for the `features/empire` components. The
aggregated material I/O is pushed back to the backend with
`PatchEmpireState`.

## Plan lifecycle (`src/features/planning_data/usePlan.ts`)

- `createBlankDefinition` builds a new plan from planet data.
  `mapPlanetToPlanType` translates the planet's COGC program for the plan.
- `createNewPlan`, `saveExistingPlan` and `reloadExistingPlan` go through
  the query cache. The body they send is `calc.backendData`.

## Where it is used

| Caller | How |
| --- | --- |
| `views/PlanView.vue` | `usePlanCalculation`. Owns the plan ref and wires the `handle*` functions into the `features/planning/components/Plan*.vue` panels. A shared plan gets a second one for the shared version, to compare against (`usePlanSharedCopy`) |
| Plan check tool (`PlanCheckMarket`, `PlanCheckCompare`, `util/whatIf.util.ts`) | Engine with the plan's context: scaled price books, real ask/bid prices, another of the user's plans |
| `views/EmpireView.vue` | Engine per plan, results cached |
| `views/fio/FIOBurnView.vue` | Engine per plan, then `useFIOBurn` |
| `features/fio_repair/useFIORepair.ts` | Engine per candidate plan, keyed by `planResultCacheKey` |
| `features/exchanges/useExchangePlanData.ts` | Engine once per plan of the empires using a CX preference (Universe prices); edits re-price without recalculating |
| `features/production_chain/useChainCheck.ts` | Engine per plan of the checked empire |
| `features/roi_overview/useROIOverview.ts` | Synthetic single-building plans per recipe, one context |
| `features/resource_roi_overview/useResourceROIOverview.ts` | Synthetic extraction plans per planet (concurrency-limited with `p-limit`) |

## Tests and benchmarks

- `src/tests/features/planning/engine/`: engine unit tests.
- `usePlanCalculation.characterization.test.ts`: snapshots of the full
  result, overview and visitation for 11 plans (etherwind, empty, small, a
  46-building `large` plan, CX, empire, luxuries off, 5 experts, CorpHQ, a
  matching and a workforce COGC). They run through the adapter and through
  the engine directly against the same files in
  `__snapshots__/usePlanCalculation.characterization/`. **They are the
  contract: a change to them is a change of calculated numbers.** Update
  them only on purpose, in their own commit, with `-u`.
- Benchmarks: `pnpm vitest bench --run` runs
  `usePlanCalculation.bench.ts` (single plan: `calculate()` and
  edit -> result for amount, recipe, luxury and CX edits) and
  `usePlanCalculation.batch.bench.ts` (empire-like 30 plans, ROI overview,
  resource ROI, with counters for calculations and recipe options, and
  Empire results held in a `ref` vs a `shallowRef`). They
  are Node + jsdom numbers; compare runs on the same machine.

## Design decisions

| Decision | Why |
| --- | --- |
| A pure, synchronous TypeScript engine | Testable without Vue, no stale async runs, deterministic |
| No Web Worker for plan editing | Edit -> result is about a millisecond for a 46-building plan in Node |
| No event -> stage invalidation table | A hand-written reactivity system where one missed mapping gives stale numbers. Full recompute; memoize by input reference only if measured |
| Zod only at system boundaries | API and IndexedDB, not internal data |
| Workers only for batch, only if needed | A pool of stateless workers running the same engine. Not needed today: every batch view finishes well under a second and blocks the main thread for at most a few milliseconds at a time |

## Gotchas

- **Pass a copy, never a store object.** Plans from the planning store are
  inert clones; edit a copy.
- **Results depend on context.** Empire (faction, permits) and CX (prices)
  both change the numbers, so any cache must include both in its key.
- **New math goes into `engine/`** as a plain function with a unit test in
  `src/tests/features/planning/engine/`.
