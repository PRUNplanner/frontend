# fio_repair

**Purpose.** FIO Repair (`/fio/repair`): when each FIO base comes due for
repair, the bill, the cost of waiting per day, and one repair flight per base
as an "XIT Repair" package.

**Used by.** `views/fio/FIORepairView.vue` (lazy `FIORepairOverview`);
`PlanRepairAnalysis` reuses `isInfrastructureBuilding`.

## Key files

- `fioRepair.util.ts` (pure): age, status, bill, waiting cost, plan
  matching, best days (Repair Analysis's `repairCurveOf`), timeline layout.
  Types in `fioRepair.types.ts`.
- `useFIORepair.ts`: `bases` (most urgent first), `load()` (planets, prices,
  matched plans via the engine, cached by `planResultCacheKey`), `flight()`.
- `components/FIORepairOverview.vue` and its parts (panel beside the list
  from 1200 px, a `PDrawer` below).

## Data

- Sites and stores from `planningStore.fio_*` (see [fio](fio.md)); plans,
  empires and CX from `WrapperPlanningDataLoader`.
- Prices: the default CX without a planet, so only empire-level rules apply.
- Preferences `fioRepairIntervalDays`, `fioRepairDueSoonDays`,
  `fioRepairArrivalDays`, `fioRepairPlanLinks` (`SiteId` → `{ planUuid }`,
  `null` = no plan; synced per key, a deleted key returns to automatic).
  XIT Repair shares `burnOrigin` and `defaultBuyItemsFromCX` with FIO Burn.

## Gotchas

- Age counts from `BuildingLastRepair`, else `BuildingCreated`; FIO's
  `AgeDays` is ignored (can be hours stale). An undated building makes its
  base `unknown`, counted as overdue, and bills at full cost.
- Plan matching: same planet, score ≥ `MATCH_THRESHOLD` (0.8), ties go to the
  empire covering most matched bases, a valid user pick per `SiteId` wins.
- Works without `SiteId` (plan picking disabled) and `BuildingCreated`
  (never-repaired buildings show "No repair date").

## Tests

`src/tests/features/fio_repair/` (incl. golden snapshots) and
`src/tests/views/fio/FIORepairView.test.ts`.
