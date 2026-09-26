# market_exploration

**Purpose.** This folder shows historical exchange data (price, volume and
candlesticks) for a material on the four player exchanges.

**Used by.**
- `views/tools/MarketExplorationView.vue` (`/market-exploration`) uses
  `useMarketExplorationChart`.
- The `MaterialTile` market drawer shows `MaterialDataChart` for any
  material.

## Key files

| File | Role |
| --- | --- |
| `useMarketExploration.ts` | `getMaterialExplorationData(ticker)` fetches the last 7 days for AI1, CI1, IC1 and NC1 in parallel (`GetExplorationData` query) |
| `useMarketExplorationChart.ts` | `useMarketExplorationChart(exchangeRef, materialRef)`: loads the series and derives chart data and **candlesticks** (`CandleInterval`: daily, weekly or monthly), normalised to UTC midnight with gaps filled |
| `marketExploration.schemas.ts` | Zod `ExplorationPayloadSchema` (kept here rather than in `features/api/schemas`) |
| `marketExploration.types.d.ts` | `IExploration`, `IMaterialExplorationRecord`, `CandleInterval` |
| `components/MaterialDataChart.vue` (+ `.types.ts`) | Compact chart used in the material drawer |

The view's chart is `ui/charts/MarketExplorationChart.vue`
(lightweight-charts). `MaterialDataChart` uses
`ui/charts/MarketHistoryChart.vue`.

## Tests

`src/tests/features/market_exploration/useMarketExploration.test.ts` and
`useMarketExplorationChart.test.ts`.
