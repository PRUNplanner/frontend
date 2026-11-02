# repair_analysis

**Purpose.** Models a building's daily profit against its repair interval
(0–180 days) so users can pick an interval per building type.

**Used by.** `planning/components/tools/PlanRepairAnalysis.vue` (props in
`planRepairAnalysis.types.ts`). Intervals start at each type's best day and
are not saved; with FIO (not on shared plans) it adds the player's buildings
and due dates. `fio_repair` reuses the util and `IRepairMaterialList`.

## Key files

- **`repairAnalysis.util.ts`**: `calculateRepairCurve` (production value ×
  average wear efficiency, 100 % down to 33 %, − workforce − repair cost
  spread over n days), `repairCurveOf` (curve + best day of one building
  type), `goodRange` (within 1 % of best), material pricing, due dates.
- **`useRepairAnalysis.ts`**: loads a price book, then `buildings`,
  `materialsFor(building, day)` and `materialsForAll(intervalOf)`, all
  synchronous.
- **`components/`**: list, detail, SVG interval charts, material list (with
  XIT), FIO buildings, due tag.

## Gotchas

- The plan's `dailyRevenue` already subtracts workforce and construction ÷
  180; `repairCurveOf` backs those out and charges workforce and the real
  repair cost instead.

## Tests

`src/tests/features/repair_analysis/` and
`src/tests/features/planning/components/PlanRepairAnalysis.test.ts`.
