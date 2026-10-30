# xit

**Purpose.** This folder generates **XIT action JSON**, which users paste
into community in-game tooling to automate CX buys and material transfers.
PRUNplanner only produces the JSON. It never talks to the game.

**Used by.**
- The FIO burn table.
- The plan tools: supply cart, construction cart and repair analysis.
- The HQ upgrade calculator, the FIO repair base panel and the production
  chain buy list (`ChainBuyList`, `useXITAction` directly).
- Profile `UserPreferences`, which sets the default origin and "buy from CX".

## Key files

| File | Role |
| --- | --- |
| `useXITAction.ts` | `transferJSON(materials, { name, origin, destination, buy })`: a computed JSON string with an optional `CX Buy` action plus an `MTRA` transfer action |
| `useBurnXITAction.ts` | `useBurnXITAction({ elements, resupplyDays, hideInfinite, materialOverrides, materialInactives, cxUuid?, planetNaturalId? })`: resupply material table and totals (weight, volume, cost via `usePrice`); reads its refs only, `fit()` returns the days that fit |
| `xitConstants.ts` | `XITSTATIONWAREHOUSES` (origin options) and `XITSTATIONWAREHOUSESTOCX` (station → exchange code) |
| `xitAction.types.ts` | The JSON shape (`IXITJSON`, action types) |
| `components/XITTransferActionButton.vue`, `XITBurnActionButton.vue` | Buttons that open the JSON |

## Gotchas

- **The JSON format is an external contract.** Change `IXITJSON` only to
  match the consuming tool.
- **A buy action is only added** when `buy` is true and the origin station
  maps to a CX.
- **The action name is sanitised** to `PRUNplanner <name>` with only
  letters, digits, spaces, `.` and `-` (refined-prun's XIT ACT rejects
  others). The `MTRA` action sets `noSfc`.

## Tests

`src/tests/features/xit/useXITAction.test.ts`, `useXITBurnAction.test.ts`,
`xitConstants.test.ts` and `components/*.test.ts`.
