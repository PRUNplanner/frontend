# Planning engine

One pure engine turns a **plan** (buildings, recipes, habs, experts,
workforce luxuries, COGC, HQ on one planet) into workforce, area,
production, material flow, cost, revenue and profit per day.

```
PlanView ─ usePlanCalculation (adapter, sync computed) ─┐
batch views ─ usePlanContext + calculatePlan per plan ──┴─> @prunplanner/engine calculatePlan(input, ctx)
```

## The engine package (`packages/engine/`, `@prunplanner/engine`)

```ts
import { calculatePlan } from "@prunplanner/engine";
import type { Plan } from "@prunplanner/engine/schemas";

const { result, overview } = calculatePlan(input, ctx);
```

The engine, the price book and the wire schemas they are built on live in
the workspace package `@prunplanner/engine` (`frontend/packages/engine`),
imported by the app, the MCP server and the tests like any npm package.

- **Two entry points.** `@prunplanner/engine` (`src/index.ts`): the
  calculation API, price book, engine types and `optimalProduction`.
  `@prunplanner/engine/schemas` (`src/schemas/index.ts`): the Zod schemas
  `gameData`, `planningData`, `empireData`, `cxData` and their inferred
  types (still hand-written, still the source of truth for those wire
  shapes), so the API layer doesn't load the engine. Each entry exports
  exactly what the app and MCP use; `tests/publicApi.test.ts` snapshots
  the names, so a change to the surface is a visible diff. Import only
  from the entries, never from a file inside the package.
- **It imports only itself and `zod`** (`zod` is a peer dependency, one
  instance with the app). ESLint fails on any other import in
  `packages/engine/src/`, including `@/` and paths above `src/`; its own
  `tsconfig.json` has no DOM lib and no Node types, and `pnpm tsc` checks
  it. `production_chain/engine/` stays in the app (no Vue, Pinia,
  `@/stores/*` except `*.types`, `@/database/*`) and imports the package.
- **Layout** (`packages/engine/src/`): `engine/` (the files below),
  `calculations/` (extraction, infrastructure, bonus and workforce
  types), `planCalculation.types.ts` (result types), `cx/` (price book,
  price and exchange types), `schemas/`, `util/` (`boundary.ts`,
  `numbers.types.ts`), `roi/` (`optimalProduction.ts`).
- **Built like a real package, not published** (`"private": true`). The
  workspace `exports` point at `src/`, so dev, Vite, Vitest and the MCP
  bundle need no build. `pnpm --filter @prunplanner/engine build` (tsdown)
  writes ESM and `.d.ts` to `dist/`, which `publishConfig.exports` points
  at; `pnpm pack && pnpm smoke` there imports the packed `dist/` in plain
  Node and checks a golden result (CI `build.yml`).
- **Pure and synchronous.** Plain data in and out, never mutates its input.
- **`input: IPlanInput`**: `plan` (`plan_data`, `plan_cogc`, `plan_corphq`,
  `plan_permits_used`), `empire` (faction bonus) and `cxUuid`, all explicit.
  `recipeOptions: false` skips recipe options.
- **`ctx: IPlanContext`**: game data maps (`buildings`, `recipesByBuilding`,
  `materials`), the `planet`, an `IPriceBook` for the plan's CX and planet,
  an optional `trace` and an optional `warn` (data problems the result
  works around, e.g. an unknown recipe id; silent without it). Build it
  with `usePlanContext()`, which passes `console.warn` in development only
  (`devWarn`); the MCP passes none.
- **Output** (`IPlanCalculation`): `result: IPlanResult` and `overview:
  IOverviewData`. `calculateVisitation(result)` gives `IVisitationData`.
  `IPlanResult` and its sub-records are typed in
  `planCalculation.types.ts`.

| File | Concern |
| --- | --- |
| `calculatePlan.ts` | Orchestration |
| `engine.types.ts` | Input, context, output and trace types |
| `workforce.ts` | Need vs capacity, satisfaction, luxury consumption |
| `workforce.constants.ts` | `WORKFORCE_CONSUMPTION_MAP` (also read outside the engine) |
| `area.ts` | Area, permits, infrastructure and storage records |
| `efficiency.ts` | Building efficiency factors, experts |
| `production.ts` | Per building: efficiency, active recipes, daily I/O |
| `recipeOptions.ts` | Every recipe option of a building with revenue, ROI, profit per area |
| `cogm.ts` | COGM per active recipe; `calculateCOGM` is reused by `exchanges/exchangePlanData.util.ts` |
| `fees.ts` | Planet production fees: `weightedProductionFee` per building, `productionFeePerRun`; also used by Production Chains |
| `materialIO.ts` | Combining and enriching material I/O, `TOTALMSDAY` |
| `construction.ts` | Construction materials and cost, infrastructure costs |
| `finance.ts` | Revenue, cost, profit and the overview in one pass |
| `visitation.ts` | Daily import/export weight and volume, storage days |
| `buildings.ts` | Game data helpers: building lookup, construction materials with planet additions, recipes (`getBuildingRecipes`, extraction from planet resources), planet boundaries |
| `trace.ts` | `createPlanTracer`, `tracePriceBook`, `TRACE_PHASES` |

### How a plan is calculated

1. Workforce, area/permits, infrastructure, storage and experts.
2. Production. A building's efficiency is the product of **FERTILITY** (FRM
   and ORC only), **HQ**, **COGC** (program matching the building's
   expertise or workforce), **EXPERT**, **WORKFORCE** (satisfaction) and
   **FACTION** (empire). Recipe runtimes become daily I/O. A building's
   workforce cost is its workers per type × the plan-wide housed share of
   that type (capacity / required, at most 1) with that type's luxuries, so
   summed over buildings it equals the plan's workforce consumption.
3. Workforce consumption + production I/O are combined, enriched with weight
   and volume, and priced.
4. Money: revenue = prices of positive deltas; cost = negative deltas +
   **1/180 of total construction cost per day** (degradation) + **production
   fees** (the planet's fees for the building's expertise, averaged over its
   workforce by headcount; per run on base time, so per day weighted fee ×
   efficiency × amount; 0 without fees); profit =
   revenue − cost.

**Signs.** Material values are `output - input`, so costs are negative in
the result (`constructionCost`, `workforceDailyCost`). The result and the
overview report the same money with different signs and degradation
formulas (`x * (1 / 180)` vs `x / 180`); `finance.ts` keeps both exactly,
down to the sign of zero. Don't "unify" them.

### Tracing

`ctx.trace` (`IPlanTracer`) records every step for the calculation debug
panel. Engine functions take it as an optional trailing parameter and call
`trace?.step({ phase, label, formula, inputs, value, … })` next to the math,
with the value actually used; `trace.group` nests one building or one
recipe's COGM. `calculatePlan` wraps the price book in `tracePriceBook`
(first lookup per ticker and type, with its source).

- Without a tracer nothing changes: traced and untraced results are
  deep-equal (`engine/trace.test.ts`). `createPlanTracer` stops at 10,000
  entries and marks the trace truncated.
- Only `usePlanCalculation().traceCalculation()` traces (plus
  `calculateVisitation`); recipe options and batch callers never do.
- `calcDebug.util.ts` self-checks a traced run: a deliberate second
  calculation (oracle), the one exception to AGENTS.md hard rule 6.
- Switch it on with `?debug=calc` (`?debug=off`) or the `/debug` page
  (`lib/debugMode.ts`); the plan's More menu then has Debug (also
  Ctrl/⌘+\`), opening `components/debug/PlanCalcDebug.vue`.

## `usePlanCalculation` (plan editor adapter)

```ts
const calc = usePlanCalculation(planRef, empireUuidRef?, empireOptionsRef?, cxUuidRef?);
```

- **`result` is a synchronous `computed`** over `calculatePlan`. It
  recalculates when the plan, the empire, the CX uuid or that CX's object in
  `planningStore.cxs` changes. No watchers, no async runs. A failed run
  keeps the last result.
- Game data and the planet load once on creation (a no-op wait when the
  view preloaded them, see [data-layer.md](data-layer.md)); until then
  `result` is `planEmptyResult` (`done: false`). A stopped effect scope
  keeps its last result.
- Also returns `overviewData`, `visitationData`, `calculate()` (async,
  fresh result), `traceCalculation()`, `backendData` (save payload), editor
  state and the `handle*` mutators.
- **Edits** are the `handle*` functions of `usePlanCalculationHandlers.ts`,
  each mutating `plan.plan_data`. Components never write into `result`;
  they emit, and the plan change drives the new result.
- **History** (`usePlanHistory.ts`): each handler call is one undo step
  (watcher edits in the same flush, like hab auto-optimisation, join it;
  `record(fn)` groups several calls). Capped at 50, cleared by `markSaved()`
  on load, save and reload; a save passes the `snapshot()` it sent.
  `modified` compares with the last saved snapshot.

Saving, drafts and versions: [features/planning.md](features/planning.md).

## Batch calculation

Views that need many plans call the engine directly:

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

- Pass `recipeOptions: false` unless you read
  `production.buildings[].recipeOptions`.
- Run the loop through `useRunProgress` (`src/util/runProgress.ts`):
  `start(total)` returns a run with `step()`, `yield()` (give the browser a
  turn) and `isCurrent()` (false once a newer run started or the owner was
  disposed).

| Caller | How |
| --- | --- |
| `views/PlanView.vue` | `usePlanCalculation`; a shared plan gets a second one to compare against (`usePlanSharedCopy`) |
| `PlanCheckMarket`, `PlanCheckCompare`, `planning/util/whatIf.util.ts` | Engine with the plan's context: scaled price books, ask/bid prices, another plan |
| `features/empire/useEmpireCalculation.ts` (`EmpireView`, `FIOBurnView`) | Engine per plan, cached by `planResultCacheKey` (plan, empire, CX) |
| `features/fio_repair/useFIORepair.ts` | Engine per candidate plan |
| `features/exchanges/useExchangePlanData.ts` | Once per plan using a CX (Universe prices); edits re-price without recalculating |
| `features/production_chain/useChainPlans.ts` | Every plan of an empire, for the chain check and own production |
| `features/roi_overview/useROIOverview.ts` | Synthetic single-building plans per recipe, one context |
| `features/resource_roi_overview/useResourceROIOverview.ts` | Synthetic extraction plans per planet (`p-limit`); picks extractors via `getBuildingRecipes` |
| `features/base_roi/baseROIRows.ts` | `calculateBase`: one engine run per row, re-run while fitting storage and area |
| `src/mcp/` (MCP server, [mcp.md](mcp.md)) | `mcp/context.ts` builds the context in Node; tools call the engine, `whatIf.util` and the empire aggregation |

## Empires

An empire (`PlanEmpireElement`: plans, faction, permits) has **no engine of
its own**: `useEmpireCalculation` runs each plan, `EmpireView` aggregates
with the pure `combineEmpireMaterialIO` and `empireCostOverview`
(`features/empire/util/empireMaterialIO.util.ts`, shared with the MCP
server) and pushes the material I/O to the backend (`PatchEmpireState`).

## Prices: `IPriceBook` and `usePrice`

`createPriceBook(getCXData, planetNaturalId, getExchange, onError?)`
(`packages/engine/src/cx/priceBook.ts`) resolves prices synchronously from
preloaded exchange data. Each `(ticker, BUY/SELL)` resolves once per book
and the CX is read once, so **create a new book per calculation** to see
changes. `usePrice(cxUuidRef, planetNaturalIdRef)` gives components async
`getPrice`, `getMaterialIOTotalPrice` and `enhanceMaterialIOMaterial`
through a fresh book.

A CX preference (`CX.cx_data`) resolves first match wins:

1. planet ticker preference;
2. empire ticker preference;
3. planet exchange preference;
4. empire exchange preference;
5. fallback: **UNIVERSE 30-day VWAP** (also used everywhere without a CX).

`BOTH` applies to buy and sell. An unresolvable price is 0; the book
reports its first failure to `onError` (`reportError` in the app).

`src/features/planning/calculations/` holds the hab/storage lists and the
`yalps` LP hab solver (`optimizeHabs`); `calculateExtraction` and the
infrastructure calculations are in the package (`calculations/`).

## Tests and benchmarks

- Engine unit tests: `packages/engine/tests/`, mirroring the package's
  `src/`, run in plain Node (project `engine` of `pnpm test`, no app
  setup). Game data JSON and the `golden` normaliser come from the
  devDependency `@prunplanner/test-data` (`packages/test-data/`), so the
  package's tests import nothing outside it (lint enforces it; they pass with
  `src/tests/` removed); `tests/fixtures/context.ts` builds
  an `IPlanContext` from it without stores or IndexedDB.
- Golden in Node: `calculatePlan.node.golden.test.ts` snapshots two full
  results (`tests/__snapshots__/calculatePlan.*.golden.json`); the app's
  `src/tests/features/planning/integration/engineContext.test.ts`
  calculates the same plans through `usePlanContext` and must match them.
- Integration tests (engine with `usePlanContext`, stores, IndexedDB):
  `src/tests/features/planning/integration/`.
- `usePlanCalculation.characterization.test.ts` snapshots the full result
  for 11 plan cases, through the adapter and through the engine, against
  the same files in `__snapshots__/usePlanCalculation.characterization/`.
  **They are the contract: a changed snapshot is changed numbers.** Update
  with `-u` only on purpose, in its own commit.
- Benchmarks: `usePlanCalculation.bench.ts` (single plan, edit → result)
  and `usePlanCalculation.batch.bench.ts` (empire-like batches, ROI views).
  See [testing.md](testing.md#characterization-snapshots-and-benchmarks).

## Gotchas and design decisions

- **Full recompute** on every change, by design: no invalidation table (one
  missed mapping means stale numbers), no Web Worker (edit → result is about
  a millisecond for a large plan). Memoize by input reference only if
  measured. No Zod on engine data, only at boundaries.
- **Pass a copy, never a store object.** Plans from the planning store are
  inert clones; edit a copy.
- **Results depend on context.** Empire (faction, permits) and CX (prices)
  change the numbers, so a cache key must include both.
- **New math goes into the package** (`packages/engine/src/engine/`) as a
  plain function with a unit test in `packages/engine/tests/`; export it
  from `src/index.ts` only when the app or MCP uses it.
