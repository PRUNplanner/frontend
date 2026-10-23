# material_tile

**Purpose.** `MaterialTile.vue` is the standard component for showing a
material ticker anywhere in the app. It is a coloured chip with the
material's category colour and can show an amount or progress bar, the
market card and the Market details drawer. Use it instead of printing raw
tickers.

**Used by.** More than 30 places: plan panels, empire I/O, FIO burn, the ROI
tables, the XIT buttons, the CX preference editors, market exploration and
more.

## Key files

- `components/MaterialTile.vue`:
  - **Props:** `ticker`, plus optional `amount`, `max`, `daily` (+ sold,
    − bought per day), `dailyContext` (`plan`, `empire` or `setup`, the
    plan line's wording), `marketCheck` (the row's `IMarketCheck`, marks
    "your CX"), `disableDrawer`, `enablePopover`, `popoverPlacement`.
  - **Material data** comes from `useMaterialData().getMaterial` and
    `getMaterialClass` on mount. The category CSS classes live in
    `src/assets/css/materials.css`.
  - **The market card** is a `PHoverCard` (hover intent, see
    `docs/ui-and-i18n.md`). `getMaterialExchangeOverview` runs on the first
    open (card, sheet or drawer), not on mount, and is kept for the tile's
    life.
  - **A click** opens the drawer where it is enabled (Plan Material I/O,
    HQ calculator), else pins the card; on touch or below 560 px it opens
    the card as a bottom sheet.
- `components/MaterialMarketCard.vue`: header, plan line, one row per
  exchange plus Universe (30-day sparklines from `GetCXSparklines`, one
  cached request per exchange, on one scale), summary lines, and the
  "Market Exploration" and "Market details" buttons. `sheet` is the phone
  layout; `narrow` (less than 626 px beside the ticker) stacks the VWAPs and
  drops Spread. Sparklines load 250 ms after it opens.
- `components/MaterialMarketDetails.vue`: the drawer. Material facts, data
  date, active exchanges, the plan block, `MaterialExchangeTable`, the
  30-day `MaterialDataChart` and four market health tiles.
- `components/MaterialExchangeTable.vue`: Prices / Order books / Volume
  over the same rows; also on Market Exploration (without plan columns).
- `components/MaterialMarketPlanLine.vue`: the plan's amount and verdict,
  in card and drawer.
- `materialMarket.util.ts`: the numbers, pure (`marketRows`, `planLine`,
  `marketSummary`, `shareVerdict`, `isRare`, `sharedDomain`). Text comes
  back as i18n refs (`ITextRef`).

## Rules

- **One verdict.** Shares use Market check's limits
  (`MARKET_SHARE_AMBER` 10 %, `MARKET_SHARE_RED` 50 %). With a
  `marketCheck` the plan line shows that check as it is (level, share,
  flag); without one it judges all four exchanges.
- **Spread % is `(ask − bid) / ask`.** A missing bid or ask shows "no bids"
  / "no asks", never a spread.
- **No best price or best exchange highlight.** Only the "your CX" row is
  tinted, and only with a check.
- **Rarely traded** below one unit per day on all four exchanges.
- **No data date in the card**, only in the drawer.

## Analytics

`material:market_drawer_open` (`source`: `tile` or `card`) and
`material:market_card_pin`. No event per hover.

## Gotchas

- **Game data must be loaded first.** The tile loads its material on mount,
  so render it inside `WrapperGameDataLoader load-materials`.
- **Give the tile a unique `key` in lists.** The component enforces this on
  mount.
- **`daily` is signed.** Inputs are negative (ROI overview passes them so).

## Tests

`src/tests/features/material_tile/`: `materialMarket.util.test.ts` and the
component tests for the tile, card and drawer; `src/tests/ui/useHoverCard.test.ts`.
