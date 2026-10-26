# government

**Purpose.** This folder covers planetary government topics:
- **POPR** (population reports): the population and needs of a planet;
- the **upkeep price calculator**, which finds the cheapest materials to
  meet each population need (safety, health, comfort, culture, education)
  through the infrastructure buildings (SST, HOS, …).

**Used by.**
- `views/tools/UpkeepPriceCalculatorView.vue` (`/upkeep-price-calculator`).
- `PlanetPOPRButton` in the resource ROI table (`ResourceROITable`).
- `PlanetPOPRTable` and `popr.util.ts` in the plan tool `PlanPOPR`.

## Key files

| File | Role |
| --- | --- |
| `upkeepCalculations.constants.ts` | `UPKEEP_NEED_TYPES` and `UPKEEP_BUILDINGS`: static building → needs and materials data |
| `upkeepCalculations.ts` | Pure functions: `calculatePricePerNeed`, `getBuildingsForNeed`, `getBuildingNeedCount`, `calculateMaterialsForNeed`, and `calculateAllNeeds(getPrice)`, which prices every need's materials and sorts them by price per need |
| `upkeepCalculations.types.ts` | `UpkeepNeedType`, `IUpkeepBuilding`, `IUpkeepMaterialCalculation` |
| `components/UpkeepPriceCalculator.vue` | Calculator UI. Passes `usePrice(...).getPrice(ticker, "BUY")` into `calculateAllNeeds` and recalculates when the CX changes |
| `popr.util.ts` | `poprAvailable` (free workers less open jobs, never below 0) and `poprCovers` (whether they cover the plan's need) |
| `components/PlanetPOPRButton.vue`, `PlanetPOPRTable.vue` | POPR popup and table; the button and `PlanPOPR` fetch the report with the `GetPlanetLastPOPR` query and pass it to the table |

## Gotchas

- **Keep the logic in `upkeepCalculations.ts`.** It is the tested home for
  upkeep math. The component should only wire prices and UI state.
- **Multi-need buildings multiply their need** by the number of needs they
  provide when computing price per need.

## Tests

`src/tests/features/government/`: `upkeepCalculations.test.ts`,
`popr.util.test.ts` and `components/` (both POPR components and the
calculator).
