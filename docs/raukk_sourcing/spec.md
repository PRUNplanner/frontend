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
- Cycle guard: an edge that would close a cross-planet loop in the
  stored dependency graph is refused (greyed out, "would create a
  supply loop — market price enforced"). Same-planet self-consumption
  is already netted by material I/O — no handling needed.
- Capacity display on each source option: "X% used by this plan,
  Y% subscribed by other plans" from stored edges. Oversubscription
  (total > 100%) is ALLOWED; render the % in red. No reserve system —
  the oversubscription list itself is the planning surface.
- Staleness: saving a plan or changing its sourcing config marks its
  snapshot stale AND (via edges) all downstream snapshots stale.
  Stale values still display, visibly flagged. A manual
  "recompute chain" action re-runs snapshots in dependency order.
  Never auto-recompute the tree on save.

## Persistence

New persisted Pinia store `raukkSourcingStore`
(`src/features/raukk_sourcing/`), pinia-plugin-persistedstate like the
other stores. Shape (indicative):

- `configs[planUuid]`: `{ repairDay, sources: { [ticker]:
  { mode: "market", priceMode } | { mode: "plan", sourcePlanUuid |
  "AGG_AVG" | "AGG_MAX" } } }`
- `snapshots[planUuid]`: `{ computedAt, stale, outputs: { [ticker]:
  { costPerUnit, unitsPerDay, breakdown } }, draws, config }`.
  Dependency edges are DERIVED from `draws` keys + config sources —
  no stored dependsOn list. `draws` keys are always concrete plan
  uuids: when an aggregate source is used, the snapshot-computing
  layer pre-splits the drawn amount across producers proportional
  to their unitsPerDay before storing. `config` is the sourcing
  config the snapshot was computed with (display/staleness aid).
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
   output table (runtime-share amortized). Existing per-building view
   unchanged.
3. Per-unit strips on Workforce panel and Supply Cart: one slotted
   raukk sub-component each — upstream diff ≤ ~3 lines per file.

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
