# market_exploration

**Purpose.** This folder shows historical exchange data (price, volume and
candlesticks) for a material on the four player exchanges.

**Used by.**
- `views/tools/MarketExplorationView.vue` (`/market-exploration`) uses
  `useMarketExplorationChart` for the candles and
  `MarketExplorationExchanges` for the "All exchanges" view (the toggle is
  kept in `sessionStorage`). Its overview table shows a 30-day sparkline
  per material from one `GetCXSparklines` request (UNIVERSE).
- The `MaterialTile` market drawer shows `MaterialDataChart` for any
  material.

## Key files

| File | Role |
| --- | --- |
| `useMarketExploration.ts` | `getMaterialExplorationData(ticker)` fetches the last 7 days for AI1, CI1, IC1 and NC1 in parallel (`GetExplorationData` query) |
| `useMarketExplorationChart.ts` | `useMarketExplorationChart(exchangeRef, materialRef)`: loads the series and derives chart data and **candlesticks** (`CandleInterval`: daily, weekly or monthly), normalised to UTC midnight with gaps filled |
| `marketExploration.schemas.ts` | Zod `ExplorationPayloadSchema` and the derived `Exploration` (kept here rather than in `features/api/schemas`) |
| `marketExploration.types.ts` | Frontend-only chart shapes: `IMaterialMarketHistory`, `CandleTuple`, `CandleInterval`, `ChartView`, `ExchangeMetric`, `ExchangeRange`, `IExchangeLines` |
| `marketExploration.util.ts` | `exchangeLines(data, metric, rangeDays)`: daily VWAP, low or high per exchange on continuous UTC days (null without trades) plus the traded volume of all exchanges |
| `components/MarketExplorationExchanges.vue` | "All exchanges" view: one `PLineChart` line per exchange from `getMaterialExplorationData` |
| `components/MaterialDataChart.vue` (+ `.types.ts`) | Compact chart used in the material drawer |

The view's chart is `ui/charts/MarketExplorationChart.vue`
(lightweight-charts). `MaterialDataChart` uses
`ui/charts/MarketHistoryChart.vue`.

## Tests

`src/tests/features/market_exploration/useMarketExploration.test.ts`,
`useMarketExplorationChart.test.ts`, `marketExploration.util.test.ts` and
`components/MarketExplorationExchanges.test.ts`.
