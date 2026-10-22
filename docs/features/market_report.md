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
- Order books: `GetMarketExchanges` (`/data/exchanges/` without the game
  data store or IndexedDB), read through `useMarketBooks`. The view starts
  it once after first content (`requestIdleCallback`); In short's gap tile,
  the price gaps and the exchange cards' book stats share it.
- No game data stores, wrappers, plan engine or `MaterialTile`: tickers use
  `MarketTickerChip` with names and categories from the summary.

## Key files

| File | Role |
| --- | --- |
| `marketReport.util.ts` | Pure maths: `marketKpis`, `marketBrief` (In short, with the pioneer cost's 15 days from the summary sparks), `exchangeGaps` (price gaps by VWAP 7D or the books, `GAP_MIN_*` floors), `workforceCost` / `workforceSeries` / `workforceDrivers` (`WORKFORCE_CONSUMPTION_MAP` × price, per 100 workers a day), `marketMovers` (5 M ȼ / 50 units floor, no flat), `indexChanges` / `sectorCards` / `marketLead` (the landing section), `exchangeCards`, `bookStats`, `squarify`, `changeColor` (±12 % on the polarity tokens), formatters with sign and arrow |
| `marketReport.types.ts` | Frontend shapes |
| `useMarketReport.ts` | Starts the summary; reads its cache entry even when stale; `failed`, `retry` |
| `useMarketBooks.ts` | The order books' cache entry, `failed`, `load` |
| `useMarketList.ts` | A ranked list's top N or, after Show all, pages of 25; owns its sort (applied before the cut) and resets it with the list's view |
| `marketReportPrefetch.util.ts` | `prefetchMarketReport()` for links into the page (the landing header), loads the query layer only when called |
| `useInView.ts` | `IntersectionObserver` with a 600 px margin, once |
| `components/MarketBlock.vue` | A module's data area: skeleton at its final size (also while its async chunk loads), error with retry, or the content |
| `components/MarketInShort.vue`, `MarketKpis.vue`, `MarketIndexChart.vue` | In the route chunk; In short is four tiles, the index uses `PLineChart` (1, 4 or 8 lines) |
| `components/MarketWorkforce.vue`, `MarketTreemap.vue`, `MarketMoversTable.vue`, `MarketLeaders.vue`, `MarketGaps.vue`, `MarketExchangeCards.vue` | Async, loaded when their section is near; the workforce shows five tier cards (`v-model:tier`) beside the big chart |
| `components/MarketShowAll.vue` | Below a list: Show all / Show top and the pager |

Material names go through `formatMaterialName` (`util/text.ts`): FIO's
camelCase names (`workstationBlank`) show as words ("Workstation Blank").
`MarketMovers` (the landing page's compact list) takes `count` and `link`
(rows link to `/market` and emit `open`).

Running text and captions show dates with the year (`formatDate`, "Jul 24,
2026"); chart axes keep their short days (`PLineChart`).

The price gaps (section and In short's fourth tile) are hidden until their
floors are tuned: `?debug=gaps` shows them (`marketGapsDebug` in
`lib/debugMode.ts`), `?debug=off` hides them again.

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
