# fio

**Purpose.** This folder holds the tools built on the user's **FIO** data:
real in-game storage and base sites, mirrored by the community FIO service.
The backend proxies the data, and the user links FIO in their profile.

**Used by.**
- `views/fio/FIOBurnView.vue` (`/fio/burn`). FIO Repair (`/fio/repair`)
  has its own folder, see [fio_repair](fio_repair.md).
- `PlanSupplyCart` and `PlanConstructionCart`, which subtract stock the user
  already has.
- `useHQUpgradeCalculator`.

## Key files

| File | Role |
| --- | --- |
| `useFIOBurn.ts` | `useFIOBurn(plans, planResults)` computes days of supply per planet from the plan's daily consumption and FIO stock. Its outputs are `planTable` and the burn table |
| `useFIOStorage.ts` | `storageOptions` (planets / warehouses / ships as grouped select options), `planetStorageId(planet)` (the `PLANET#id` option, only if FIO has storage there) and `findMaterial(ticker)` across all storages |
| `fioBurn.util.ts` | `burnAxisMax` (3 × the yellow threshold) and `burnSummary` (red, yellow, consumed and produced counts of a plan) |
| `components/FIOBurnTable.vue`, `FIOBurnPlanTable.vue` | Burn UI, with XIT resupply buttons |

## Data

- FIO storage and sites live in `planningStore.fio_*`, in memory only (not
  persisted: too big for the storage quota, and refetched on every app load).
  They are loaded by the `GetFIOStorage` query (`callDataFIOStorage`),
  which `AppSidebar` (mounted on every screen size) triggers whenever the
  user has FIO and `userStore.fioStatus` is `ok` or `error` (the states
  that can have stored data, so also when polling turns `syncing` into
  `ok`) and `PlanConstructionCart` triggers when needed. In
  every other state the sidebar drops the query cache, but
  `planningStore.fio_*` stays until logout.
- The burn view calculates every plan with the planning engine
  (`calculatePlan`, game data loaded once) first, then passes the results
  into `useFIOBurn`.
- Burn colour thresholds come from the preferences `burnDaysRed` and
  `burnDaysYellow`; the XIT resupply buttons (`XITBurnActionButton`) use
  `burnResupplyDays`.

## Tests

`src/tests/features/fio/`: `useFIOBurn.test.ts`, `useFIOStorage.test.ts`,
`fioBurn.util.test.ts` and `components/`; the page in
`src/tests/views/fio/FIOBurnView.test.ts`.
