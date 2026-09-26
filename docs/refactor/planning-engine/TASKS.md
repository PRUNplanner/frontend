# Current tasks: Phase 0 (safety net)

Do not change any production code under `src/` in this phase; only add
tests, fixtures and benchmark files. Report everything in `STATUS.md`.

## 0.1 Setup
- [x] `pnpm install` in this worktree.
- [x] Record Node, pnpm and OS versions in `STATUS.md`.

## 0.2 Baseline
- [x] Run `pnpm test`, `pnpm tsc` and `pnpm lint`.
- [x] Record pass/fail counts, coverage summary and duration.
- [x] If anything fails on this untouched branch, stop and report.

## 0.3 Characterization tests
New file: `src/tests/features/planning/usePlanCalculation.characterization.test.ts`.
Follow the setup in `usePlanCalculation.test.ts` (Pinia, preloaded test data).

- [x] Plans to cover (build variants in the test from existing fixtures in
      `src/tests/test_data/`):
  - `plan_etherwind` as is;
  - an empty plan (no buildings, no infrastructure);
  - a small plan (etherwind trimmed to 2-3 buildings);
  - a **large synthetic plan**: 30+ production buildings with several active
    recipes each, using buildings/recipes available in the test data;
  - etherwind with a CX preference (`api_data_cx_definition.json`);
  - etherwind with an empire (`api_data_empire_list.json`, faction bonus);
  - etherwind with: all luxuries off; 5 experts everywhere; CorpHQ on; a
    matching COGC program; a workforce COGC program.
- [x] Snapshot the full `calculate()` result plus `overviewData` and
      `visitationData`.
- [x] Normalize numbers before snapshotting: round finite numbers to 10
      significant digits; write `NaN`/`Infinity` as strings.
- [x] COGM (REVIEW S1): after `calculate()`, `await flushPromises()` before
      snapshotting. Add one test that records whether `cogm` is defined
      immediately after `calculate()` resolves, without fixing anything.
- [x] For each suspected bug B1-B3 in `REVIEW.md`, add an `it.fails` test
      describing the correct behaviour, so a fix flips it later. If you
      conclude one is not a bug, write why in `STATUS.md`.

## 0.4 Latency benchmark
New file: `src/tests/features/planning/usePlanCalculation.bench.ts`, run with
`pnpm vitest bench --run`.

For the small plan, `plan_etherwind` and the large synthetic plan:
- [x] B1: `calculate()` on a fresh instance.
- [x] B2: **edit -> result**: live instance (inside an `effectScope`),
      increment `plan_data.buildings[0].amount`, measure until `result.value`
      has been replaced.
- [x] B3: edit -> result for swapping an active recipe.
- [x] B4: edit -> result for toggling a workforce luxury.
- [x] B5: edit -> result for a CX refresh (`refreshKey++`).
- [x] B6: **batch, empire-like**: 30 plans (mix of etherwind variants and
      the large plan) calculated the way `EmpireView.calculateEmpire` does it
      (effectScope + `calculate()` per plan). Total time.
- [x] B7: **batch, ROI overview**: run `useROIOverview(...).calculate()` over
      all buildings/recipes in the test data. Total time and number of plans.
- [x] B8: **batch, resource ROI**: run `useResourceROIOverview` for one
      material over the test planets (mock `searchPlanets` if needed). Total
      time and number of plans.
- [x] For B6-B8, also count how many times `calculate()` actually runs per
      plan (REVIEW S4) and how many recipe options are computed in total
      (REVIEW S11). A spy/counter in the test is fine; don't change `src/`.
- [x] Record mean, p75, p99 and sample count per case in `STATUS.md`.
- [x] Note that these are Node + jsdom numbers, not browser numbers.

## 0.5 Wrap-up
- [x] Commit on this branch (tests, snapshots, bench, updated `STATUS.md`
      and `TASKS.md`). Don't push.
- [x] Put anything that needs a decision under "Questions for Cowork" in
      `STATUS.md`.
