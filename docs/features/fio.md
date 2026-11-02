# fio

**Purpose.** FIO Burn and storage helpers on the user's FIO data (in-game
storage and sites from the community FIO service, proxied by the backend,
linked in the profile).

**Used by.** `views/fio/FIOBurnView.vue` (`/fio/burn`); `PlanSupplyCart`,
`PlanConstructionCart` (subtract owned stock); `useHQUpgradeCalculator`. FIO
Repair: [fio_repair](fio_repair.md).

## Key files

- `useFIOBurn.ts`: days of supply per planet from plan consumption and FIO
  stock (`burnTable`, `planTable`).
- `useFIOStorage.ts`: grouped storage select options, `planetStorageId`
  (only if FIO has storage there), `findMaterial(ticker)` across storages.
- `fioBurn.util.ts`: `burnAxisMax` (3 × yellow), `burnSummary`.
- `components/FIOBurnTable.vue`, `FIOBurnPlanTable.vue`: burn UI with XIT
  resupply.

## Data

- FIO storage and sites live in `planningStore.fio_*`, in memory only (too
  big for the storage quota). Loaded by `GetFIOStorage`, which `AppSidebar`
  triggers while the user has FIO and `fioStatus` is `ok` or `error` (other
  states 404), and `PlanConstructionCart` on demand. In other states the
  sidebar drops the query cache, but `fio_*` stays until logout.
- The burn view calculates plans with `useEmpireCalculation`, then feeds
  `useFIOBurn`.
- Preferences `burnDaysRed`, `burnDaysYellow`, `burnResupplyDays`.

## Tests

`src/tests/features/fio/`; `src/tests/views/fio/FIOBurnView.test.ts`.
