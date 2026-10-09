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

`src/tests/features/cx/priceBook.test.ts`, `usePrice.test.ts`,
`useCXData.test.ts`, `useCXSave.test.ts` and `cxDiff.test.ts`.
