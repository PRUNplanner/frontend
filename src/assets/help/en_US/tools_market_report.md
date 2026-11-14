The [Market report](/market) shows how prices and turnover moved on the four commodity exchanges over the last 90 days. Start here for the big picture, then dig into one material in [Market Exploration](/help/tools_market_exploration) or check your plan's prices. The report is public, so you don't need to log in.

## Data and updates {#data}

Daily prices come from the daily trading data [[fio|FIO]] delivers for AI1, CI1, IC1 and NC1. The report covers the 90 complete UTC days up to yesterday. It updates daily (UTC) from the previous day's trading, so today's trading only shows up once the day is over. The header gives the last day as "Daily prices to" a date.

The order books are current. The biggest open gap, the "Order books now" gaps and the book figures on the exchange cards all use the latest books PRUNplanner has, refreshed about every 30 minutes.

Money is in ȼ. Each exchange has its own [[currency]] (AIC, CIS, ICA, NCC), and the report adds them up at par, one to one.

## In short {#in-short}

Four tiles sit at the top:

| Tile | What it shows |
| --- | --- |
| **CX index** | the latest combined [price index](#price-index), its change since the first of the 90 days, and a 90-day sparkline |
| **Moved most** | the sector whose index rose most since the first of the 90 days (when every sector fell, the one that fell least), with its change |
| **Feeding 100 pioneers** | what 100 pioneers consume per day at the latest VWAP 7D on all exchanges, and how that changed over the last two weeks |
| **Biggest open gap right now** | the largest [price gap](#price-gaps) in the order books now: buy on one exchange, sell on another |

The pioneer basket holds every pioneer need, [[luxuries]] included. If no material has an open gap of 15 % or more, the last tile tells you so.

## Key figures {#kpis}

| Figure | What it shows |
| --- | --- |
| **Traded, last 7 days** | turnover of the four exchanges in the last 7 days, and its change against the 7 days before |
| **Materials traded, 7 days** | how many materials traded in the last 7 days, out of those traded in 30 days |
| **CX index** | the combined price index, and its change since the first of the 90 days |
| **Turnover in flat materials** | the share of 30-day turnover in [flat](#flat) materials, and how many there are |

Turnover is units traded × price, so it's a figure in ȼ.

## Price index {#price-index}

**Price index** tracks how the price of what players trade has moved. It's one line that starts at 100 on the first of the 90 days, and each day's value uses that day's [[vwap|VWAP]] 7D.

Under **Index view** you pick the lines:

- **Per exchange** (default): one line per exchange, each in its own currency.
- **Combined**: one line for all four exchanges.
- **Per sector**: one line per sector, all exchanges together. There are eight sectors, Consumables through Drones & other.

Every material with a VWAP 7D on each of the 90 days in that scope is a member of the index. A member's weight is its share of 30-day turnover, capped at 5 % (20 % inside a sector). Whatever the cap cuts off a material gets spread over the others, so no single busy material carries the index. The footnote under the chart names the base date and the members. For **Combined** it also gives the members' share of 30-day turnover.

## What it costs to keep a workforce {#workforce}

This section prices the consumables 100 workers of a tier need for one day, all needs including both luxuries, at each day's VWAP 7D. Every base pays this, whatever it produces.

- There's one card per [[workforce]] tier, pioneer to scientist. It shows the cost per 100 workers a day on all exchanges, and its change over 90 days.
- Pick a tier to see its chart, with one line per exchange over 90 days.
- "Cheapest today" names the exchange where that tier's basket costs least at the latest prices.
- **Moved most** names the two materials that changed the tier's cost most, in ȼ, over the 90 days.

If a material in the basket has no price on a day, the chart has no value for that day.

## Where the money moves {#treemap}

**Where the money moves** is a treemap. Each box is a material, sized by its 30-day turnover on all four exchanges and grouped by sector. The colour compares VWAP 7D with VWAP 30D: green when it's rising, red when it's falling, deepest at ±12 % and beyond. [Flat](#flat) materials are hatched and marked **flat** ("Held at one price, likely a market maker").

Hover a box to see **Turnover, 30 days**, **VWAP 7D**, **VWAP 30D** and **7D against 30D**. When there's no change to show, it says **too few trades**.

## Movers this week {#movers}

**Movers this week** lists the materials whose VWAP 7D sits furthest above (**Rising**) or below (**Falling**) their VWAP 30D, on all exchanges.

Only materials with at least 5,000,000 ȼ and 50 units traded in the last 7 days count, and flat materials are left out. The top 8 show first, each with a 15-day sparkline of its VWAP 7D. "Show all" opens the full list in pages of 25, and you can **Sort by** **Change vs 30 days**, **Material**, **VWAP 7D** or **Traded, 7 days**.

The 30 days include the last 7, so a change looks smaller than it would in a week-on-week comparison.

## What the economy runs on {#leaders}

**What the economy runs on** lists the 10 materials with the most 30-day turnover, with their share of it. Each bar splits that material's last 7 days of turnover by exchange. "Show all" lists every material traded in 30 days.

## Price gaps between exchanges {#price-gaps}

**Price gaps between exchanges** lists materials that trade notably cheaper on one exchange than on another. You choose the **Gap basis**:

- **Last 7 days** (default) compares each exchange's VWAP 7D. A gap here may already be gone. **Books now** tells you whether you could still buy on one exchange and sell on the other ("Open" with the gap, or **Closed**).
- **Order books now** compares the best ask on the cheaper exchange with the best bid on the dearer one, right now.

A material only counts when both exchanges had at least 20 units and 5,000,000 ȼ traded in the last 7 days, the gap is at least 15 %, and it isn't [flat](#flat).

The top 10 show first, largest gap first. Only the top price counts, not how much is on offer, and the gap ignores shipping, fuel and flight time.

> [!tip]
> A gap in the books is only a chance if there's enough on offer and you can move the goods in time. Check the material's order books in [Market Exploration](/help/tools_market_exploration) before you act.

## The four exchanges {#exchanges}

**The four exchanges** has one card per exchange: Antares Station (AI1, AIC), Benten Station (CI1, CIS), Hortus Station (IC1, ICA) and Moria Station (NC1, NCC). Each card shows:

| Figure | What it shows |
| --- | --- |
| **Turnover, 30 days** | the exchange's turnover, and its share of all four |
| bars | daily turnover over 90 days |
| **Turnover, 7 days** | the last 7 days' turnover |
| **Materials traded, 7 days** | materials with turnover on this exchange in the last 7 days |
| **Median bid–ask spread** | the median of (ask − bid) ÷ the midpoint of bid and ask, over the books with both |
| **Books without a buyer** | order books with no bid now |
| **Books without a seller** | order books with no ask now |

The spread here is measured against the midpoint. Market Live and the material card measure it against the ask, so the same book shows a slightly larger number here.

## Flat materials {#flat}

A material is *flat* when, over the last 30 days, it traded on at least 10 days and its daily VWAP stayed within ±0.3 % of its 30-day median on at least 80 % of those days. That usually means [[market-maker|market makers]] buy or sell it at fixed prices. Flat materials count in turnover, but they're left out of the movers and the price gaps.

## How these numbers are made {#how-made}

The collapsible **How these numbers are made** at the bottom of the page explains, in short form, the source, turnover, prices, the index, movers, gaps, flat materials and what's left out.

One heavy day shows for a week. A single large trade at an unusual price pulls the VWAP 7D for as long as it sits in the 7-day window, and then the price snaps back.

## What CX data can't see {#not-included}

The report covers the exchanges, not the whole economy:

- Local markets on planets and stations, contracts and trades inside corporations never touch the exchanges, so they're missing. Players say some everyday goods move mostly on local markets.
- Trades with market makers count like any other trade.
- Orders that aren't filled don't count, and the data doesn't say which side started a trade.
- The order-book figures use only the top price, not the depth behind it.

[What CX volume misses](/help/plan_check#cx-volume) explains what this means for your plan's prices.
