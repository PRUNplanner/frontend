# exchanges

**Purpose.** This folder is the editor for a **CX preference** set (`CX`):
the rules that decide which price a plan uses for each material. It covers
exchange-level rules (e.g. "buy at AI1 30D VWAP") and fixed ticker prices,
at empire level and per planet. It also offers CSV import/export.

**Used by.**
- `views/ExchangesView.vue` (`/exchanges/:cxUuid?`), which saves with
  `PatchCX`.
- `CXPreferenceSelector` is reused as the "pick a CX" dropdown in the tools:
  `ROIOverviewView`, `ResourceROIOverviewView`, `HQUpgradeCalculatorView`,
  `UpkeepPriceCalculatorView` and profile `UserPreferences`. It shows the
  user's default CX (if it still exists) over its `cxUuid` prop, emits
  that default as `update:cxuuid` so the view calculates with it, and
  stores a picked CX as the new default.
- `PlanCOGM` embeds `CXTickerPreference`.

## Key files

| File | Role |
| --- | --- |
| `useManageCX.ts` → `useCXManagement()` | Select options (preference type BUY/SELL/BOTH, exchange options, materials) and immutable update/delete helpers for exchange and ticker preferences |
| `useCXImportExport.ts` | Parse and generate the preferences CSV (`papaparse`); columns: Location, Type, CX, Ticker, Price |
| `manageCX.types.ts` | `ICXPlanetMap` (the exchange and preference type unions are `CXExchangeOptionType` / `CXPreferenceType` in `api/schemas/cxData.schemas.ts`) |
| `components/CXExchangePreference.vue` | Exchange-rule list editor |
| `components/CXTickerPreference.vue` | Ticker-price list editor |
| `components/CXPlanetPreferenceTable.vue` | Per-planet overrides |
| `components/CXPreferenceImportExport.vue` | CSV UI |
| `components/CXPreferenceSelector.vue` | Reusable CX dropdown, built on `useCXData().getPreferenceOptions` |

## Data

- The shape is `CXData` in `src/features/api/schemas/cxData.schemas.ts`: it holds
  `cx_empire`, `cx_planets`, `ticker_empire` and `ticker_planets`.
- CX sets load into `planningStore.cxs` through the `GetAllCX` query.
- How prices are resolved from these rules is documented in
  [cx.md](cx.md).

## Gotchas

- The backend rejects a `BOTH` rule alongside a `BUY` or `SELL` rule for the
  same target, so the UI must prevent that combination.
- Saving a CX changes `planningStore.cxs`, which makes every mounted
  `usePlanCalculation` recalculate (its result is a `computed`).
- An import replaces all four preference lists. `parseSettingsCSV` rejects
  a file that lacks one of the columns, or has a row that is no valid
  preference (checked with the CX payload schemas, an empty price is
  invalid), so a wrong file changes nothing.

## Tests

`src/tests/features/exchanges/useManageCX.test.ts` and
`useCXImportExport.test.ts`.
