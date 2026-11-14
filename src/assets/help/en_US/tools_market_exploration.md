Before you plan around a price or trade on it, check Market Exploration to see whether that price is normal, rising or falling. It shows the price history and the current market of one material on all four exchanges.

## Price history {#history}

The game only shows the last 365 days of price history. PRUNplanner keeps every day it has stored, back to July 2023.

PRUNplanner builds the history from the daily price data [[fio|FIO]] delivers. A day FIO delivered nothing for is missing, and PRUNplanner doesn't correct any day's prices. So a single trade at an extreme price shows as it happened, for example as a long wick on one candle.

## Choosing a material {#material}

**Switch Material** picks the material, and it starts on DW. Links from a material's market card open the page on that material, and so does **Explore** in the [overview table](#overview).

## Key figures {#kpis}

The tiles at the top describe the material across all four exchanges ([[universe|Universe]]):

| Tile | What it shows |
| --- | --- |
| **Universe VWAP 7D** | the [[vwap\|VWAP]] of the last 7 days in ȼ. Under it, **% Trend** = (VWAP 7D − VWAP 30D) ÷ VWAP 30D |
| **Universe Traded Volume 7D** | units traded in the last 7 days, with the 30-day units under it |
| **Universe Market Delta** | supply − demand: units in all sell orders minus units in all buy orders of the four books. It reads **Shortage** when negative and **Surplus** when positive, with **Supply:** and **Demand:** below |
| **Weighted Trend** (**Volume-Adjusted Delta**) | each exchange's % Trend, weighted by its share of the 7-day traded units |
| **Price Cohesion** (**Variance Index**) | how far apart the four exchanges' VWAP 7D are: standard deviation ÷ mean, in % |

A low Price Cohesion means the exchanges trade at nearly the same price, and a high one means there are gaps between them. An exchange without trades counts in it with a price of 0.

Weighted Trend shows "—" when any of the four exchanges had no trades in the last 30 days, because PRUNplanner can't calculate that exchange's trend.

## Market Chart {#chart}

**Chart view** switches between two charts. The page remembers your choice until you close the browser tab.

### Candles {#candles}

Here you see one exchange as a candlestick chart (open, high, low, close per period), with the traded units as bars below.

- **Exchange**: AI1 (default), CI1, IC1 or NC1.
- **Interval**: **Daily**, **Weekly** (weeks start on Monday) or **Monthly**, in UTC.

A day without data shows as a flat candle at the last close with 0 volume, so a gap looks like a quiet day.

### All exchanges {#all-exchanges}

Each exchange gets its own line so you can compare them directly, with **Traded volume, all exchanges** (units / day) below.

- **Value**: **VWAP** (ȼ traded ÷ units traded that day), **Low** or **High**.
- **Range**: **30 d**, **90 d** (default), **1 y** or **All**.

The range ends on the last day with trades on any exchange. A day without trades on an exchange leaves a gap in its line. If the material has no trades at all, the chart says **No trades in this range**.

The button at the top right of the chart (**Toggle fullscreen**) gives the chart the full width.

## Market Data {#market-data}

**Market Data** is the per-exchange table from the material's market card, with the views **Prices**, **Order books** and **Volume**. [Exchanges & prices](/help/exchanges) explains what its columns mean.

## Material Market Overview {#overview}

**Material Market Overview** lists every material, sorted by ticker. Click a header to sort by it. That works on every column except **30 days** and **Details**.

| Column | What it shows |
| --- | --- |
| **Material** | the material |
| **VWAP 7D**, **VWAP 30D** | Universe VWAP of the last 7 and 30 days |
| **30 days** | the daily Universe VWAP of the last 30 days. It shows direction only, since every row has its own scale |
| **Trend** | the Weighted Trend (see [Key figures](#kpis)) |
| **Traded Volume 7D**, **Traded Volume 30D** | Universe units traded |
| **Details** | **Explore** loads the material into the page |

> [!tip]
> Sort by **Trend** to find the materials whose price is moving most this week, then press **Explore** to see whether it's a blip or a longer move. For the whole market at a glance, see the [Market report](/help/tools_market_report).

## Reading candlestick charts {#candlesticks}

A candle covers one period. Its body runs from the open to the close price, and the thin lines (wicks) reach the period's high and low. A close above the open makes a rising candle, and a close below it a falling one. The bars under the chart show how many units traded, so you can tell a move on real volume from one on a single trade.
