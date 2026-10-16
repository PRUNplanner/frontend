# cx

**Purpose.** This folder is responsible for **material price resolution**
and small CX helpers. Every price in the app is resolved by a `PriceBook`
(`priceBook.ts`); components use it through `usePrice`.

**Used by.**
- The plan engine.
- Empire opportunities.
- The ROI tools, the HQ calculator, repair analysis, XIT burn and upkeep.
- `MaterialTile` and `MarketExplorationView`.

## Key files

- **`priceBook.ts`**: plain TypeScript, no Vue.
  `createPriceBook(getCXData, planetNaturalId, getExchange)` returns a book
  whose `getPrice(ticker, "BUY" | "SELL")` is synchronous. It reads the CX
  once and resolves each (ticker, type) once; create a new book to pick up
  changes. Also `getMaterialIOTotalPrice(book, io, type)`,
  `enhanceMaterialIOMaterial(book, io)` and `getExchangeCodeKey`. The
  header comment documents the resolution order: planet ticker → empire
  ticker → planet exchange → empire exchange → UNIVERSE 30D VWAP. A price
  that can't be resolved is 0 and logged.
  `getPriceSource(ticker, type)` tells where a price came from, resolved
  and cached with it: `level` (`planet_ticker`, `empire_ticker`,
  `planet_exchange`, `empire_exchange`, `fallback`, `unresolved`),
  `exchange` and `key` (null for fixed ticker values), `zero`, and
  `volume`, the exchange whose traded volume the price is checked against
  (the source's exchange, else the planet or empire exchange preference,
  else UNIVERSE). `scaledPriceBook` passes it through.
  A matching exchange rule whose exchange has no value for the material
  gives 0 (`zero: true`); it does not fall through to Universe.
  `findTickerRule` / `findExchangeRule` are the book's rule lookups;
  `explainPrice(cxData, planet, ticker, type, getExchange)` uses them to
  list every level of the cascade with its value and the winner, for the
  Exchanges page (a test asserts it agrees with the book).
- **`marketCheck.util.ts`**: market flags.
  - `marketCheck(flows, book, getExchange)` checks each material's daily
    flow against its volume exchange: share of the 30-day daily volume
    (amber ≥ 10 %, red ≥ 50 %, constants calibrated on real plans), no
    trades in 7 days, no offers or buyers, no price, all exchanges
    (fallback) and stale data. Spreads are shown, never flagged.
  - `askBidPriceBook(book, getExchange)` buys at ask and sells at bid, for
    the plan at real prices (`planning/util/whatIf.util.realisticPlan`).
  - Used by the plan's and the empire's Material I/O
    (`components/MarketFlagButton`, `MarketFlagIcon`) and Plan check.
- **`usePrice.ts`**: `usePrice(cxUuidRef, planetNaturalIdRef)`, the async
  API for components:
  - `getPrice(ticker, "BUY" | "SELL")`;
  - `enhanceMaterialIOMaterial(io[])`, which adds a `price` to each
    material I/O row;
  - `getMaterialIOTotalPrice`.

  Each call makes sure exchange data is loaded (a no-op once the game data
  loaders ran) and resolves through a price book. The planning engine
  builds its own book per calculation (`usePlanContext`).
- **`usePrice.types.ts`**: `IInfrastructureCosts` (calculated by the
  planning engine, `engine/construction.ts`).
- **`useCXData.ts`**:
  - `findEmpireCXUuid(empireUuid)` returns the CX assigned to an empire;
  - `getPreferenceOptions(includeNone)` returns select options, where
    "None" means Universe 30D.
- **`useCXSave.ts`**: saves a CX edited on the Exchanges page or in a
  plan's COGM tool with the version the edit started from; saved or
  deleted in another tab opens the save conflict dialog or sets
  `remoteNotice` (see [save_conflict](save_conflict.md)). `isEdited`
  compares through `cxDiff`.
- **`cxDiff.ts`**: `diffCX(from, to)`, what changed in a CX's name,
  exchanges and ticker prices, for the empire and per planet.
- **`components/MaterialCXOverviewTable.vue`**: per-exchange price and
  volume table for one material, including market share.

## Data

- Exchange prices come from `useExchangeData()`, which reads the
  `gamedata_exchanges` table in IndexedDB. Price books read the preloaded
  in-memory cache synchronously (`getExchangeTickerLoaded`).
- CX rules come from `planningStore.getCX(uuid)`.

## Gotchas

- **Pass `cxUuid` as `undefined` for universe prices.** Don't pass an empty
  string.
- **The CX must be loaded first.** Price books read `planningStore`
  synchronously, so load the CX set (`WrapperPlanningDataLoader load-c-x`)
  before calculating.

## Tests

`src/tests/features/cx/priceBook.test.ts`, `marketCheck.util.test.ts`,
`usePrice.test.ts`, `useCXData.test.ts`, `useCXSave.test.ts`,
`cxDiff.test.ts`; the flag button is tested through `planning/components/PlanMaterialIO.test.ts`.
