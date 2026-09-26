# Plan

Goal: move plan calculation into a pure, synchronous TypeScript engine
without the user noticing anything, except that results may appear slightly
sooner after an edit.

Every phase ends with a gate. The next phase starts only after Jan and Claude
have reviewed `STATUS.md` in Cowork and updated `TASKS.md`.

## Non-negotiables

- **Edit latency must not regress.** Changing a building amount, swapping a
  recipe, toggling luxuries/experts/COGC must update materials and money as
  fast as today. Budget: edit -> new result under 16 ms for the large plan in
  the benchmark, and never slower than the Phase 0 baseline.
- **Numbers must not change by accident.** Characterization snapshots stay
  identical through Phases 1-3. Behaviour changes happen only in Phase 4, one
  per commit, each with a reviewed snapshot update.
- **Public API stays stable.** `usePlanCalculation` keeps returning the same
  fields until Phase 3 is done, so views and components don't change.

## Phases

### Phase 0: Safety net (no production code changes)
Baseline test run, characterization snapshots, latency benchmark.
**Gate:** green baseline recorded, snapshots committed, benchmark numbers in
`STATUS.md`.

### Phase 1: Quick fixes inside the current architecture
Stale-run guard in the watcher (S2), await COGM properly (S1), build building
information once per calculation and load the planet once (S3), a
`{ live: false }` option so batch callers don't start the extra run (S4).
**Gate:** snapshots identical (COGM now deterministic), benchmark not slower.

### Phase 2: Synchronous data access
Synchronous getters over the `useDB` caches (throw if not preloaded) after
confirming game data is always preloaded before planning views. A `PriceBook`
that resolves the CX preference order once per calculation and returns prices
synchronously.
**Gate:** snapshots identical, benchmark not slower.

### Phase 3: Pure engine + thin adapter
`src/features/planning/engine/` with `calculatePlan(plan, ctx): PlanResult`
and no Vue imports. `usePlanCalculation` becomes an adapter around a
synchronous `computed` (result as `shallowRef`/frozen). Batch callers call
the engine directly and drop the `effectScope` pattern. Optional: handlers as
pure `(plan, action) => plan` functions.
**Gate:** snapshots identical, edit -> result within budget.

### Phase 4: Bug fixes
B1-B3 and S5-S10, one per commit, each starting from a failing test.

### Phase 5: Batch performance
Batch views (Empire ~30 plans, FIO burn, ROI overview and resource ROI with
100+ plans) use the engine directly with one shared context per batch
(game data + PriceBook built once, not per plan) and skip work they don't
use (e.g. recipe options, S11). Compare with the Phase 0 B6-B8 numbers.
If a batch still takes noticeably long, add a small pool of stateless Web
Workers (about `navigator.hardwareConcurrency - 1`): each worker receives
the shared context once, then plans as small messages, and returns results
with a request id. This is a batch executor, not a stateful per-plan stage
cache. Interactive plan editing stays on the main thread.
**Gate:** B6-B8 clearly faster than baseline, progress bar stays smooth,
results identical to the single-plan engine.

## Decision log

| # | Date | Decision |
| --- | --- | --- |
| D1 | 2026-09-26 | Pure, synchronous TypeScript engine: yes. |
| D2 | 2026-09-26 | No Web Worker for plan editing. Revisit for batch views after Phase 3 numbers. |
| D3 | 2026-09-26 | No event -> stage invalidation table. Full recompute first; memoize by input reference only if measured. |
| D4 | 2026-09-26 | Zod only at system boundaries, not on internal messages. |
| D5 | 2026-09-26 | Tests and benchmarks run in Claude Code in this worktree; discussion and review in Cowork. |
| D6 | 2026-09-26 | Batch calculation is the case for Web Workers: a pool of stateless workers running the pure engine, after removing batch waste and measuring (Phase 5). |
