# government

**Purpose.** Planetary government topics: POPR (population reports) and the
upkeep price calculator, which finds the cheapest materials per population
need (safety, health, comfort, culture, education) through the
infrastructure buildings.

**Used by.** `views/tools/UpkeepPriceCalculatorView.vue`
(`/upkeep-price-calculator`); `PlanetPOPRButton` in `ResourceROITable`;
`PlanetPOPRTable` in the plan tool `PlanPOPR`; `popr.util.ts` in `PlanPOPR`,
base ROI (`baseROIPopulation`) and `PlanetSearchCompare`.

## Key files

- `upkeepCalculations.ts`: pure upkeep math (`calculatePricePerNeed`,
  `getBuildingsForNeed`, `getBuildingNeedCount`, `calculateMaterialsForNeed`,
  `calculateAllNeeds(getPrice)` sorted by price per need). Static data in
  `upkeepCalculations.constants.ts`, types in `.types.ts`.
- `components/UpkeepPriceCalculator.vue`: UI only; passes
  `usePrice(...).getPrice(ticker, "BUY")` and recalculates on CX change.
- `popr.util.ts`: `poprAvailable` (free workers minus open jobs, never below
  0), `poprCovers` (whether they cover a need).
- `components/PlanetPOPRButton.vue`, `PlanetPOPRTable.vue`: POPR popup and
  table; the button and `PlanPOPR` fetch via `GetPlanetLastPOPR`.

## Gotchas

- Keep upkeep logic in `upkeepCalculations.ts` (the tested home); the
  component only wires prices and UI state.
- Multi-need buildings multiply their need by the number of needs they
  provide when computing price per need.

## Tests

`src/tests/features/government/` (both utils and `components/`).
