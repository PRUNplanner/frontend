# market_live

**Purpose.** Live exchange feed over **Server-Sent Events** with user-defined
alert rules (detectors) evaluated on every tick.

**Used by.** `views/tools/MarketLiveDataView.vue` (`/market-live`), which
calls `connect()` on mount and `disconnect()` on unmount.

## Key files

| File | Role |
| --- | --- |
| `useExchangeSSE.ts` | `EventSource` on `${API_BASE_URL}/data/stream/?channels=cx`. Messages are queued and processed together every 16 ms in arrival order (a timer, not `requestAnimationFrame`, which pauses in hidden tabs while alerts must go on). Validates with `SSECXSchema`, builds `CXDataPoint`s with deltas vs the previous tick, keeps `cxPointMap`, an event log (max 500) and message history (max 25), runs detectors |
| `schemas/cxSSE.schemas.ts` | Zod schema of a stream message (`SSECX`) |
| `cxDetectors.ts` / `.types.ts` | `processUserDetectors(...)`: rule groups (AND/OR) against old/new points; a comparison target is `static`, `previous` or `previous_pct` |
| `cxExchange.types.ts` | `CXDataPoint` (frontend-only, `Pick`s from `SSECX`) |
| `fieldConfigs.ts` | Which `CXDataPoint` fields rules can target, with labels and formats |
| `components/AlertManager.vue`, `RuleGroup.vue`, `DetectorRow.vue`, `TargetEditor.vue` | Rule editor |
| `components/AlertFeed.vue`, `AlertFeedDetail.vue`, `CXPointTable.vue`, `MessageHistory.vue` | Live output |

## Gotchas

- Alert rules live in `useAlertsStore` (`stores/userAlertsStore.ts`),
  persisted to localStorage only, **not synced to the backend**, and not
  Zod-parsed (`DetectorConfig` is a plain interface).
- Connection flags, points and logs are **module-level**, shared by every
  `useExchangeSSE()` caller; the `EventSource` itself is per call, so call
  `disconnect()` on the same instance on unmount or it stays open.
- The stream follows `VITE_API_BASE_URL`: a local backend means a local
  stream.
- Tests drive frames with `vi.advanceTimersByTime(16)` (or the async
  variant when renders between timers matter) and must reset the shared
  state between cases.

## Tests

`src/tests/features/market_live/` (plus `useExchangeSSE.bench.ts`),
`src/tests/views/tools/MarketLiveDataView.test.ts`.
