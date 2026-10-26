# market_live

**Purpose.** This folder provides a live exchange feed over **Server-Sent
Events**. Users can define **alert rules** (detectors), which are evaluated
on every tick.

**Used by.** `views/tools/MarketLiveDataView.vue` (`/market-live`). The view
calls `connect()` and `disconnect()` from its lifecycle hooks.

## Key files

| File | Role |
| --- | --- |
| `useExchangeSSE.ts` | `EventSource` on `config.API_BASE_URL` + `/data/stream/?channels=cx`. Messages are queued and processed together every 16 ms (one frame), in arrival order, so the table data recomputes once per frame. A timer, not `requestAnimationFrame`, which pauses in a hidden tab while alerts must go on. It validates each message with `SSECXSchema` (`schemas/cxSSE.schemas.ts`, which also derives `SSECX`), turns it into a `CXDataPoint` (with deltas vs the previous tick), keeps `cxPointMap`, an event log (max 500) and message history (max 25), and runs detectors |
| `cxDetectors.ts` | `processUserDetectors(...)` evaluates `DetectorConfig` rule groups against old/new points. A comparison target is `static`, `previous` or `previous_pct` |
| `cxDetectors.types.ts`, `cxExchange.types.ts` | Detector, rule and event types, and `CXDataPoint` (frontend-only; builds on `SSECX` via `Pick`) |
| `fieldConfigs.ts` | Which `CXDataPoint` fields rules can target, with labels and formats |
| `components/AlertManager.vue`, `RuleGroup.vue`, `DetectorRow.vue`, `TargetEditor.vue` | Rule editor |
| `components/AlertFeed.vue`, `AlertFeedDetail.vue`, `CXPointTable.vue`, `MessageHistory.vue` | Live output |

## Data

- Alert rules live in `useAlertsStore` (`src/stores/userAlertsStore.ts`),
  which is persisted to localStorage. **They are not synced to the
  backend.** The persisted rules are not parsed with Zod, so
  `DetectorConfig` stays a plain TypeScript interface.
- The connection state, points and logs are **module-level singletons**, so
  every `useExchangeSSE()` caller shares them.

## Gotchas

- **The stream follows `VITE_API_BASE_URL`**: a local backend means a local
  stream.
- **Tests drive frames** with `vi.advanceTimersByTime(16)`, or
  `advanceTimersByTimeAsync` when renders between timers matter.
- **Disconnect on unmount.** Otherwise the `EventSource` stays open.
- **Tests must reset the shared state** between cases.

## Tests

`src/tests/features/market_live/cxDetectors.test.ts`,
`useExchangeSSE.test.ts` (plus `useExchangeSSE.bench.ts`) and
`components/*.test.ts`; the view in
`src/tests/views/tools/MarketLiveDataView.test.ts`.
