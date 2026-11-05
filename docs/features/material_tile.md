# material_tile

**Purpose.** `MaterialTile.vue` is the standard material ticker chip
(category colour, optional amount or progress bar) with the market hover
card and the Market details drawer. Use it instead of printing raw tickers.

**Used by.** 40+ files: plan panels, empire I/O, FIO burn, ROI tables, XIT,
CX preference editors, Market Exploration (`MaterialExchangeTable`) and more.

## Key files

- `components/MaterialTile.vue`: loads its material (`useMaterialData`) on
  mount; category classes in `src/assets/css/materials.css`. The market card
  is a `PHoverCard` ([ui-and-i18n.md](../ui-and-i18n.md)); the exchange
  overview loads on first open, not on mount. A click opens the drawer
  (unless `disableDrawer`), otherwise pins the card; on touch or below
  560 px it opens the card as a bottom sheet. The profile setting "On click
  only" (`marketCardTrigger`) makes a click always pin the card.
- `components/MaterialMarketCard.vue`: per-exchange rows plus Universe with
  30-day sparklines (`GetCXSparklines`, loaded 250 ms after opening),
  summary lines, Market Exploration and Market details buttons. `sheet` is
  the phone layout; `narrow` stacks VWAPs and drops Spread.
- `components/MaterialMarketDetails.vue`: the drawer (facts, data date,
  `MaterialExchangeTable`, 30-day `MaterialDataChart`, health tiles).
- `components/MaterialExchangeTable.vue`: Prices / Order books / Volume.
- `components/MaterialMarketPlanLine.vue`: the plan's amount and verdict.
- `materialMarket.util.ts`: pure numbers (`marketRows`, `planLine`,
  `marketSummary`, `shareVerdict`, `isRare`, `sharedDomain`); text comes back
  as i18n refs (`ITextRef`).

## Rules

- **One verdict.** Shares use Market check's limits (`MARKET_SHARE_AMBER`,
  `MARKET_SHARE_RED` in `cx/marketCheck.util.ts`). With a `marketCheck` prop
  the plan line shows that check as is; without one it judges all four
  exchanges.
- **Spread % is `(ask − bid) / ask`.** A missing bid or ask shows "no bids" /
  "no asks", never a spread.
- **No best price highlight.** Only the "your CX" row is tinted, and only
  with a check.
- **Rarely traded:** Universe 30-day volume below 1 unit per day.
- Data date only in the drawer, not the card.

## Gotchas

- **Game data must be loaded first**: render inside
  `WrapperGameDataLoader load-materials`.
- **The material loads only on mount** (no watch on `ticker`): key the tile
  by ticker in lists so a changed ticker re-mounts it.
- **`daily` is signed**: + sold, − bought per day.

## Tests

`src/tests/features/material_tile/`, `src/tests/ui/useHoverCard.test.ts`.
