Market Exploration shows the price history and the current market of one material on all four exchanges. Use it to judge whether a price is normal, rising or falling before you plan around it or trade.

## Price history {#history}

The game shows only the last 365 days of price history. PRUNplanner keeps every day it has stored, back to July 2023.

The history is built from the daily price data [[fio|FIO]] delivers. A day FIO delivered nothing for is missing, and PRUNplanner doesn't correct any day's prices. A single trade at an extreme price therefore shows as it happened, for example as a long wick on one candle.

## Choosing a material {#material}

**Switch Material** picks the material; it starts on DW. Links from a material's market card open the page on that material. **Explore** in the [overview table](#overview) does the same.

## Key figures {#kpis}

The tiles at the top describe the material across all four exchanges ([[universe|Universe]]):

| Tile | What it shows |
| --- | --- |
| **Universe VWAP 7D** | the [[vwap\|VWAP]] of the last 7 days in ȼ; under it **% Trend** = (VWAP 7D − VWAP 30D) ÷ VWAP 30D |
| **Universe Traded Volume 7D** | units traded in the last 7 days; under it the 30-day units |
| **Universe Market Delta** | supply − demand: units in all sell orders minus units in all buy orders of the four books. **Shortage** when negative, **Surplus** when positive; **Supply:** and **Demand:** below |
| **Weighted Trend** (**Volume-Adjusted Delta**) | each exchange's % Trend, weighted by its share of the 7-day traded units |
| **Price Cohesion** (**Variance Index**) | how far apart the four exchanges' VWAP 7D are: standard deviation ÷ mean, in % |

A low Price Cohesion means the exchanges trade at nearly the same price; a high one means there are gaps between them. An exchange without trades counts in it with a price of 0.

Weighted Trend shows "—" when any of the four exchanges had no trades in the last 30 days, because that exchange's trend can't be calculated.

## Market Chart {#chart}

**Chart view** switches between two charts. The page remembers your choice until you close the browser tab.

### Candles {#candles}

One exchange as a candlestick chart (open, high, low, close per period), with the traded units as bars below.

- **Exchange**: AI1 (default), CI1, IC1 or NC1.
- **Interval**: **Daily**, **Weekly** (weeks start on Monday) or **Monthly**, in UTC.

A day without data is drawn as a flat candle at the last close with 0 volume, so a gap looks like a quiet day.

### All exchanges {#all-exchanges}

One line per exchange, so you can compare them directly, plus **Traded volume, all exchanges** (units / day) below.

- **Value**: **VWAP** (ȼ traded ÷ units traded that day), **Low** or **High**.
- **Range**: **30 d**, **90 d** (default), **1 y** or **All**.

A day without trades on an exchange is a gap in its line. With no trades at all in the range, the chart says **No trades in this range**.

The button at the top right of the chart (**Toggle fullscreen**) gives the chart the full width.

## Market Data {#market-data}

**Market Data** is the per-exchange table of the material's market card, with the views **Prices**, **Order books** and **Volume**. See [Exchanges & prices](/help/exchanges) for what its columns mean.

## Material Market Overview {#overview}

**Material Market Overview** lists every material, sorted by ticker. Click a header to sort by it (all columns except **30 days** and **Details**).

| Column | What it shows |
| --- | --- |
| **Material** | the material |
| **VWAP 7D**, **VWAP 30D** | Universe VWAP of the last 7 and 30 days |
| **30 days** | the daily Universe VWAP of the last 30 days. Direction only: every row has its own scale |
| **Trend** | the Weighted Trend (see [Key figures](#kpis)) |
| **Traded Volume 7D**, **Traded Volume 30D** | Universe units traded |
| **Details** | **Explore** loads the material into the page |

> [!tip]
> Sort by **Trend** to find the materials whose price is moving most this week, then press **Explore** to see whether it is a blip or a longer move. For the whole market at a glance, see the [Market report](/help/tools_market_report).

## Reading candlestick charts {#candlesticks}

A candle covers one period. Its body runs from the open to the close price; the thin lines (wicks) reach the period's high and low. A close above the open is a rising candle, below it a falling one. The bars under the chart show how many units traded, so you can tell a move on real volume from one on a single trade.
