# cx

**Purpose.** This folder is responsible for **material price resolution**
and small CX helpers. Every price in the app comes from `usePrice`.

**Used by.**
- The plan engine.
- Empire opportunities.
- The ROI tools, the HQ calculator, repair analysis, XIT burn and upkeep.
- `MaterialTile` and `MarketExplorationView`.

## Key files

- **`usePrice.ts`**: `await usePrice(cxUuidRef, planetNaturalIdRef)`
  provides:
  - `getPrice(ticker, "BUY" | "SELL")`;
  - `enhanceMaterialIOMaterial(io[])`, which adds a `price` to each
    material I/O row;
  - `getMaterialIOTotalPrice`;
  - `calculateInfrastructureCosts(planet)`.

  The header comment documents the resolution order: planet ticker →
  empire ticker → planet exchange → empire exchange → UNIVERSE 30D VWAP.
- **`usePrice.types.ts`**: `IInfrastructureCosts`.
- **`useCXData.ts`**:
  - `findEmpireCXUuid(empireUuid)` returns the CX assigned to an empire;
  - `getPreferenceOptions(includeNone)` returns select options, where
    "None" means Universe 30D.
- **`components/MaterialCXOverviewTable.vue`**: per-exchange price and
  volume table for one material, including market share.

## Data

- Exchange prices come from `useExchangeData()`, which reads the
  `gamedata_exchanges` table in IndexedDB.
- CX rules come from `planningStore.getCX(uuid)`.

## Gotchas

- **Pass `cxUuid` as `undefined` for universe prices.** Don't pass an empty
  string.
- **The CX must be loaded first.** `usePrice` reads `planningStore`
  synchronously, so load the CX set (`WrapperPlanningDataLoader load-c-x`)
  before calculating.

## Tests

`src/tests/features/cx/usePrice.test.ts` and `useCXData.test.ts`.
