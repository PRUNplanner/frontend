# Shipping stretch goal — orchestrator handoff

Audience: a fresh Claude orchestrator session picking up the shipping
cost model for the raukk sourcing feature. Read shipping-stretch.md
(the model design) and spec.md (the shipped core feature) first, then
interview the user (Raukk) with the questions below before writing any
code.

## Mission

Add a shipping ȼ/unit term to sourcing edges (plan → plan) and market
purchases (CX → plan). The core feature intentionally shipped with a
zero-cost shipping slot in every breakdown
(`IRaukkCostBreakdown.shipping`) and a single integration point:
implement `calculateShippingCostPerUnit(edge, material, config)` as a
pure function and feed it into the snapshot pipeline where shipping is
currently hardcoded 0 (see `calculateTrueCosts` usage in
`useRaukkSnapshot.ts`).

## What is already true (verified this session)

- `src/assets/static/fio_systemstars.json` has `PositionX/Y/Z` per
  system → per-jump parsec distance = euclidean distance between
  connected systems. The parsed type (`ISystemsJSON` in
  `src/features/pathfinding/usePathfinder.types.ts`) currently drops
  the position fields — widen it, don't refetch.
- `usePathfinder` does BFS jump paths and precomputes distances to the
  four market systems (NC1/AI1/CI1/IC1 constants at the top of
  `usePathfinder.ts`). Planets carry `system_id`.
- No planet-level orbital positions exist → same-system sublight legs
  cannot be modeled; plan for a flat constant.
- Material weight (t) / volume (m³) are on material game data;
  `unitsPerFullLoad = min(cargoT/weight, cargoM3/volume)`.
- Empire plans and their planets are all reachable client-side (the
  sourcing store has every snapshot's `planetNaturalId`).

## Interview the user first — open decisions

1. Ship profile: one account-wide cargo (t / m³) or named profiles?
   What are their actual hauler numbers?
2. Cost per parsec: how do they want it derived — a single manual
   number, or computed from fuel price × burn per parsec (FF is a
   market ticker; burn rate varies by engine — ask what approximation
   they accept)? Reactor/STL fuel split?
3. Same-system flat cost: include? What default?
4. Round trips: charge one-way (full out, empty back is the seller's
   problem) or double for the return leg?
5. Hub mode: still wanted as a toggle (all legs via nearest CX), or
   direct-only now that parsecs are real?
6. Market buys: confirmed earlier that CX purchases get shipping from
   the nearest exchange — still true? Nearest by jumps or by parsecs?
7. Display: shipping as its own column exists in the outputs table
   already; do they also want it in the inputs table's effective ȼ/u
   (probably yes — ask) and in the source dropdown labels?
8. Does shipping count into base fraction weighting? (Current formula
   weights by costPerUnit which would silently include shipping once
   non-zero — surface this and let them decide.)

## Constraints (do not relitigate)

- Client-side only; persisted in `raukkSourcingStore` (extend the zod
  schemas in raukkSourcingStore.schemas.ts for any new config).
- raukk conventions: code in `src/features/raukk_sourcing/`,
  `@author raukk`, i18n `raukk_sourcing.json` (en_US only), minimal
  `// raukk:`-marked upstream touches, pure math + tests in
  `src/tests/features/raukk_sourcing/`.
- Gates: `pnpm test`, `pnpm tsc`, `pnpm lint`, `npx knip`, prettier —
  all green before every commit. Branch:
  `claude/subsection-planning-feature-1i00ut` unless the user says
  otherwise.

## Testing environment recipe (hard-won, reuse it)

- Test account credentials are in env vars `PRUN_TEST_USER` /
  `PRUN_TEST_PASS` (verified working); prefer them over the main
  account vars. Never print them.
- The remote container's headless Chromium cannot do HTTPS through
  the egress proxy (every CONNECT resets). Do NOT fight it: run a
  tiny local CORS-forwarder (Node http server on :8788 forwarding to
  https://api.prunplanner.org via `https-proxy-agent` with
  `process.env.HTTPS_PROXY`, reflecting
  `access-control-request-headers` in preflight responses and
  stripping origin/referer) and start Vite with
  `VITE_API_BASE_URL=http://localhost:8788`. Browser then only talks
  to localhost. Playwright: `playwright-core` +
  `executablePath: /opt/pw-browsers/chromium-<ver>/chrome-linux/chrome`.
- naive-ui checkboxes hide their native input — click the
  `.n-checkbox` wrapper with force, don't use `check()`.
- Good known chain for end-to-end validation: plan "Nascent"
  (QJ-149c, EXT#ALO) → plan "Raukk" (ZV-759c, SME ALO→AL). Expected
  ballpark without shipping: ALO ≈ 28 ȼ/u, AL ≈ 548 ȼ/u, base
  fraction ≈ 1.48. Shipping should raise these visibly but modestly.
