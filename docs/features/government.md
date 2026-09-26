# government

**Purpose.** This folder covers planetary government topics:
- **POPR** (population reports): the population and needs of a planet;
- the **upkeep price calculator**, which finds the cheapest materials to
  meet each population need (safety, health, comfort, culture, education)
  through the infrastructure buildings (SST, HOS, …).

**Used by.**
- `views/tools/UpkeepPriceCalculatorView.vue` (`/upkeep-price-calculator`).
- `PlanetPOPRButton` in planet search results and the resource ROI table.
- `PlanetPOPRTable` in the plan tool `PlanPOPR`.

## Key files

| File | Role |
| --- | --- |
| `upkeepCalculations.constants.ts` | `UPKEEP_NEED_TYPES` and `UPKEEP_BUILDINGS`: static building → needs and materials data |
| `upkeepCalculations.ts` | Pure functions: `calculatePricePerNeed`, `getBuildingsForNeed`, `getBuildingNeedCount`, `calculateMaterialsForNeed` |
| `upkeepCalculations.types.d.ts` | `UpkeepNeedType`, `IUpkeepBuilding`, `IUpkeepMaterialCalculation` |
| `composables/useUpkeepBuildings.ts` | Accessors over the constants |
| `composables/useUpkeepPriceCalculator.ts` | `await useUpkeepPriceCalculator(cxUuidRef, planetRef?)`: prices each need's materials with `usePrice(... "BUY")` and sorts them by price per need |
| `components/UpkeepPriceCalculator.vue` | Calculator UI |
| `components/PlanetPOPRButton.vue`, `PlanetPOPRTable.vue` | POPR popup and table, fed by the `GetPlanetLastPOPR` query |

## Gotchas

- **The helper logic is duplicated.** The functions in
  `upkeepCalculations.ts` and those in the `composables/` overlap.
  Consolidate new logic into `upkeepCalculations.ts` (which has tests)
  rather than adding a third copy.
- **Multi-need buildings multiply their need** by the number of needs they
  provide when computing price per need.

## Tests

`src/tests/features/government/upkeepCalculations.test.ts`
