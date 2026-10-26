# exchanges

**Purpose.** This folder is the Exchanges page for a **CX preference**
(`CX`): the rules that decide which price a plan uses for each material.
It shows the prices the linked empires' plans get and why (the cascade),
and edits the all-planets rule, planet exceptions and fixed prices, with
CSV import and export. How prices are resolved is in [cx.md](cx.md); this
folder never changes a price result.

**Used by.**
- `views/ExchangesView.vue` (`/exchanges/:cxUuid?`, scope in
  `?scope=all|<planet>`, none = Overview), which saves with `PatchCX`
  through `useCXSave`.
- `PlanCOGM` reuses `CXFixedPriceTable`, the label, fixed price and edit
  utils, and `useExchangePlanData`; `PlanCOGMTable` and `PlanCheckMarket`
  the labels and `ALL_PLANETS`, the material market card `CX_DOT_COLOR`.
- `CXPreferenceSelector` is the "pick a CX" dropdown in the tools
  (`ROIOverviewView`, `ResourceROIOverviewView`, `HQUpgradeCalculatorView`,
  `UpkeepPriceCalculatorView`, profile `UserPreferences`, `FIORepairSettings`,
  the production chain's `ChainSettings` and `CheckBar`). It shows the
  user's default CX over its `cxUuid` prop (unless `followDefault` is false,
  e.g. a CX from a link), emits it as `update:cxuuid` and stores a picked CX
  as the new default.

## Key files

| File | Role |
| --- | --- |
| `useExchangeEdit.ts` | Edit state: loaded CX (inert clone), edited name and `cx_data`, `changeCount` |
| `cxEdit.util.ts` | `changedScopes` (save bar count), `setPlanetRules`, `planetsWithRules`, `buildPayload` (keeps rules of planets without a plan) |
| `exchangeRule.util.ts` | Exchange rule ↔ controls (mode, exchange, basis), presets; never BOTH with BUY or SELL, Universe only VWAPs |
| `fixedPrices.util.ts` | Fixed prices ↔ rows keeping the stored shape, `setBuyPrice`, `withoutFixedPrice` (market price) |
| `exchangeLabel.util.ts` | "NC1 · VWAP 30D", "Fixed · all planets", "… · no price"; `isNoPrice`; CX colour dots |
| `exchangeNotes.util.ts` | Notes: 0 ȼ exchange gaps, no price, fixed 0, COGM drift (`COGM_DRIFT_THRESHOLD`), redundant planet rule, unused preference, planets without a plan |
| `useExchangePlanData.ts` (+ `exchangePlanData.util.ts`) | Calculates each linked plan once with the engine, keeps the price-free parts and re-prices Material I/O and COGM (`calculateCOGM`) from the unsaved rules, debounced 250 ms |
| `useCXImportExport.ts` | Parse and generate the preferences CSV (`papaparse`); columns Location, Type, CX, Ticker, Price |
| `components/CXHeader.vue` | Name, Import / Export CSV (import asks before replacing), rename and manage menu, help |
| `components/CXPreferenceSwitch.vue` | "Switch Preference" select and "Used by" links |
| `components/CXScopeList.vue` | Overview, All planets, planets with own rules, planets using all-planets rules, other empires, Not in any plan; a select below 1024 px |
| `components/CXOverview.vue` | Summary, notes, "Prices your plans use" with filters and expandable cascade |
| `components/CXScopeRules.vue` | Rules of one scope: `CXExchangeRule`, `CXFixedPriceTable`, `CXPlanetPrices` |
| `components/CXExchangeRule.vue` | Presets, mode, exchange and basis of a scope |
| `components/CXFixedPriceTable.vue` | Fixed prices with market, COGM and Override; shared with COGM |
| `components/CXPriceLadder.vue` | One price's cascade from `explainPrice` |
| `components/CXNotes.vue`, `CXSourceTag.vue`, `CXPlanetPrices.vue` | Notes (collapsed behind a count button beside the heading; COGM drifts as one table with the gap), source tag, "Prices on <planet>" |
| `components/CXPreferenceSelector.vue` | Reusable CX dropdown, built on `useCXData().getPreferenceOptions` |

## Data

- The shape is `CXData` in `src/features/api/schemas/cxData.schemas.ts`:
  `cx_empire` and `ticker_empire` (shown as "All planets"), `cx_planets`
  and `ticker_planets`.
- CX sets load into `planningStore.cxs` through `GetAllCX`; the page also
  loads the plan list and empire list for the plan prices.

## Gotchas

- The backend rejects a `BOTH` rule alongside a `BUY` or `SELL` rule for
  the same target; the controls can't produce it.
- A matching exchange rule whose exchange has no value prices the
  material at 0 ȼ (no fall-through). The page shows it as a warning note,
  in the price tables and in the cascade.
- `useExchangePlanData` waits for materials, exchanges, buildings,
  recipes and the plans' planets itself (cached queries, joining a
  loader's request in flight) instead of a `WrapperGameDataLoader` gate,
  so a direct visit with an empty cache works and only the price table
  waits.
- Saving keeps every stored planet entry the player didn't remove, also
  planets no plan uses any more (listed under "Not in any plan").
- Saving a CX changes `planningStore.cxs`, which makes every mounted
  `usePlanCalculation` recalculate.
- An import replaces all four rule lists, unsaved until Save.
  `parseSettingsCSV` rejects a file without one of the columns or with a
  row that is no valid preference, so a wrong file changes nothing.

## Tests

`src/tests/features/exchanges/` (utils, plan data, components) and
`src/tests/views/ExchangesView.test.ts`; `src/tests/features/cx/priceRegression.test.ts`
guards that prices stay unchanged.
