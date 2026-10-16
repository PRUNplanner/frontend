# fio_repair

**Purpose.** FIO Repair (`views/fio/FIORepairView.vue`, `/fio/repair`): when
each FIO base comes due for repair, what repairing costs, what waiting
costs per day, and one repair flight per base with an "XIT Repair" package.

## Key files

| File | Role |
| --- | --- |
| `fioRepair.util.ts` | Pure maths: `isInfrastructureBuilding`, `ageDays` (since `BuildingLastRepair`, else `BuildingCreated`; FIO's `AgeDays` is not used), `productionBuildings`, `summarizeBuildings` (types, due, status; a base takes its types' minimum, an undated building makes it `unknown`, counted as overdue), `repairBill` (per building `calculateAmountAtDay(days + arrival)`, undated = full cost), `subtractStore`, `waitingCostPerDay`, `matchPlans` (same planet, score ≥ 0.8, a tie goes to the empire covering most matched bases, a valid pick per `SiteId` wins), `bestDays` (Repair Analysis's `repairCurveOf`), timeline `timelineAxis` / `timelineLanes` |
| `useFIORepair.ts` | `useFIORepair(plans, empires, usePlans)`: `bases` (most urgent first), `load()` (planets, prices, then the matched plans with `calculatePlan`, cached by `planResultCacheKey`), `flight(base, arrival, useStore)`. Prices: the default Exchange Preference without a planet, so only its empire-level rules |
| `components/FIORepairOverview.vue` | Page body: settings, stats, timeline, list, panel (beside the list from 1200 px, a `PDrawer` below, list → detail on phones), analytics |
| `components/FIORepairSettings.vue`, `FIORepairStats.vue`, `FIORepairTimeline.vue`, `FIORepairBaseList.vue`, `FIORepairBasePanel.vue`, `FIORepairDueTag.vue` | The parts |

## Data

- Sites and base stores from `planningStore.fio_*` (see [fio](fio.md)); plans,
  empires and CX from `WrapperPlanningDataLoader`.
- Preferences: `fioRepairIntervalDays`, `fioRepairDueSoonDays`,
  `fioRepairArrivalDays` and `fioRepairPlanLinks` (`SiteId` → `{ planUuid }`,
  `null` = no plan; synced per key, a deleted key goes back to automatic).
  XIT Repair shares `burnOrigin` and `defaultBuyItemsFromCX` with FIO Burn.
- Works without the backend's `SiteId` (picking a plan is disabled) and
  `BuildingCreated` (never-repaired buildings show "No repair date").

## Tests

`src/tests/features/fio_repair/` (util, composable, components) and
`src/tests/views/fio/FIORepairView.test.ts`.
