# hq_upgrade_calculator

**Purpose.** Given a start and target HQ level, this tool sums the upgrade
materials, subtracts what the user already holds (FIO storage or manual
overrides) and prices the remainder.

**Used by.** `views/tools/HQUpgradeCalculatorView.vue`
(`/hq-upgrade-calculator`), which offers a XIT transfer for the result.

## Key files

- **`hq_levels.json`**: static materials per HQ level. Update it when the
  game changes.
- **`useHQUpgradeCalculator.ts`**: `useHQUpgradeCalculator(startRef,
  toRef, overrideRef, cxUuidRef)`. It uses:
  - `usePrice` for prices;
  - `useFIOStorage().findMaterial` for owned stock;
  - `useMaterialData().materialsMap` for weight and volume.

  It exposes `levelOptions` and the computed material table and totals.
- **`useHQUpgradeCalculator.types.ts`**: `IHQLevelRecord` and the result
  types.

## Tests

`src/tests/features/hq_upgrade_calculator/useHQUpgradeCalculator.test.ts`
