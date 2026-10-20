# market_report

**Purpose.** The public market report at `/market`: how prices and turnover
moved on the four exchanges, for anyone, logged in or not. Logged out it sits
under `HomepageHeader`, logged in in the app layout ("Market report", first
in the Market group of the navigation).

**Used by.** `views/tools/MarketReportView.vue`; the landing page's "Market
today" section (`features/homepage`) reuses its queries, maths,
`MarketMovers`, `useInView` and `prefetchMarketReport`.

## Data

- `GetMarketSummary` (`GET /data/market/summary/`, 30 min) is the only request
  at the start. It runs in setup, and hovering or focusing the nav entry
  prefetches it (`INavItem.prefetch`). The landing page's header link and CTA
  call `prefetchMarketReport()`: the route chunk and the summary. Its
  `fetchFn` stores the summary in localStorage
  (`prunplanner_market_summary`), and its `initialData` reads it
  back through Zod, so a returning visitor sees data at first paint while it
  refreshes.
- Workforce cost: `GetCXSparklines` with `metric: "vwap_7d"` and the workforce
  tickers, for UNIVERSE (the "all exchanges" headline and drivers) and each
  exchange: 5 requests, started when the section comes near.
- Exchange cards: `GetMarketExchanges` (`/data/exchanges/` without the game
  data store or IndexedDB) for the order book stats, started when near.
- No game data stores, wrappers, plan engine or `MaterialTile`: tickers use
  `MarketTickerChip` with names and categories from the summary.

## Key files

| File | Role |
| --- | --- |
| `marketReport.util.ts` | Pure maths: `marketKpis`, `marketBrief` (In short), `workforceCost` / `workforceSeries` / `workforceDrivers` (`WORKFORCE_CONSUMPTION_MAP` × price, per 100 workers a day), `marketMovers` (5 M ȼ / 50 units floor, no flat), `indexChanges` / `sectorCards` / `marketLead` (the landing section), `exchangeCards`, `bookStats`, `squarify`, `changeColor` (±12 % on the polarity tokens), formatters with sign and arrow |
| `marketReport.types.ts` | Frontend shapes |
| `useMarketReport.ts` | Starts the summary; reads its cache entry even when stale; `failed`, `retry`. `prefetchMarketReport()` for links into the page |
| `useInView.ts` | `IntersectionObserver` with a 600 px margin, once |
| `components/MarketBlock.vue` | A module's data area: skeleton at its final size (also while its async chunk loads), error with retry, or the content |
| `components/MarketInShort.vue`, `MarketKpis.vue`, `MarketIndexChart.vue` | In the route chunk; the index uses `PLineChart` (1, 4 or 8 lines) |
| `components/MarketWorkforce.vue`, `MarketTreemap.vue`, `MarketMovers.vue`, `MarketLeaders.vue`, `MarketExchangeCards.vue` | Async, loaded when their section is near |

Material names go through `formatMaterialName` (`util/text.ts`): FIO's
camelCase names (`workstationBlank`) show as words ("Workstation Blank").
`MarketMovers` takes `count` and `link` (rows link to `/market` and emit
`open`) for the landing page.

The view holds the frame: title, as-of line, every heading, caption and
toggle, and the method text render before any data. Toggles send
`market:view_change`; the index chart with data sends `perf:content_ready`
(`lib/perf/useContentReady.ts`).

## Tests

`src/tests/features/market_report/marketReport.util.test.ts`,
`src/tests/views/tools/MarketReportView.test.ts`, the schema test
`src/tests/features/api/schemas/marketSummary.schemas.test.ts` and the
fixture `src/tests/test_data/api_data_market_summary.json` (20 Oct 2026
snapshot, reshaped from the spec's prototype data).
