# Sourcing feature ("raukk") — specification

Goal: for each plan, compute the true break-even cost per unit of each
output when inputs may be self-supplied by other plans in the empire
instead of bought at market, and propagate those costs downstream
(ore → metal → alloy → ...). Client-side only; no backend changes.

## Terminology

- **Snapshot**: a plan's persisted true-cost result: per output ticker
  `{ costPerUnit, breakdown, unitsPerDay }`, plus timestamp and the
  sourcing config it was computed with.
- **Edge**: consumer plan sources ticker T from source plan S. Stored
  as part of the consumer's sourcing config.
- **True cost / unit**: (workforce consumables + repair capital cost +
  inputs at chosen prices) allocated per output unit. Shipping = 0 for
  now (see shipping-stretch.md).

## Cost model

Daily cost buckets for plan P with repair day D ∈ {30, 60, 90, 120},
default 90:

1. Workforce consumables — existing `workforceMaterialIO`, priced per
   the sourcing config (market mode or snapshot transfer price).
2. Capital cost — `repairCost(D) / D` per day, from the existing
   repair-analysis math (per building). Replaces the vanilla
   `constructionCost / 180` degradation for THIS feature's numbers
   only; the upstream profit display is untouched.
3. Production inputs — per input ticker at market mode price OR at
   source snapshot's costPerUnit.

Repair materials are themselves sourcable tickers (same config
mechanism as production inputs and workforce consumables — one shared
per-plan `{ticker → source}` map covering all three buckets).

Allocation to outputs reuses the existing COGM share logic
(`src/features/planning/usePlanCalculation.ts` COGM section): building
costs split across its recipes by runtime share, multi-output recipes
split per existing outputCOGM logic. Roll up per output ticker:

```
trueCost(P, ticker) = allocated daily cost of ticker / units per day
```

Result must carry the breakdown: workforce / repair / inputs (and a
zero shipping slot) per output ticker.

### Base fraction

How many base permits a plan's product chain really occupies, stored on
the snapshot and computed from its concrete draws:

```
baseFraction(P) = 1 + Σ over source plans S
    shareOfSource(P, S) × baseFraction(S)

shareOfSource(P, S) = Σ over tickers t drawn from S
    (draw_t / S.outputs[t].unitsPerDay) × costWeight_S(t)

costWeight_S(t) = S.outputs[t].costPerUnit × unitsPerDay
                  / Σ over all S outputs (costPerUnit × unitsPerDay)
```

`baseFraction(S)` comes from S's stored snapshot, 1 when absent. Zero
output tickers are skipped, a source without any output value falls back
to equal weights. A plan's draw against itself (own output feeding own
repairs) is excluded — the own base is already the leading 1, a self
draw would inflate it and feed back on every recompute. Nothing is
clamped: fully using the own base plus half of another one is 1.5,
values above the plan count are meaningful and signal "better to buy
than build". Displayed in the sourcing tool's snapshot line and
appended to the source dropdown options as "BF 1.50" (aggregates:
output weighted average for `AGG_AVG`, the highest-cost producer's
value for `AGG_MAX`).

## Market price modes

Per input ticker, one of: `BID`, `ASK`, `MID` ((bid+ask)/2, computed),
`AVG7D`, `AVG30D` (existing traded averages). Default follows the
plan's current CX preference behavior.

## Sourcing rules

- A source dropdown for ticker T lists ONLY plans whose stored
  snapshot contains T as an output. (Bottom-up workflow; no live
  recursion — snapshots are frozen numbers.)
- Synthetic dropdown entries when multiple plans produce T:
  "All producers (weighted average)" and "Highest-cost producer".
- Supply loops are ALLOWED, self-supply included. Frozen-snapshot
  pricing never recurses: computing a plan reads the stored values of
  its sources, a loop's numbers therefore settle towards their fixed
  point over repeated recomputes instead of blowing up. Self-supply
  ("Own output" option) exists because repair demand never appears in
  the netted material I/O — a base producing MCG can feed its own
  repairs from it. Production/workforce self-consumption stays netted
  by material I/O as before.
  - Self-loops settle inside a single `computePlanSnapshot` call: the
    pipeline reruns against its own freshly stored value until the
    outputs stop moving (relative epsilon) or an iteration cap hits.
  - Cross-plan loops settle across chain-recompute passes, see below.
- Capacity display on each source option: "X% used by this plan,
  Y% subscribed by other plans" from stored edges. Oversubscription
  (total > 100%) is ALLOWED; render the % in red. No reserve system —
  the oversubscription list itself is the planning surface.
- Staleness: saving a plan or changing its sourcing config marks its
  snapshot stale AND (via edges) all downstream snapshots stale.
  Storing a freshly computed snapshot cascades staleness to dependents
  ONLY when the numbers they consume (output costs/units, draws)
  materially changed — the automatic upkeep recomputes on every view
  load and an unchanged result must not flag the whole chain. Stale
  values still display, visibly flagged. A manual "recompute chain"
  action recomputes the started plan's sourcing subgraph — its
  transitive sources, the plan itself and its transitive dependents —
  upstream-first, so every plan consumes freshly stored source
  snapshots. All plans in that scope that hold a snapshot are
  recomputed, not only the stale ones (a refreshed source changes the
  numbers below it); plans without a snapshot are skipped. When the
  scope contains a loop the whole ordered scope is recomputed in
  additional passes until the largest relative output-cost change
  drops below an epsilon, capped at 5 passes total. Each plan is
  calculated in its own empire/CX context; a plan that fails is
  recorded as an error and the run continues with the next one.
  Never auto-recompute the tree on save.
- Automatic single-base snapshot upkeep: PlanView keeps the open
  plan's snapshot current (`useRaukkAutoSnapshot`) — computed,
  debounced, when the view opens without a current snapshot, after any
  plan change, and whenever the snapshot is flagged stale. Always this
  one plan only, never its chain; read-only and unsaved plans are
  skipped; failures are logged and swallowed.

## Persistence

New persisted Pinia store `raukkSourcingStore`
(`src/features/raukk_sourcing/`), pinia-plugin-persistedstate like the
other stores. Shape (indicative):

- `configs[planUuid]`: `{ repairDay, sources: { [ticker]:
  { mode: "market", priceMode } | { mode: "plan", sourcePlanUuid |
  "AGG_AVG" | "AGG_MAX" } } }`
- `snapshots[planUuid]`: `{ computedAt, stale, outputs: { [ticker]:
  { costPerUnit, unitsPerDay, breakdown } }, draws, config,
  inputPrices, sellPrices }`.
  Dependency edges are DERIVED from `draws` keys + config sources —
  no stored dependsOn list. `draws` keys are always concrete plan
  uuids: when an aggregate source is used, the snapshot-computing
  layer pre-splits the drawn amount across producers proportional
  to their unitsPerDay before storing. `config` is the sourcing
  config the snapshot was computed with (display/staleness aid).
  `inputPrices` (effective ȼ/u per input ticker) and `sellPrices`
  (market sell ȼ/u per output ticker) are frozen at computation time
  and back the read-only sourced-cost notes; both optional so older
  payloads keep importing.
- JSON export/import of the whole store (localStorage is fragile).

## UI surfaces

1. New tool tab "Sourcing" in PlanView's tool row (registered like
   Supply Cart / Repair Analysis):
   - Inputs table: ticker, daily need, bucket (production / workforce /
     repair), market price mode select, source checkbox + dropdown
     (plan name, ȼ/unit, subscription %), effective ȼ/unit.
   - Outputs table (the point of it all): ticker, units/day, true
     ȼ/unit with breakdown columns, vs. market sell price → margin.
   - Snapshot controls: compute/update snapshot, stale indicator,
     recompute-chain button.
2. Repair Analysis additions: day dropdown limited to 30/60/90/120
   (default 90); plan-total per period AND per day; new per-unit-of-
   output table (runtime-share amortized); an "at sourced prices" note
   row in the totals from the stored snapshot. Existing per-building
   view unchanged.
3. Per-unit strips on Workforce panel and Supply Cart: one slotted
   raukk sub-component each — upstream diff ≤ ~3 lines per file. The
   strips append the bucket's daily total at sourced prices.
4. Read-only sourced-cost notes on the vanilla panels — the vanilla
   numbers themselves stay untouched, notes render beneath them from
   the stored snapshot only (no live computation):
   - Material I/O: input rows show "ours X ȼ/d" under the daily cost
     when the snapshot's `inputPrices` differ from the vanilla price.
   - Plan overview: total true cost/day, repair capital cost/day (the
     degradation counterpart) and profit/day against the frozen
     `sellPrices`, stale-flagged in amber.

## Conventions

- Code in `src/features/raukk_sourcing/{components,use*.ts,*.types.ts}`.
- `@author raukk` JSDoc; NEVER `@author jplacht` on new code.
- i18n namespace `raukk_sourcing.json` (en_US only).
- Upstream file touchpoints marked `// raukk:` and kept minimal.
- Pure math as standalone functions (calculations-style), unit tested
  in `src/tests/features/raukk_sourcing/`. Follow CLAUDE.md repo
  conventions throughout. Mind knip: no dead exports.

## Out of scope (do not build)

- Shipping costs — see shipping-stretch.md (keep the zero-cost slot).
- Backend persistence, plan-sharing of sourcing config.
- Recipe-mix optimizer, named what-if scenarios.
- Reserve-% capacity holdbacks.
- Any change to upstream profit/ROI numbers outside the feature's own
  displays.
