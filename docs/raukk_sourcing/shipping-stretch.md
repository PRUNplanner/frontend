# Sourcing feature — shipping cost model (stretch goal, deferred)

Status: NOT part of the initial sourcing feature. Build only after the
core snapshot/transfer-price feature is done and useful.

## Goal

Add a shipping ȼ/unit term to every sourcing edge (plan → plan) and to
market purchases (CX → plan), so market-vs-self-supply comparisons are
honest.

## Data available today

- `src/assets/static/fio_systemstars.json`: every system has
  `PositionX/Y/Z` and `Connections`. Per-jump parsec distance is
  computable as euclidean distance between connected systems — the
  current `ISystemsJSON` type just doesn't parse the position fields.
- `usePathfinder` (`src/features/pathfinding/`) already does BFS jump
  counts and precomputes distance-to-market-systems (NC1/AI1/CI1/IC1).
- Planets carry `system_id`; material weight (t) and volume (m³) are in
  game data.

## Data NOT available

- Planet positions within a system → sublight legs between same-system
  planets cannot be modeled. Treat same-system as 0 jumps + optional
  flat per-trip constant.
- Ship fit data: engine/FTL-reactor variants have different speed and
  fuel burn. No per-account ship data in the frontend. Getting this
  accurate is the main reason the feature is deferred.

## Proposed model (v1 of the stretch)

Account-level static config (raukkSourcingStore):

- `cargoT`, `cargoM3` — assumed ship capacity
- `costPerParsec` (or `costPerJump` fallback) — bakes in fuel price,
  burn rate at slow/efficient speed, and time value; user-tuned
- `sameSystemFlatCost` — optional constant for 0-jump routes
- `routingMode`: `"direct" | "cx-hub"` — hub mode routes every leg via
  the NEAREST exchange (outputs → hub, inputs ← hub)

Per material on an edge:

```
unitsPerFullLoad = min(cargoT / weight, cargoM3 / volume)
shipping ȼ/unit  = routeDistance × costPerParsec / unitsPerFullLoad
```

Assumptions: ships fly full (or nearly), slow burn for fuel efficiency.

Market purchases ship from the nearest CX (always assume CX origin —
other pickup points are out of scope).

## Integration point

The core feature computes `landedCost = transferPrice + shippingCost`
per edge with `shippingCost = 0` everywhere. Implement shipping as one
pure function `calculateShippingCostPerUnit(edge, material, config)` so
enabling it later touches no other math. Fuel itself is a producible
ticker — a fuel-base snapshot could later feed `costPerParsec`, but
that is explicitly out of scope here.
