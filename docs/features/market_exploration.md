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
  material: one line per exchange over 30 days (VWAP, low, high or traded
  units), the cheapest exchange by latest VWAP and a link to
  `/market-exploration?material=<ticker>`, which preselects a known ticker.

## Key files

| File | Role |
| --- | --- |
| `useMarketExploration.ts` | `getMaterialExplorationData(ticker)` fetches the daily history of AI1, CI1, IC1 and NC1 in parallel (`GetExplorationData` query) |
| `useMarketExplorationChart.ts` | `useMarketExplorationChart(exchangeRef, materialRef)`: loads the series and derives chart data and **candlesticks** (`CandleInterval`: daily, weekly or monthly), normalised to UTC midnight with gaps filled |
| `marketExploration.schemas.ts` | Zod `ExplorationPayloadSchema` and the derived `Exploration` (kept here rather than in `features/api/schemas`) |
| `marketExploration.types.ts` | Frontend-only chart shapes: `CandleTuple`, `CandleInterval`, `ChartView`, `ExchangeMetric`, `ExchangeRange`, `IExchangeLines` |
| `marketExploration.util.ts` | `exchangeLines(data, metric, rangeDays)`: daily VWAP, low, high or traded units per exchange on continuous UTC days (null without trades) plus the traded volume of all exchanges; `cheapestExchange(values)`: the exchange with the lowest latest value |
| `components/MarketExplorationExchanges.vue` | "All exchanges" view: one `PLineChart` line per exchange from `getMaterialExplorationData` |
| `components/MaterialDataChart.vue` | Material drawer chart (in `MaterialMarketDetails`): one `PLineChart` line per exchange over 30 days, "Cheapest now" footer and a Market Exploration link |

The view's chart is `ui/charts/MarketExplorationChart.vue`
(lightweight-charts).

## Tests

`src/tests/features/market_exploration/useMarketExploration.test.ts`,
`useMarketExplorationChart.test.ts`, `marketExploration.util.test.ts`,
`components/MarketExplorationExchanges.test.ts` and
`components/MaterialDataChart.test.ts`; the chart in
`src/tests/ui/charts/MarketExplorationChart.test.ts`, the view in
`src/tests/views/tools/MarketExplorationView.test.ts`.
