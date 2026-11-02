# market_exploration

**Purpose.** Historical exchange data (price, volume, candlesticks) for a
material on the four player exchanges.

**Used by.**
- `views/tools/MarketExplorationView.vue` (`/market-exploration`, optional
  `?material=<ticker>`): candles via `useMarketExplorationChart`, the "All
  exchanges" view via `MarketExplorationExchanges` (choice kept in
  `sessionStorage`).
- `material_tile/components/MaterialMarketDetails.vue` (the material drawer)
  shows `MaterialDataChart`.

## Key files

| File | Role |
| --- | --- |
| `useMarketExploration.ts` | `getMaterialExplorationData(ticker)`: daily history of AI1, CI1, IC1, NC1 in parallel (`GetExplorationData`) |
| `useMarketExplorationChart.ts` | Series and candlesticks for one exchange (`CandleInterval`: daily/weekly/monthly), normalised to UTC midnight with gaps filled |
| `marketExploration.util.ts` | `exchangeLines(data, metric, rangeDays)`: one line per exchange on continuous UTC days (null without trades) plus total traded volume; `cheapestExchange(values)` |
| `marketExploration.schemas.ts` | Zod `ExplorationPayloadSchema` / `Exploration` (lives here, not in `features/api/schemas`) |
| `marketExploration.types.ts` | Frontend-only chart types |
| `components/MarketExplorationExchanges.vue` | "All exchanges" line chart, metric and range selectable |
| `components/MaterialDataChart.vue` | Drawer chart: 30 days per exchange, "cheapest now" by latest VWAP, link to Market Exploration |

The view's candle chart is `ui/charts/MarketExplorationChart.vue`
(lightweight-charts).

## Tests

`src/tests/features/market_exploration/`,
`src/tests/ui/charts/MarketExplorationChart.test.ts`,
`src/tests/views/tools/MarketExplorationView.test.ts`.
