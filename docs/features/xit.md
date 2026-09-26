# xit

**Purpose.** This folder generates **XIT action JSON**, which users paste
into community in-game tooling to automate CX buys and material transfers.
PRUNplanner only produces the JSON. It never talks to the game.

**Used by.**
- The FIO burn table.
- The plan tools: supply cart, construction cart and repair analysis.
- The HQ upgrade calculator.
- Profile `UserPreferences`, which sets the default origin and "buy from CX".

## Key files

| File | Role |
| --- | --- |
| `useXITAction.ts` | `transferJSON(materials, { name, origin, destination, buy })`: a computed JSON string with an optional `CX Buy` action plus an `MTRA` transfer action |
| `useBurnXITAction.ts` | `await useBurnXITAction(elements, resupplyDays, hideInfinite, overrides, inactives, cxUuid, planetId)`: resupply material table and totals (weight, volume, cost via `usePrice`) |
| `xitConstants.ts` | `XITSTATIONWAREHOUSES` (origin options) and `XITSTATIONWAREHOUSESTOCX` (station → exchange code) |
| `xitAction.types.ts` | The JSON shape (`IXITJSON`, action types) |
| `components/XITTransferActionButton.vue`, `XITBurnActionButton.vue` | Buttons that open the JSON |

## Gotchas

- **The JSON format is an external contract.** Change `IXITJSON` only to
  match the consuming tool.
- **A buy action is only added** when `buy` is true and the origin station
  maps to a CX.

## Tests

`src/tests/features/xit/useXITAction.test.ts`, `useXITBurnAction.test.ts`
and `xitConstants.test.ts`.
