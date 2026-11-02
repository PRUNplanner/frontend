# xit

**Purpose.** Generates XIT action JSON users paste into community in-game
tooling (refined-prun's XIT ACT) to automate CX buys and transfers.
PRUNplanner never talks to the game.

**Used by.** FIO burn table, plan supply and construction carts, repair
analysis, HQ upgrade calculator, FIO repair, production chain buy list;
profile `UserPreferences` sets the default origin and "buy from CX".

## Key files

| File | Role |
| --- | --- |
| `useXITAction.ts` | `transferJSON(materials, { name, origin, destination, buy })`: optional `CX Buy` plus an `MTRA` transfer |
| `useBurnXITAction.ts` | Resupply material table with weight/volume/cost totals, `fit()` for the days that fit |
| `xitConstants.ts`, `xitAction.types.ts` | Origin stations and station → CX map; the JSON shape (`IXITJSON`) |
| `components/` | `XITTransferActionButton`, `XITBurnActionButton` |

## Gotchas

- **The JSON is an external contract**: change `IXITJSON` only to match XIT
  ACT.
- **Buy is added** only when `buy` is set and the origin maps to a CX.
- **The action name** is `PRUNplanner <name>` stripped to letters, digits,
  spaces, `.` and `-` (XIT ACT rejects others); `MTRA` sets `noSfc`.

## Tests

`src/tests/features/xit/`.
