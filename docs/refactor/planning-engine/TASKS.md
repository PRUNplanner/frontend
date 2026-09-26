# Tasks: Phases 1-3, 5 and the pull request (one autonomous run)

Phase 0 is done (see `STATUS.md`, commits `a4ed7b3`, `941ebbb`).

**Goal:** make plan calculation faster for single-plan editing and for batch
views, move it into a pure synchronous engine, and open one pull request
that shows the improvement with a before/after benchmark. **No calculated
number may change.**

## How to run
- Work through the phases in order without waiting for Jan. When something
  needs a decision, pick the more conservative option (the one that keeps
  results and behaviour unchanged), note it under "Questions for Cowork" in
  `STATUS.md`, list it in the PR, and carry on.
- Stop and report instead of continuing only if a gate can't be met.

## Rules for every phase
- **Snapshots are the contract.** After step 1.0, never run tests with `-u`
  and never edit a `.snap` file. If a characterization snapshot changes,
  even in the last digit, revert that change and record it in `STATUS.md`.
- The `it.fails` tests for B2 and B3 must stay expected-fail. Those bugs
  change numbers and are not part of this PR (see "Out of scope").
- `usePlanCalculation` stays compatible for its callers: same returned
  fields and behaviour. New options must be optional and default to today's
  behaviour. Views and components must keep working unchanged, except
  where a task below says otherwise.
- One fix per commit. After each commit run `pnpm test`, `pnpm tsc`,
  `pnpm lint`, `pnpm knip` and both benchmark files, and add a row to the
  tables in `STATUS.md`.
- Measure first; fix the biggest costs first. Skip any change that doesn't
  measurably help and write down why.
- No development-only timing code in `src/`.

## Phase 1: Performance inside the current architecture

### 1.0 Test adjustments (before any production change)
- [x] Snapshot the `large` plan without `recipeOptions` (`etherwind`
      snapshots still cover them). This is the only snapshot change allowed;
      commit it on its own.
- [x] B8: build a search fixture where every planet has N, so every plan
      does its second run.
- [x] Re-run both benches on unchanged production code and record the new
      baseline in `STATUS.md`.

### 1.1 Profile
- [x] Profile `calculate()` on `large` and record a breakdown in
      `STATUS.md` (recipe options, price lookups, building information,
      material IO, COGM, construction materials/overview, other).

### 1.2 Fixes (ordered by the profile)
- [x] **S3:** building information once per `calculate()`; planet loaded
      once per `calculate()` and passed down.
- [x] **Per-run price cache:** each `(ticker, BUY/SELL)` resolved once per
      run (a Map created per run, so CX changes still apply next run).
- [x] **S4:** optional `{ live: false }` that skips the recalculation
      watchers. Use it in `EmpireView`, `FIOBurnView`, `useROIOverview`,
      `useResourceROIOverview`.
- [x] **S11:** optional way to skip `recipeOptions`, used only by batch
      callers that provably never read them. `useResourceROIOverview`
      (l.211) and the handlers (`usePlanCalculationHandlers.ts` l.371-383)
      read them. Test that a result without recipe options equals the
      normal result apart from `recipeOptions`.
- [x] **S1:** await COGM (`Promise.all`) instead of `forEach(async ...)`.
- [x] **S2:** stale-run guard in the watcher, with a test.
- [x] Further hotspots from the profile, under the same rules.

**Gate 1:** snapshots identical; `large` edit -> result not slower than the
baseline, small/etherwind not slower.

## Phase 2: Synchronous data access
- [ ] Confirm game data (buildings, recipes, materials, exchanges, the
      plan's planet) is always loaded before any view that calculates plans.
      Document where that is guaranteed. If a view can calculate before
      preload, keep an async path for it and note it.
- [ ] Synchronous getters over the `useDB` caches (throw a clear error if
      not loaded).
- [ ] A `PriceBook`: resolves the CX preference hierarchy from `usePrice`
      and returns prices synchronously. Same resolution logic and values;
      reuse or replace the per-run cache from Phase 1.

**Gate 2:** snapshots identical; benches not slower than after Phase 1.

## Phase 3: Pure engine + thin adapter
- [ ] `src/features/planning/engine/`: `calculatePlan(input, ctx)` as plain
      synchronous functions with plain data in and out, and no Vue imports.
      Enforce "no `vue` imports in `engine/`" with an ESLint rule.
      `input` holds the plan data plus empire and CX explicitly (S13).
      `ctx` holds game data, planet and `PriceBook`.
- [ ] Split by concern (workforce, area, efficiency, production, material
      IO, finance, COGM, recipe options, construction, visitation) with one
      sign convention (S10). Compute profit/overview once (S5, S6) while
      keeping both outputs (`result.profit`/`cost`/`revenue` and
      `overviewData`) numerically identical. No input mutation (S7).
- [ ] Unit tests for the engine functions; the characterization snapshots
      must pass against the engine directly and through the adapter.
- [ ] `usePlanCalculation` becomes an adapter: a synchronous `computed`
      over `calculatePlan`, result as `shallowRef` or frozen, same returned
      fields. The recalculation watchers and the async chain disappear.
- [ ] Batch callers (Empire, FIO burn, ROI overview, resource ROI) call the
      engine directly with one shared `ctx` per batch; drop the
      `effectScope` workaround and `{ live: false }` if unused.
- [ ] **S9:** `PlanProductionBuilding.vue` must not write into the result
      (bind the input to the plan value and keep the emit).
- [ ] **B1:** fix `building.Expertise` -> `building.expertise`. It changes no
      number (latent crash only), so it belongs here; its `it.fails`
      becomes a normal test.
- [ ] Update `docs/planning-engine.md`, `docs/testing.md` (how to run the
      benches) and `AGENTS.md` where they describe the calculation.

**Gate 3:** snapshots identical; `large` edit -> result mean under 8 ms in
Node (baseline about 16 ms); small/etherwind not slower; B6-B8 clearly
faster than baseline.

## Phase 5: Batch workers only if needed
- [ ] After Phase 3, if any batch case (B6-B8) still takes over 1 s in Node,
      or blocks the main thread in chunks over 50 ms, add a small pool of
      stateless Web Workers running the engine (shared `ctx` sent once per
      worker, plans as messages with request ids). Otherwise skip this phase
      and write the numbers that justified skipping into `STATUS.md`.

## Final: comparison benchmark and pull request
- [ ] **Comparison benchmark:** run the same benchmark files against
      `main` (`2134823`) and against the final branch, using
      `vitest bench --outputJson` on the baseline and `--compare` on the
      branch (e.g. check out `main` in a temporary worktree, copy in the
      bench and fixture files, run, remove the temporary worktree).
      Benchmark through entry points that exist on both sides
      (`usePlanCalculation`, `useROIOverview`, `useResourceROIOverview`,
      an empire-style loop); where an entry point changed, use a thin
      per-side adapter and document it.
      Run each side at least twice; report means, p75, p99 and speed-up.
- [ ] **Cleanup before the PR:**
  - move the lasting content (engine design, decisions D1-D4, D6, how to
    run benches) into `docs/planning-engine.md`;
  - delete `docs/refactor/planning-engine/`;
  - keep the characterization tests, snapshots, bench files and fixtures;
  - no dev-only timing code, no stray `.only`, `console.log` or temp files.
- [ ] Final full run: `pnpm test`, `pnpm tsc`, `pnpm lint`, `pnpm knip`.
- [ ] Push `refactor/planning-engine` and open a PR against `main`. The PR
      description contains:
  - a short summary of the architecture change;
  - **a highlighted results table**: single-plan edit -> result
    (small / etherwind / large) and batch (B6-B8), before vs after, with
    speed-up and `calculate()` runs per plan / recipe options computed;
  - the statement that all characterization snapshots are unchanged, with
    the number of plans/variants covered;
  - test/coverage summary;
  - fixes included (S1-S7, S9-S11, S13, B1) and what is out of scope;
  - decisions taken without Jan and open questions.

## Out of scope for this PR
- **B2** (building `dailyRevenue` degradation not × amount) and **B3**
  (workforce cost ignores luxury settings): they change numbers. Leave the
  `it.fails` tests in place; they get their own PR.
- S8 (hab auto-optimise feedback loop): behaviour stays as is.
