# exchanges

**Purpose.** The Exchanges page for a CX preference: which price each linked
plan gets and why (the cascade), editing of the all-planets rule, planet
exceptions and fixed prices, CSV import/export. Resolution itself is in
[cx](cx.md); this folder never changes a price result.

**Used by.** `views/ExchangesView.vue` (`/exchanges/:cxUuid?`,
`?scope=all|<planet>`, none = Overview; saves via `useCXSave`). The plan's
COGM tool reuses `CXFixedPriceTable`, the label/edit utils and
`useExchangePlanData`; `material_tile` uses `CX_DOT_COLOR`.
`CXPreferenceSelector` is the CX dropdown of the tools, profile, FIO repair,
base ROI and production chain.

## Key files

- `useExchangeEdit.ts`: edit state (inert clone, edited name and `cx_data`,
  `changeCount`); `cxEdit.util.ts` builds the payload.
- `exchangeRule.util.ts` (rule ↔ controls, presets), `fixedPrices.util.ts`,
  `exchangeLabel.util.ts` (source labels, `CX_DOT_COLOR`),
  `exchangeNotes.util.ts` (warnings incl. COGM drift
  `COGM_DRIFT_THRESHOLD`).
- `useExchangePlanData.ts`: calculates each linked plan once, then re-prices
  Material I/O and COGM from the unsaved rules (debounced 250 ms).
- `useCXImportExport.ts` (+ `manageCX.types.ts`): CSV via `papaparse`,
  columns Location, Type, CX, Ticker, Price.
- `components/CXPreferenceSelector.vue`: `v-model:cx-uuid`; shows the user's
  default CX unless `followDefault` is false (e.g. a CX from a link) and
  stores a pick as the new default.
- `components/`: page parts (`CXHeader`, `CXScopeList`, `CXOverview`,
  `CXScopeRules`, `CXPriceLadder` from `explainPrice`, …).

## Gotchas

- The backend rejects a `BOTH` rule next to a `BUY`/`SELL` rule for the same
  target; the controls can't produce it. Universe offers only VWAP bases.
- A matching exchange rule without a value prices at 0 ȼ (no
  fall-through); the page warns about it.
- `useExchangePlanData` loads its own game data (cached queries) instead of a
  `WrapperGameDataLoader` gate, so a cold direct visit works and only the
  price table waits.
- Saving keeps stored planet entries the user didn't remove, even for
  planets no plan uses ("Not in any plan").
- Saving changes `planningStore.cxs`, which recalculates every mounted
  `usePlanCalculation`.
- An import replaces all four rule lists (unsaved until Save) and rejects
  a file with a missing column or invalid row, changing nothing.

## Tests

`src/tests/features/exchanges/`, `src/tests/views/ExchangesView.test.ts`;
`src/tests/features/cx/priceRegression.test.ts` guards prices.
