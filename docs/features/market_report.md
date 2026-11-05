# market_report

**Purpose.** The public market report at `/market` (index, KPIs, workforce
cost, treemap, movers, leaders, price gaps, exchange cards), logged in or
not.

**Used by.** `views/tools/MarketReportView.vue`; the landing page's
`homepage/components/HomepageMarketToday.vue` reuses its queries, maths,
`MarketMovers` and `useInView`; `HomepageHeader` and `HomepageView` call
`prefetchMarketReport()`.

## Key files

| File | Role |
| --- | --- |
| `marketReport.util.ts` | All pure maths and formatters (KPIs, brief, gaps with `GAP_MIN_*` floors, workforce cost per 100 workers a day, movers with `MOVER_MIN_*` floors, landing cards, `squarify` treemap, `changeColor`) |
| `useMarketReport.ts`, `useMarketBooks.ts` | Summary and order-book queries with `failed` and retry/load |
| `useMarketList.ts` | Ranked list: top N or pages of 25 after Show all; sort applied before the cut |
| `marketReportPrefetch.util.ts` | `prefetchMarketReport()`: route chunk plus summary |
| `useInView.ts` | One-shot `IntersectionObserver`, 600 px margin |
| `components/MarketBlock.vue` | Module data area: final-size skeleton, error with retry, or content |
| `components/*` | `MarketInShort`, `MarketKpis`, `MarketIndexChart` are in the route chunk; the other modules are async, loaded when their section comes near |

## Data

- `GetMarketSummary` (`GET /data/market/summary/`, 30 min) is the only
  request at start (also prefetched on nav hover/focus). It is mirrored in
  localStorage (`prunplanner_market_summary`) and read back through Zod as
  `initialData`, so returning visitors see data at first paint.
- Workforce: 5 `GetCXSparklines` requests (`vwap_7d`, UNIVERSE + each
  exchange) when the section comes near.
- Order books: `GetMarketExchanges` (`/data/exchanges/`, bypassing the game
  data store and IndexedDB), started once after first content
  (`requestIdleCallback`), shared by the gap tile, price gaps and exchange
  cards.

## Gotchas

- No game data stores, wrappers, plan engine or `MaterialTile` here:
  tickers use `MarketTickerChip` with names and categories from the
  summary; names go through `formatMaterialName` (FIO names are camelCase).
- The view renders the frame (headings, captions, toggles) before any data;
  keep new modules inside `MarketBlock`.

## Tests

`src/tests/features/market_report/`,
`src/tests/views/tools/MarketReportView.test.ts`,
`src/tests/features/api/schemas/marketSummary.schemas.test.ts`; fixtures
`src/tests/test_data/api_data_market_summary.json`, `market_gaps_*.json`.
