# fio

**Purpose.** This folder holds the tools built on the user's **FIO** data:
real in-game storage and base sites, mirrored by the community FIO service.
The backend proxies the data, and the user links FIO in their profile.

**Used by.**
- `views/fio/FIOBurnView.vue` (`/fio/burn`) and `FIORepairView.vue`
  (`/fio/repair`).
- `PlanSupplyCart` and `PlanConstructionCart`, which subtract stock the user
  already has.
- `useHQUpgradeCalculator`.

## Key files

| File | Role |
| --- | --- |
| `useFIOBurn.ts` | `useFIOBurn(plans, planResults)` computes days of supply per planet from the plan's daily consumption and FIO stock. Its outputs are `planTable` and the burn table |
| `useFIORepair.ts` | `useFIORepair(planetsRef)` builds a repair table from FIO sites: average and min condition, and days since last repair. Infrastructure buildings (`HB*`, `ST*`, `CM`) are counted separately |
| `useFIOStorage.ts` | `storageOptions` (planets / warehouses / ships as grouped select options), `planetStorageId(planet)` (the `PLANET#id` option, only if FIO has storage there) and `findMaterial(ticker)` across all storages |
| `components/FIOBurnTable.vue`, `FIOBurnPlanTable.vue` | Burn UI, with XIT resupply buttons |
| `components/FIORepairPlanet.vue` | Repair UI per planet |

## Data

- FIO storage and sites live in `planningStore.fio_*` and are persisted.
  They are loaded by the `GetFIOStorage` query (`callDataFIOStorage`),
  which `NavigationBar` triggers on app load and `PlanConstructionCart`
  triggers when needed.
- The burn view runs `usePlanCalculation(...).calculate()` for every plan
  first, then passes the results into `useFIOBurn`.
- Burn colour thresholds come from the preferences `burnDaysRed`,
  `burnDaysYellow` and `burnResupplyDays`.

## Tests

`src/tests/features/fio/useFIOBurn.test.ts`, `useFIORepair.test.ts` and
`useFIOStorage.test.ts`.
