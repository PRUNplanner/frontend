# Status

Written by Claude Code. Newest entries at the top of the log.

## Environment
- Node: 22.19.0 (`.nvmrc`, via nvm; the default shell has 26.8.2)
- pnpm: 12.5.1 (AGENTS.md says 10; `pnpm install` left the lockfile unchanged)
- OS: macOS 26.6.2 (25G83), Apple Silicon, 10 cores
- Measured on commit: production code at `2134823` (unchanged). Tests,
  snapshots and benchmarks at `a4ed7b3`.

## Baseline (Phase 0.2)
Before any change (`2134823`), with the new files in brackets (`a4ed7b3`).

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm test` | pass: 79 files, 3291 tests (80 files, 3307 passed + 3 expected fail) | 29.9 s (23.8 s) wall; one existing warning about a nested `vi.mock` in `useBuildingData.test.ts` |
| coverage | statements 95.80%, branches 83.56%, functions 96.76%, lines 96.56% (95.90 / 83.94 / 96.90 / 96.67) | thresholds 94 / 82 / 95 / 95 |
| `pnpm tsc` | pass | 20 s |
| `pnpm lint` | pass | 8 s |
| `pnpm knip` | pass (with new files) | |

## Characterization tests (Phase 0.3)
Files: `usePlanCalculation.characterization.test.ts`, shared plan builders in
`usePlanCalculation.fixtures.ts`, one snapshot file per plan in
`__snapshots__/usePlanCalculation.characterization/`. Snapshots were stable
across 3 consecutive runs.

- Plans covered (11):
  - `etherwind`, as is.
  - `empty`: no buildings, no infrastructure.
  - `small`: etherwind's first 3 buildings (EXT, FP, HYF).
  - `large`: 46 production buildings, i.e. every production building
    with 3+ recipes, extractors excluded. Each runs 3 recipes (138 active
    recipes), amounts 1-4, with HB1-HB5 and STO.
  - `etherwind_cx`: `api_data_cx_definition.json`.
  - `etherwind_empire`: empire `a208d74e…` (OUTSIDEREGION, permits 1/3),
    which gives a RESOURCE_EXTRACTION faction bonus to EXT, INC and RIG.
  - `etherwind_luxuries_off`, `etherwind_experts_5`, `etherwind_corphq`.
  - `etherwind_cogc_food_industries`: matches the 19 FP buildings.
    Etherwind's own RESOURCE_EXTRACTION already matches EXT/INC/RIG.
  - `etherwind_cogc_pioneers`: workforce program.
- Snapshot content: the `calculate()` result plus `overviewData` and
  `visitationData`, normalized to 10 significant digits, with
  `NaN`/`Infinity` as strings. Only `empty` contains non-finite values
  (`roi: "Infinity"` and one visitation value).
- COGM defined right after `calculate()`: **yes**, for every active recipe
  of etherwind. The later awaits in `calculate()` happen to give the
  un-awaited callbacks time to finish (S1). Recorded by a test, nothing
  fixed. Snapshots still `flushPromises()` first.
- Suspected bugs (B1-B3): each has an `it.fails` test for the correct
  behaviour, plus a passing test that pins today's behaviour. The pinning
  test proves the `it.fails` fails for the intended reason and not because
  of a broken setup. All 3 `it.fails` currently "pass" (expected fail).
  - **B1: confirmed, but latent.** `building.Expertise` is always
    `undefined`, so the guard is always true.
    `calculateBuildingEfficiency` throws a `TypeError` for a building with
    `expertise: null`. However, every `PRODUCTION` building in the test data
    has an expertise. Only `PLANETARY` and `INFRASTRUCTURE` buildings have
    `null`, and those never reach `calculateBuildingEfficiency`. So a plan
    can't trigger the crash today. The faction bonus path has no observable
    effect: its lookup with `null` yields `undefined` anyway.
  - **B2: confirmed.** `dailyRevenue` is off by
    `(amount - 1) * constructionCost / 180` per building entry. It only
    affects `production.buildings[i].dailyRevenue`. Plan-level
    `profit`/`cost` multiply degradation by `amount` correctly (see the
    existing "internally consistent" test).
  - **B3: behaves as described.** With all luxuries off,
    `workforceMaterials` still equals the lux1+lux2 set. This feeds
    `workforceDailyCost`, so it affects recipe option
    `dailyRevenue`/`roi`/`profitPerArea`, the COGM workforce share and
    building `dailyRevenue`. Plan-level material IO uses the real luxuries.
    Whether this is intended is a question below; the `it.fails` assumes
    it's a bug.

## Benchmark (Phase 0.4, Node + jsdom)
**Node 22.19 + jsdom numbers, not browser numbers.** In ms, from
`pnpm vitest bench --run` (both bench files in parallel workers). Run 1 of
2 is shown; run 2 was within about 10% on every mean.

All game data (buildings, recipes, materials, exchanges) is preloaded into
memory, as in the app. The planet is mocked to etherwind.
"edit -> result" means: edit the live plan (inside an `effectScope`), then
wait until the watcher has replaced `result.value`.

B1 is split in two (see Deviations):
- **B1a**: a fresh instance per iteration: create it, run `calculate()`,
  and wait for the immediate watcher run too (S4).
- **B1b**: `calculate()` alone on an instance whose watcher has already
  settled.

| Case | Plan | mean (ms) | p75 | p99 | samples |
| --- | --- | --- | --- | --- | --- |
| B1a fresh instance + calculate() + watcher run | small | 2.00 | 2.11 | 3.82 | 251 |
| B1a fresh instance + calculate() + watcher run | etherwind | 2.17 | 2.34 | 3.46 | 231 |
| B1a fresh instance + calculate() + watcher run | large | 35.19 | 32.41 | 62.53 | 15 |
| B1b calculate() | small | 0.41 | 0.40 | 1.08 | 1212 |
| B1b calculate() | etherwind | 0.51 | 0.48 | 1.31 | 974 |
| B1b calculate() | large | 14.91 | 15.24 | 16.34 | 34 |
| B2 building amount edit -> result | small | 0.85 | 0.80 | 1.86 | 592 |
| B2 building amount edit -> result | etherwind | 0.95 | 0.92 | 2.06 | 528 |
| B2 building amount edit -> result | large | 15.97 | 16.35 | 17.88 | 32 |
| B3 recipe swap -> result | small | 0.81 | 0.79 | 1.81 | 616 |
| B3 recipe swap -> result | etherwind | 0.95 | 0.92 | 2.05 | 527 |
| B3 recipe swap -> result | large | 15.72 | 16.07 | 17.08 | 32 |
| B4 luxury toggle -> result | small | 0.80 | 0.77 | 1.77 | 623 |
| B4 luxury toggle -> result | etherwind | 0.97 | 0.94 | 2.11 | 517 |
| B4 luxury toggle -> result | large | 15.79 | 16.06 | 17.06 | 32 |
| B5 CX refresh -> result | small | 0.80 | 0.77 | 1.65 | 627 |
| B5 CX refresh -> result | etherwind | 1.03 | 0.96 | 2.27 | 487 |
| B5 CX refresh -> result | large | 16.02 | 16.45 | 17.00 | 32 |

Run 2, for comparison: large B2-B5 means were 15.86 / 16.04 / 15.88 /
15.89, and large B1a was 31.02 (run 1's B1a p99 of 62.5 is one outlier).

Observations:
- **The large plan is already at the 16 ms budget in Node:** edit -> result
  has a mean of about 15.9 and a p99 of 17-18.
- For edit -> result, the extra time on top of a bare `calculate()` is about
  0.4 ms on small/etherwind and about 1 ms on large. I did not investigate
  where it goes. One live instance does exactly 1 run on creation and 1 run
  per edit (counted), so it is not a double run.
- B1a is about 2x B1b on large, which is the S4 double run.

### Batch (total time)
File: `usePlanCalculation.batch.bench.ts`. Each case: 10 iterations after 1
warmup. Totals are in ms.

The counters wrap the code without touching `src/`:
- **plans**: `usePlanCalculation` instances, counted through a `vi.mock`
  wrapper.
- **runs**: `calculate()` executions, counted at `usePrice`'s
  `calculateInfrastructureCosts`, which `calculate()` calls exactly once.
  This covers explicit calls and watcher runs alike.
- **recipe options**: calls to `optimalProduction.find`, which is called
  once per recipe option and nowhere else.

The counts come from one extra run per case, which waits 200 ms at the end
so that discarded watcher runs can finish. They were identical in both runs.

| Case | Plans | total (ms) mean / p75 / p99 | calculate() runs per plan | recipe options computed |
| --- | --- | --- | --- | --- |
| B6 empire-like | 30 | 236.95 / 242.40 / 246.50 | 2.00 (60 runs) | 5640 (94 per run) |
| B7 ROI overview | 370 | 543.39 / 563.68 / 609.31 | 2.00 (740 runs) | 8128 (11 per run) |
| B8 resource ROI (`N`) | 195 | 164.70 / 165.33 / 221.41 | 2.03 (395 runs) | 276 |

- **B6** has 30 plans: 25 etherwind variants (as is, small, luxuries off,
  experts 5, CorpHQ) and 5 large plans. It uses the OUTSIDEREGION empire
  and no CX. The loop mirrors `EmpireView.calculateEmpire`, including the
  `Promise.resolve()` and `setTimeout(0)` yields, but not its result cache.
- **B7** runs `useROIOverview(ref(etherwind), ref(undefined)).calculate()`:
  1 plan per recipe over 50 non-extractor, non-FRM buildings.
- **B8** runs `useResourceROIOverview(ref(undefined)).calculate("N")`. The
  search is mocked with `api_data_planet_search.json` (65 planets × 3
  extractor setups = 195 plans), and the planets are put into `planetsStore`
  with the real `usePlanetData`.
  - **Caveat:** only 5 of those 65 planets actually have N, so only 5 plans
    do the second `calculate()` that a real N search would do on every
    planet. B8 therefore underestimates the real workload; see questions.
  - The 395 runs are 195 watcher runs + 195 explicit runs + 5 second runs.
- **S4 confirmed:** every batch plan is calculated twice.
- **S11 confirmed:** B7's 370 plans compute 8128 recipe options, none of
  which the ROI overview reads.

## Phases 1-3 (performance and engine)

### Profile of `calculate()` on `large`
| Step | ms | share |
| --- | --- | --- |

### Single plan, edit -> result (Node, mean ms)
| After commit | fix | small | etherwind | large | large p99 |
| --- | --- | --- | --- | --- | --- |
| (baseline) | none | | | | |

### Batch (Node, total mean ms)
| After commit | fix | B6 | B7 | B8 (all planets have N) | runs per plan | recipe options |
| --- | --- | --- | --- | --- | --- | --- |
| (baseline) | none | | | | | |

## Deviations from TASKS.md
1. Node 22.19 as `.nvmrc` requires, but with pnpm 12.5.1 instead of 10
   (the one installed). Lockfile unchanged.
2. B1 is measured two ways (B1a/B1b), because "fresh instance" includes
   the S4 watcher run. B1b is the number to compare the pure engine against.
3. B3-B5 are measured for all three plans, not only for large.
4. There are two extra files besides the two requested:
   - `usePlanCalculation.fixtures.ts`: plan builders and store setup,
     shared by the test and both benches.
   - `usePlanCalculation.batch.bench.ts`: B8 needs the real
     `usePlanetData` with 65 planets in the store, while the single-plan
     bench mocks the planet to etherwind. Both files run with
     `pnpm vitest bench --run`.
5. The characterization setup also preloads exchanges. The existing
   `usePlanCalculation.test.ts` doesn't, but the app does (in
   `queryRepository`). The numbers match the existing test (e.g. roi
   23.6367576).
6. The empire case uses OUTSIDEREGION instead of the fixture's MORIA
   empires. MORIA's bonuses (METALLURGY, CONSTRUCTION) don't touch any
   etherwind building, so it would not exercise the faction bonus.
7. `docs/refactor/` was untracked, so it is committed as a whole, including
   PLAN, REVIEW and README.

## Questions for Cowork
1. **B3:** should building workforce cost (used by recipe options, COGM
   and building `dailyRevenue`) follow the plan's luxury settings? Or is
   "full luxuries" the intended reference for comparing recipes?
2. **B1** can't crash a plan today, because every production building has
   an expertise. Fix it anyway in Phase 4 (`Expertise` -> `expertise`,
   one line)? Or drop it and remove the dead guard?
3. **Budget:** the large plan's edit -> result is already around 16 ms (p99
   around 17-18) in Node. Should the 16 ms budget apply to Node/jsdom or to
   the browser? If the browser, should we add a browser measurement (e.g.
   a dev-only timing in `PlanView`)?
4. **The `large` snapshot is 1 MB**, mostly 46 buildings' recipe options.
   Keep it as is, or snapshot the large plan without `recipeOptions` (they
   are already covered by etherwind)?
5. **B8 fixture:** should we build a search fixture where every planet has
   the material, so B8 reflects the real second-run cost? For example,
   filter `api_data_planet_search.json` per material, or add a
   `planet_search_N.json`.
6. A note, not a finding: the recalculation watcher watches
   `[plan, refreshKey, empireUuid]`, but not `cxUuid`. In `PlanView`,
   `cxUuid` only changes together with `empireUuid`, so nothing is
   missed today. Still, the engine should take the CX as an explicit input
   (Phase 3).

## Log
- 2026-09-26: Phase 0 done. Baseline green on `2134823`. Tests, snapshots
  and benches committed in `a4ed7b3`.
  - Also fixed a hang in my own first bench draft, where a no-op recipe
    swap never produced a new result. `editToResult` now fails after 5 s
    instead of hanging.
