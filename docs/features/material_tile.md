# material_tile

**Purpose.** `MaterialTile.vue` is the standard component for showing a
material ticker anywhere in the app. It is a coloured chip with the
material's category colour and can show an amount or progress bar, a
popover and a market drawer. Use it instead of printing raw tickers.

**Used by.** More than 20 places: plan panels, empire I/O, FIO burn, the ROI
tables, the XIT buttons, the CX preference editors, market exploration and
more.

## Key file

`components/MaterialTile.vue`:
- **Props:** `ticker`, plus optional `amount`, `max`, `disableDrawer`,
  `enablePopover` and similar.
- **Material data** comes from `useMaterialData().getMaterial` and
  `getMaterialClass`. The category CSS classes live in
  `src/assets/css/materials.css`.
- **The market drawer** shows `market_exploration/components/MaterialDataChart`
  and `cx/components/MaterialCXOverviewTable`, and tracks a
  `material:market_drawer_open` analytics event.

## Gotchas

- **Game data must be loaded first.** The tile loads its material on mount,
  so render it inside `WrapperGameDataLoader load-materials`.
- **Give the tile a unique `key` in lists.** The component enforces this on
  mount.

## Tests

None. Coverage excludes `components/`.
