# cx

**Purpose.** Material price resolution and CX helpers. Every price in the app
comes from a `PriceBook` (`priceBook.ts`); components use `usePrice`.

**Used by.** The plan engine (`usePlanContext` builds a book per
calculation), empire, all ROI/cost tools, XIT burn, `material_tile`,
exchanges and the production chain.

## Key files

- `priceBook.ts` (plain TS): `createPriceBook(getCXData, planet, getExchange,
  onError?)` → synchronous `getPrice(ticker, "BUY" | "SELL")` and
  `getPriceSource()` (level, exchange, key, `zero`, `volume` exchange).
  Order: planet ticker → empire ticker → planet exchange → empire exchange →
  Universe 30D VWAP. `explainPrice` lists every cascade level (Exchanges
  page), `scaledPriceBook`, Material I/O helpers.
- `marketCheck.util.ts`: flags a material's daily flow vs its volume
  exchange (share of 30-day volume ≥ `MARKET_SHARE_AMBER` 10 % /
  `MARKET_SHARE_RED` 50 %, no trades in 7 days, no offers/buyers, no price,
  fallback, stale); spreads never flagged. `askBidPriceBook` buys at ask,
  sells at bid. Thresholds and `formatShare` are shared with
  `material_tile/materialMarket.util.ts` so both agree.
  `components/MarketFlagButton.vue` / `MarketFlagIcon.vue` show the flags.
- `usePrice.ts`: async wrappers that first ensure exchange data is loaded;
  `getPriceBook()` for bulk callers.
- `useCXData.ts`: `findEmpireCXUuid`, `getPreferenceOptions` ("None" =
  Universe 30D).
- `useCXSave.ts`: saves a CX (Exchanges page, plan COGM) with its base
  version; conflicts per [save_conflict](save_conflict.md); diffs via
  `cxDiff.ts`.

## Gotchas

- A book resolves each (ticker, type) once; create a new one to see CX or
  exchange changes.
- A matching exchange rule without a value gives 0 (`zero: true`), no
  fall-through to Universe. Unresolvable prices are 0 (`unresolved`),
  reported once per book via `onError`.
- Pass `cxUuid` as `undefined` for universe prices, never `""`.
- Load the CX set first (`WrapperPlanningDataLoader load-c-x`): books read
  `planningStore.getCX` and the exchange cache
  (`getExchangeTickerLoaded`) synchronously.

## Tests

`src/tests/features/cx/` (`explainPrice.test.ts` asserts it agrees with the
book; `priceRegression.test.ts` snapshots every price, source, profit and
COGM); flag button via `planning/components/PlanMaterialIO.test.ts`.
