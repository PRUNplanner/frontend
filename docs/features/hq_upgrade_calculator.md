# hq_upgrade_calculator

**Purpose.** Sums the materials for an HQ upgrade from a start to a target
level, subtracts what the user holds (FIO storage or manual overrides) and
prices the rest.

**Used by.** `views/tools/HQUpgradeCalculatorView.vue`
(`/hq-upgrade-calculator`, with a XIT transfer button); `hq_levels.json` also
by base ROI (`baseROIMetrics.hqStepCost`).

## Key files

- `hq_levels.json`: static materials per HQ level; update when the game
  changes.
- `useHQUpgradeCalculator.ts`: `useHQUpgradeCalculator(start, to,
  overrides, cxUuid)` → `levelOptions`, `levelOptionsTo`, `hasError`,
  `materialData`, `totalCost`, `totalWeightVolume`, `calculateMaterialData`.
  Prices via `usePrice` (no planet), stock via `useFIOStorage().findMaterial`.
- `useHQUpgradeCalculator.types.ts`: `IHQLevelRecord`, result types.

## Tests

`src/tests/features/hq_upgrade_calculator/useHQUpgradeCalculator.test.ts`;
page in `src/tests/views/tools/HQUpgradeCalculatorView.test.ts`.
